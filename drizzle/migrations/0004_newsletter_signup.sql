CREATE TABLE public.newsletter_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled boolean NOT NULL DEFAULT true,
  badge_text text NOT NULL DEFAULT 'VIP MEMBERS' CHECK (char_length(badge_text) <= 40),
  title text NOT NULL DEFAULT 'Exclusive Offers Delivered to You' CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT 'নতুন গেম, অফার আর ডিসকাউন্টের খবর সবার আগে পেতে আপনার ইমেইল দিয়ে সাবস্ক্রাইব করুন।' CHECK (char_length(description) <= 400),
  placeholder text NOT NULL DEFAULT 'your@email.com' CHECK (char_length(trim(placeholder)) BETWEEN 1 AND 60),
  button_text text NOT NULL DEFAULT 'SUBSCRIBE' CHECK (char_length(trim(button_text)) BETWEEN 1 AND 30),
  success_message text NOT NULL DEFAULT 'Thanks for subscribing! You are on the list.' CHECK (char_length(trim(success_message)) BETWEEN 1 AND 200),
  bg_color text NOT NULL DEFAULT '#111827' CHECK (bg_color ~ '^#[0-9a-fA-F]{6}$'),
  text_color text NOT NULL DEFAULT '#ffffff' CHECK (text_color ~ '^#[0-9a-fA-F]{6}$'),
  button_color text NOT NULL DEFAULT '#d9442b' CHECK (button_color ~ '^#[0-9a-fA-F]{6}$'),
  button_text_color text NOT NULL DEFAULT '#ffffff' CHECK (button_text_color ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.newsletter_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.newsletter_settings TO authenticated;
GRANT ALL ON public.newsletter_settings TO service_role;
ALTER TABLE public.newsletter_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads enabled newsletter" ON public.newsletter_settings FOR SELECT TO anon, authenticated USING (id = 1 AND (is_enabled OR public.has_permission('newsletter.manage')));
CREATE POLICY "Managers create newsletter settings" ON public.newsletter_settings FOR INSERT TO authenticated WITH CHECK (public.has_permission('newsletter.manage'));
CREATE POLICY "Managers update newsletter settings" ON public.newsletter_settings FOR UPDATE TO authenticated USING (public.has_permission('newsletter.manage')) WITH CHECK (public.has_permission('newsletter.manage'));
INSERT INTO public.newsletter_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Coupon is private: revealed only by the subscribe function after a successful signup
CREATE TABLE public.newsletter_reward (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  coupon_code text NOT NULL DEFAULT '' CHECK (coupon_code ~ '^[A-Za-z0-9_-]{0,40}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.newsletter_reward TO authenticated;
GRANT ALL ON public.newsletter_reward TO service_role;
ALTER TABLE public.newsletter_reward ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read newsletter reward" ON public.newsletter_reward FOR SELECT TO authenticated USING (public.has_permission('newsletter.manage'));
CREATE POLICY "Managers create newsletter reward" ON public.newsletter_reward FOR INSERT TO authenticated WITH CHECK (public.has_permission('newsletter.manage'));
CREATE POLICY "Managers update newsletter reward" ON public.newsletter_reward FOR UPDATE TO authenticated USING (public.has_permission('newsletter.manage')) WITH CHECK (public.has_permission('newsletter.manage'));
INSERT INTO public.newsletter_reward (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254 AND email = lower(email)),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed')),
  source text NOT NULL DEFAULT 'homepage' CHECK (char_length(source) <= 40),
  coupon_shown boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
CREATE UNIQUE INDEX newsletter_subscribers_email_key ON public.newsletter_subscribers (email);
CREATE INDEX newsletter_subscribers_created_idx ON public.newsletter_subscribers (created_at DESC);
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT UPDATE (status) ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_permission('newsletter.manage'));
CREATE POLICY "Managers update subscribers" ON public.newsletter_subscribers FOR UPDATE TO authenticated USING (public.has_permission('newsletter.manage')) WITH CHECK (public.has_permission('newsletter.manage'));
CREATE POLICY "Managers delete subscribers" ON public.newsletter_subscribers FOR DELETE TO authenticated USING (public.has_permission('newsletter.manage'));

CREATE OR REPLACE FUNCTION public.newsletter_subscriber_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.unsubscribed_at := CASE WHEN NEW.status = 'unsubscribed' THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER newsletter_subscribers_touch BEFORE UPDATE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.newsletter_subscriber_touch();

CREATE OR REPLACE FUNCTION public.newsletter_subscribe(p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(coalesce(p_email, ''))); code text; prev text; outcome text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_settings WHERE id = 1 AND is_enabled) THEN RAISE EXCEPTION 'Newsletter signup is closed right now'; END IF;
  IF char_length(e) > 254 OR e !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
  IF (SELECT count(*) FROM public.newsletter_subscribers WHERE updated_at > now() - interval '1 minute') >= 30 THEN RAISE EXCEPTION 'Too many signups right now, please try again in a minute'; END IF;
  SELECT nullif(trim(coupon_code), '') INTO code FROM public.newsletter_reward WHERE id = 1;
  INSERT INTO public.newsletter_subscribers (email, coupon_shown) VALUES (e, code IS NOT NULL) ON CONFLICT (email) DO NOTHING;
  IF FOUND THEN outcome := 'subscribed';
  ELSE
    SELECT status INTO prev FROM public.newsletter_subscribers WHERE email = e FOR UPDATE;
    IF prev = 'unsubscribed' THEN
      UPDATE public.newsletter_subscribers SET status = 'active', coupon_shown = coupon_shown OR code IS NOT NULL WHERE email = e;
      outcome := 'resubscribed';
    ELSE outcome := 'already'; END IF;
  END IF;
  RETURN jsonb_build_object('result', outcome, 'coupon', code);
END $$;
REVOKE ALL ON FUNCTION public.newsletter_subscribe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.newsletter_subscribe(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.newsletter_stats() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
  IF NOT public.has_permission('newsletter.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN (SELECT jsonb_build_object(
    'total', count(*),
    'active', count(*) FILTER (WHERE status = 'active'),
    'unsubscribed', count(*) FILTER (WHERE status = 'unsubscribed'),
    'today', count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Dhaka')::date = today),
    'last7', count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Dhaka')::date > today - 7),
    'last30', count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Dhaka')::date > today - 30),
    'coupons', count(*) FILTER (WHERE coupon_shown),
    'daily', (SELECT jsonb_agg(jsonb_build_object('day', d.day, 'count', (SELECT count(*) FROM public.newsletter_subscribers x WHERE (x.created_at AT TIME ZONE 'Asia/Dhaka')::date = d.day)) ORDER BY d.day)
              FROM (SELECT (today - g)::date AS day FROM generate_series(0, 13) g) d)
  ) FROM public.newsletter_subscribers);
END $$;
REVOKE ALL ON FUNCTION public.newsletter_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.newsletter_stats() TO authenticated;

-- Permission: newsletter.manage
UPDATE public.app_roles SET permissions = ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'] WHERE is_system;

CREATE OR REPLACE FUNCTION public.my_permissions()
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT coalesce((SELECT CASE WHEN ur.protected THEN ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'] ELSE r.permissions END FROM public.user_roles ur JOIN public.app_roles r ON r.id=ur.role_id WHERE auth.uid() IS NOT NULL AND ur.email=lower(auth.jwt()->>'email')), '{}'::text[]) $function$;

CREATE OR REPLACE FUNCTION public.manage_app_role(p_id uuid, p_name text, p_permissions text[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE rid uuid; oldrow jsonb; BEGIN
PERFORM pg_advisory_xact_lock(8972301);
IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF length(trim(p_name)) NOT BETWEEN 2 AND 40 OR p_name IS NULL OR p_permissions IS NULL OR NOT p_permissions <@ ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view']::text[] THEN RAISE EXCEPTION 'Invalid role or permissions'; END IF;
IF p_id IS NULL THEN INSERT INTO public.app_roles(name,permissions) VALUES(trim(p_name),p_permissions) RETURNING id INTO rid;
ELSE SELECT to_jsonb(r) INTO oldrow FROM public.app_roles r WHERE id=p_id AND NOT is_system FOR UPDATE; IF oldrow IS NULL THEN RAISE EXCEPTION 'System role is protected or role not found'; END IF; UPDATE public.app_roles SET name=trim(p_name),permissions=p_permissions WHERE id=p_id RETURNING id INTO rid; END IF;
INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),lower(auth.jwt()->>'email'),CASE WHEN p_id IS NULL THEN 'role.created' ELSE 'role.updated' END,trim(p_name),jsonb_build_object('before',oldrow,'permissions',p_permissions)); RETURN rid; END $function$;