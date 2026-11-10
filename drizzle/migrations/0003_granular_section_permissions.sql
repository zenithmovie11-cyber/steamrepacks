-- Backfill: existing roles keep the same effective access under the new section permissions
UPDATE public.app_roles SET permissions = coalesce((
  SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(
    permissions
    || CASE WHEN 'slides.manage' = ANY(permissions) THEN ARRAY['announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage'] ELSE ARRAY[]::text[] END
    || CASE WHEN 'posts.edit' = ANY(permissions) THEN ARRAY['offers.manage'] ELSE ARRAY[]::text[] END
    || CASE WHEN 'roles.manage' = ANY(permissions) THEN ARRAY['security.manage'] ELSE ARRAY[]::text[] END
  ) AS p
), '{}'::text[]);
UPDATE public.app_roles SET permissions = ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'] WHERE is_system;

CREATE OR REPLACE FUNCTION public.my_permissions()
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT coalesce((SELECT CASE WHEN ur.protected THEN ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'] ELSE r.permissions END FROM public.user_roles ur JOIN public.app_roles r ON r.id=ur.role_id WHERE auth.uid() IS NOT NULL AND ur.email=lower(auth.jwt()->>'email')), '{}'::text[]) $function$;

CREATE OR REPLACE FUNCTION public.manage_app_role(p_id uuid, p_name text, p_permissions text[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE rid uuid; oldrow jsonb; BEGIN
PERFORM pg_advisory_xact_lock(8972301);
IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF length(trim(p_name)) NOT BETWEEN 2 AND 40 OR p_name IS NULL OR p_permissions IS NULL OR NOT p_permissions <@ ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view']::text[] THEN RAISE EXCEPTION 'Invalid role or permissions'; END IF;
IF p_id IS NULL THEN INSERT INTO public.app_roles(name,permissions) VALUES(trim(p_name),p_permissions) RETURNING id INTO rid;
ELSE SELECT to_jsonb(r) INTO oldrow FROM public.app_roles r WHERE id=p_id AND NOT is_system FOR UPDATE; IF oldrow IS NULL THEN RAISE EXCEPTION 'System role is protected or role not found'; END IF; UPDATE public.app_roles SET name=trim(p_name),permissions=p_permissions WHERE id=p_id RETURNING id INTO rid; END IF;
INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),lower(auth.jwt()->>'email'),CASE WHEN p_id IS NULL THEN 'role.created' ELSE 'role.updated' END,trim(p_name),jsonb_build_object('before',oldrow,'permissions',p_permissions)); RETURN rid; END $function$;

-- Announcement bar
ALTER POLICY "Managers update announcement bar" ON public.announcement_bar_settings USING (public.has_permission('announcement.manage')) WITH CHECK (public.has_permission('announcement.manage'));
ALTER POLICY "Public reads enabled announcement bar" ON public.announcement_bar_settings USING ((id = 1) AND ((is_enabled AND ((expires_at IS NULL) OR (expires_at > now()))) OR public.has_permission('announcement.manage')));
ALTER POLICY "Managers create announcement bar" ON public.announcement_bar_settings WITH CHECK (public.has_permission('announcement.manage'));

-- Bottom CTA
ALTER POLICY "Banner managers create bottom CTA" ON public.bottom_cta_settings WITH CHECK (public.has_permission('bottom_cta.manage'));
ALTER POLICY "Public reads visible bottom CTA" ON public.bottom_cta_settings USING ((id = 1) AND (is_visible OR public.has_permission('bottom_cta.manage')));
ALTER POLICY "Banner managers update bottom CTA" ON public.bottom_cta_settings USING (public.has_permission('bottom_cta.manage')) WITH CHECK (public.has_permission('bottom_cta.manage'));
ALTER POLICY "Banner managers read CTA backgrounds" ON storage.objects USING ((bucket_id = 'media') AND (name ~~ 'bottom-cta/%') AND public.has_permission('bottom_cta.manage'));
ALTER POLICY "Banner managers upload CTA backgrounds" ON storage.objects WITH CHECK ((bucket_id = 'media') AND (name ~~ 'bottom-cta/%') AND public.has_permission('bottom_cta.manage'));

-- Customer reviews
ALTER POLICY "managers update reviews" ON public.customer_reviews USING (public.has_permission('reviews.manage')) WITH CHECK (public.has_permission('reviews.manage'));
ALTER POLICY "approved reviews public" ON public.customer_reviews USING ((status = 'approved') OR public.has_permission('reviews.manage'));
ALTER POLICY "managers delete reviews" ON public.customer_reviews USING (public.has_permission('reviews.manage'));
ALTER POLICY "review settings readable" ON public.review_settings USING ((id = 1) AND public.has_permission('reviews.manage'));
ALTER POLICY "review settings insert" ON public.review_settings WITH CHECK (public.has_permission('reviews.manage'));
ALTER POLICY "review settings update" ON public.review_settings USING (public.has_permission('reviews.manage')) WITH CHECK (public.has_permission('reviews.manage'));

-- Lookbooks
ALTER POLICY "Managers manage hotspots" ON public.lookbook_hotspots USING (public.has_permission('lookbooks.manage')) WITH CHECK (public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers manage lookbook images" ON public.lookbook_images USING (public.has_permission('lookbooks.manage')) WITH CHECK (public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers read all lookbooks" ON public.lookbooks USING (public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers update lookbooks" ON public.lookbooks USING (public.has_permission('lookbooks.manage')) WITH CHECK (public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers delete lookbooks" ON public.lookbooks USING (public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers create lookbooks" ON public.lookbooks WITH CHECK (public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers upload lookbook media" ON storage.objects WITH CHECK ((bucket_id = 'lookbook-media') AND public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers delete lookbook media" ON storage.objects USING ((bucket_id = 'lookbook-media') AND public.has_permission('lookbooks.manage'));
ALTER POLICY "Managers read lookbook media" ON storage.objects USING ((bucket_id = 'lookbook-media') AND public.has_permission('lookbooks.manage'));

-- Special offers
ALTER POLICY "public read live offers" ON public.special_offers USING (is_active OR public.has_permission('offers.manage'));
ALTER POLICY "editors update offers" ON public.special_offers USING (public.has_permission('offers.manage')) WITH CHECK (public.has_permission('offers.manage'));
ALTER POLICY "editors delete offers" ON public.special_offers USING (public.has_permission('offers.manage'));
ALTER POLICY "editors insert offers" ON public.special_offers WITH CHECK (public.has_permission('offers.manage'));

-- IP security
ALTER POLICY "Security managers read events" ON public.ip_security_events USING (public.has_permission('security.manage'));
ALTER POLICY "Security managers read rules" ON public.ip_security_rules USING (public.has_permission('security.manage'));
ALTER POLICY "Security managers read settings" ON public.ip_security_settings USING (public.has_permission('security.manage'));

CREATE OR REPLACE FUNCTION public.ip_security_overview(p_offset integer DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_permission('security.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.manage_ip_security_rule(p_id uuid, p_network text, p_kind text, p_reason text, p_expires_at timestamp with time zone, p_delete boolean DEFAULT false)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_net cidr;
BEGIN
  IF NOT public.has_permission('security.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.save_ip_security_settings(p_rpm integer, p_block_minutes integer, p_rate_limit boolean, p_block_bots boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_permission('security.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE ip_security_settings SET requests_per_minute = p_rpm, block_minutes = p_block_minutes, rate_limit_enabled = p_rate_limit, block_bot_signals = p_block_bots WHERE id = 1;
  INSERT INTO security_audit_logs(actor_id, actor_email, action, target, details) VALUES (auth.uid(), lower(auth.jwt()->>'email'), 'ip.settings_saved', 'firewall', jsonb_build_object('rpm', p_rpm, 'rate_limit', p_rate_limit, 'block_bots', p_block_bots));
END $function$;