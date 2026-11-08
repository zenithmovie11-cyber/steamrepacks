CREATE TABLE public.ip_security_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network cidr NOT NULL,
  kind text NOT NULL CHECK (kind IN ('block','allow')),
  reason text NOT NULL DEFAULT 'Manual' CHECK (char_length(reason) <= 120),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, kind)
);
GRANT SELECT ON public.ip_security_rules TO authenticated;
GRANT ALL ON public.ip_security_rules TO service_role;
ALTER TABLE public.ip_security_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security managers read rules" ON public.ip_security_rules FOR SELECT TO authenticated USING (public.has_permission('roles.manage'));

CREATE TABLE public.ip_security_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  requests_per_minute integer NOT NULL DEFAULT 60 CHECK (requests_per_minute BETWEEN 10 AND 1000),
  block_minutes integer NOT NULL DEFAULT 5 CHECK (block_minutes BETWEEN 1 AND 1440),
  rate_limit_enabled boolean NOT NULL DEFAULT false,
  block_bot_signals boolean NOT NULL DEFAULT false
);
INSERT INTO public.ip_security_settings (id) VALUES (1);
GRANT SELECT ON public.ip_security_settings TO authenticated;
GRANT ALL ON public.ip_security_settings TO service_role;
ALTER TABLE public.ip_security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security managers read settings" ON public.ip_security_settings FOR SELECT TO authenticated USING (public.has_permission('roles.manage'));

CREATE TABLE public.ip_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet NOT NULL,
  path text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('allowed','blocked','rate_limited','bot_blocked')),
  country text NOT NULL DEFAULT 'Unknown',
  asn text,
  bot_signal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ip_security_events_created_idx ON public.ip_security_events (created_at DESC);
CREATE INDEX ip_security_events_ip_idx ON public.ip_security_events (ip, created_at DESC);
GRANT SELECT ON public.ip_security_events TO authenticated;
GRANT ALL ON public.ip_security_events TO service_role;
ALTER TABLE public.ip_security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security managers read events" ON public.ip_security_events FOR SELECT TO authenticated USING (public.has_permission('roles.manage'));

CREATE TABLE public.ip_security_counters (
  ip inet PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  requests integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_logged timestamptz
);
GRANT ALL ON public.ip_security_counters TO service_role;
ALTER TABLE public.ip_security_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.manage_ip_security_rule(p_id uuid, p_network text, p_kind text, p_reason text, p_expires_at timestamptz, p_delete boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_net cidr;
BEGIN
  IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_delete THEN
    DELETE FROM ip_security_rules WHERE id = p_id RETURNING id, network::text INTO v_id, p_network;
    INSERT INTO security_audit_logs(actor_id, actor_email, action, target) VALUES (auth.uid(), lower(auth.jwt()->>'email'), 'ip.rule_removed', coalesce(p_network,''));
    RETURN v_id;
  END IF;
  IF p_kind NOT IN ('block','allow') THEN RAISE EXCEPTION 'Invalid rule type'; END IF;
  v_net := p_network::cidr;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN RAISE EXCEPTION 'Expiry must be in the future'; END IF;
  INSERT INTO ip_security_rules(network, kind, reason, expires_at) VALUES (v_net, p_kind, left(coalesce(nullif(trim(p_reason),''),'Manual'),120), p_expires_at)
  ON CONFLICT (network, kind) DO UPDATE SET reason = excluded.reason, expires_at = excluded.expires_at
  RETURNING id INTO v_id;
  INSERT INTO security_audit_logs(actor_id, actor_email, action, target, details) VALUES (auth.uid(), lower(auth.jwt()->>'email'), 'ip.' || p_kind || '_added', v_net::text, jsonb_build_object('role', p_reason));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.save_ip_security_settings(p_rpm integer, p_block_minutes integer, p_rate_limit boolean, p_block_bots boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE ip_security_settings SET requests_per_minute = p_rpm, block_minutes = p_block_minutes, rate_limit_enabled = p_rate_limit, block_bot_signals = p_block_bots WHERE id = 1;
  INSERT INTO security_audit_logs(actor_id, actor_email, action, target, details) VALUES (auth.uid(), lower(auth.jwt()->>'email'), 'ip.settings_saved', 'firewall', jsonb_build_object('rpm', p_rpm, 'rate_limit', p_rate_limit, 'block_bots', p_block_bots));
END $$;

CREATE OR REPLACE FUNCTION public.ip_security_overview(p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN jsonb_build_object(
    'rules', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'network', network::text, 'kind', kind, 'reason', reason, 'expires_at', expires_at, 'created_at', created_at) ORDER BY created_at DESC) FROM ip_security_rules), '[]'::jsonb),
    'settings', (SELECT to_jsonb(s) FROM ip_security_settings s WHERE id = 1),
    'stats', jsonb_build_object(
      'requests_24h', (SELECT count(*) FROM ip_security_events WHERE created_at > now() - interval '24 hours'),
      'blocked_24h', (SELECT count(*) FROM ip_security_events WHERE created_at > now() - interval '24 hours' AND decision <> 'allowed'),
      'unique_ips_24h', (SELECT count(DISTINCT ip) FROM ip_security_events WHERE created_at > now() - interval '24 hours'),
      'bots_24h', (SELECT count(*) FROM ip_security_events WHERE created_at > now() - interval '24 hours' AND bot_signal IS NOT NULL)),
    'total', (SELECT count(*) FROM ip_security_events),
    'events', coalesce((SELECT jsonb_agg(e ORDER BY e.created_at DESC) FROM (SELECT id, host(ip) AS ip, path, decision, country, asn, bot_signal, created_at FROM ip_security_events ORDER BY created_at DESC OFFSET greatest(p_offset,0) LIMIT 25) e), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.enforce_ip_security(p_ip text, p_path text, p_country text, p_asn text, p_bot_signal text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ip inet := p_ip::inet; s ip_security_settings; c ip_security_counters; v_decision text := 'allowed'; v_allowed boolean;
BEGIN
  SELECT * INTO s FROM ip_security_settings WHERE id = 1;
  v_allowed := EXISTS (SELECT 1 FROM ip_security_rules WHERE kind = 'allow' AND v_ip <<= network AND (expires_at IS NULL OR expires_at > now()));
  IF NOT v_allowed THEN
    IF EXISTS (SELECT 1 FROM ip_security_rules WHERE kind = 'block' AND v_ip <<= network AND (expires_at IS NULL OR expires_at > now())) THEN
      v_decision := 'blocked';
    ELSIF s.block_bot_signals AND p_bot_signal LIKE 'bad:%' THEN
      v_decision := 'bot_blocked';
    END IF;
  END IF;
  INSERT INTO ip_security_counters(ip, window_start, requests) VALUES (v_ip, now(), 1)
  ON CONFLICT (ip) DO UPDATE SET
    requests = CASE WHEN ip_security_counters.window_start < now() - interval '1 minute' THEN 1 ELSE ip_security_counters.requests + 1 END,
    window_start = CASE WHEN ip_security_counters.window_start < now() - interval '1 minute' THEN now() ELSE ip_security_counters.window_start END
  RETURNING * INTO c;
  IF v_decision = 'allowed' AND NOT v_allowed AND s.rate_limit_enabled THEN
    IF c.blocked_until IS NOT NULL AND c.blocked_until > now() THEN v_decision := 'rate_limited';
    ELSIF c.requests > s.requests_per_minute THEN
      UPDATE ip_security_counters SET blocked_until = now() + make_interval(mins => s.block_minutes) WHERE ip = v_ip;
      v_decision := 'rate_limited';
    END IF;
  END IF;
  IF v_decision <> 'allowed' OR c.last_logged IS NULL OR c.last_logged < now() - interval '1 minute' THEN
    INSERT INTO ip_security_events(ip, path, decision, country, asn, bot_signal) VALUES (v_ip, left(coalesce(p_path,'/'),200), v_decision, left(coalesce(p_country,'Unknown'),60), left(p_asn,120), left(p_bot_signal,60));
    UPDATE ip_security_counters SET last_logged = now() WHERE ip = v_ip;
  END IF;
  DELETE FROM ip_security_events WHERE created_at < now() - interval '30 days' AND random() < 0.01;
  RETURN v_decision;
END $$;

REVOKE ALL ON FUNCTION public.enforce_ip_security(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_ip_security(text,text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.manage_ip_security_rule(uuid,text,text,text,timestamptz,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_ip_security_rule(uuid,text,text,text,timestamptz,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.save_ip_security_settings(integer,integer,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_ip_security_settings(integer,integer,boolean,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.ip_security_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ip_security_overview(integer) TO authenticated;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  post_ids uuid[] NOT NULL CHECK (cardinality(post_ids) BETWEEN 1 AND 50),
  total numeric NOT NULL DEFAULT 0,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (phone ~ '^01[3-9][0-9]{8}$'),
  email text NOT NULL CHECK (length(email) <= 200 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  bkash_number text NOT NULL CHECK (bkash_number ~ '^01[3-9][0-9]{8}$'),
  address text NOT NULL CHECK (length(address) BETWEEN 3 AND 300),
  city text NOT NULL CHECK (length(city) BETWEEN 2 AND 80),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Create own pending order" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND payment_ref IS NULL);
CREATE POLICY "Read own orders or manage" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission('posts.edit'));

REVOKE SELECT ON public.posts FROM anon, authenticated;
GRANT SELECT (id, title, description, category, cover_url, file_url, file_name, created_at, updated_at, device_support, is_paid, price) ON public.posts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.post_play_urls()
RETURNS TABLE(id uuid, play_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.play_url FROM public.posts p
  WHERE p.play_url IS NOT NULL AND (
    NOT p.is_paid
    OR public.has_permission('posts.edit')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = auth.uid() AND o.status = 'paid' AND p.id = ANY(o.post_ids))
  );
$$;
REVOKE ALL ON FUNCTION public.post_play_urls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_play_urls() TO anon, authenticated;

CREATE TABLE public.special_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  badge_text text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  post_ids uuid[] NOT NULL DEFAULT '{}',
  banner_text text NOT NULL DEFAULT '',
  show_banner boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'percentage' OR discount_value <= 100)
);
GRANT SELECT ON public.special_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_offers TO authenticated;
GRANT ALL ON public.special_offers TO service_role;
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read live offers" ON public.special_offers FOR SELECT TO anon, authenticated USING (is_active OR public.has_permission('posts.edit'));
CREATE POLICY "editors insert offers" ON public.special_offers FOR INSERT TO authenticated WITH CHECK (public.has_permission('posts.edit'));
CREATE POLICY "editors update offers" ON public.special_offers FOR UPDATE TO authenticated USING (public.has_permission('posts.edit')) WITH CHECK (public.has_permission('posts.edit'));
CREATE POLICY "editors delete offers" ON public.special_offers FOR DELETE TO authenticated USING (public.has_permission('posts.edit'));

CREATE TABLE public.bottom_cta_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 headline text NOT NULL DEFAULT 'Ready to Level Up Your Gaming Experience?',
 subtitle text NOT NULL DEFAULT 'আপনার পছন্দের প্রিমিয়াম গেম আজই আনলক করুন',
 primary_button_text text NOT NULL DEFAULT 'Browse Special Offers',
 primary_button_link text NOT NULL DEFAULT '#special-offers',
 secondary_enabled boolean NOT NULL DEFAULT true,
 secondary_button_text text NOT NULL DEFAULT 'View Paid Games',
 secondary_button_link text NOT NULL DEFAULT '#paid-games',
 background_image_url text NOT NULL DEFAULT '',
 is_visible boolean NOT NULL DEFAULT true,
 alignment text NOT NULL DEFAULT 'center' CHECK (alignment IN ('left', 'center', 'right')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bottom_cta_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.bottom_cta_settings TO authenticated;
GRANT ALL ON public.bottom_cta_settings TO service_role;
ALTER TABLE public.bottom_cta_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads bottom CTA" ON public.bottom_cta_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Banner managers create bottom CTA" ON public.bottom_cta_settings FOR INSERT TO authenticated WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "Banner managers update bottom CTA" ON public.bottom_cta_settings FOR UPDATE TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "Banner managers upload CTA backgrounds" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND name LIKE 'bottom-cta/%' AND public.has_permission('slides.manage'));
CREATE POLICY "Banner managers read CTA backgrounds" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media' AND name LIKE 'bottom-cta/%' AND public.has_permission('slides.manage'));