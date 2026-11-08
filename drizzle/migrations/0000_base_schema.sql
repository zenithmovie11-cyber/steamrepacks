CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT false $$;

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  cover_url text, file_url text, file_name text, play_url text,
  device_support text NOT NULL DEFAULT 'both',
  is_paid boolean NOT NULL DEFAULT false,
  price text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin update" ON public.posts FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin delete" ON public.posts FOR DELETE TO authenticated USING (public.is_admin());
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text, video_url text, button_text text, button_url text,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active slides" ON public.hero_slides FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "admin insert slides" ON public.hero_slides FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin update slides" ON public.hero_slides FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin delete slides" ON public.hero_slides FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.hero_slider_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  autoplay boolean NOT NULL DEFAULT true,
  interval_ms integer NOT NULL DEFAULT 5000 CHECK (interval_ms BETWEEN 2000 AND 30000),
  show_arrows boolean NOT NULL DEFAULT true,
  show_dots boolean NOT NULL DEFAULT true,
  pause_on_hover boolean NOT NULL DEFAULT true,
  loop boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.hero_slider_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.hero_slider_settings TO authenticated;
GRANT ALL ON public.hero_slider_settings TO service_role;
ALTER TABLE public.hero_slider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads slider settings" ON public.hero_slider_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin inserts slider settings" ON public.hero_slider_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin updates slider settings" ON public.hero_slider_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.hero_slider_settings(id) VALUES (1);

CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  engaged boolean NOT NULL DEFAULT false,
  country text NOT NULL DEFAULT 'Unknown', city text NOT NULL DEFAULT 'Unknown',
  device text NOT NULL DEFAULT 'Unknown', browser text NOT NULL DEFAULT 'Unknown', os text NOT NULL DEFAULT 'Unknown',
  traffic_channel text NOT NULL DEFAULT 'Unknown',
  referrer_source text,
  acquisition_recorded_at timestamptz
);
CREATE INDEX ON public.analytics_sessions(started_at);
CREATE TABLE public.analytics_pageviews (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.analytics_pageviews(created_at);
CREATE TABLE public.hero_slide_clicks (
  id uuid PRIMARY KEY,
  slide_id uuid NOT NULL REFERENCES public.hero_slides(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, slide_id)
);
CREATE TABLE public.visitor_pings (
  session_id text PRIMARY KEY,
  path text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_sessions, public.analytics_pageviews, public.hero_slide_clicks TO authenticated;
GRANT ALL ON public.analytics_sessions, public.analytics_pageviews, public.hero_slide_clicks, public.visitor_pings TO service_role;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slide_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read analytics sessions" ON public.analytics_sessions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read analytics pageviews" ON public.analytics_pageviews FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read slide clicks" ON public.hero_slide_clicks FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.record_analytics_event(p_session uuid, p_visitor uuid, p_view uuid, p_path text, p_engaged boolean, p_country text, p_city text, p_device text, p_browser text, p_os text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  INSERT INTO public.analytics_sessions(id,visitor_id,engaged,country,city,device,browser,os)
  VALUES(p_session,p_visitor,p_engaged,left(p_country,80),left(p_city,120),left(p_device,40),left(p_browser,60),left(p_os,60))
  ON CONFLICT(id) DO UPDATE SET last_seen=now(), engaged=analytics_sessions.engaged OR excluded.engaged
  WHERE analytics_sessions.visitor_id=excluded.visitor_id;
  IF p_view IS NOT NULL THEN
    INSERT INTO public.analytics_pageviews(id,session_id,path) VALUES(p_view,p_session,left(p_path,500)) ON CONFLICT(id) DO NOTHING;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.record_analytics_acquisition(p_session uuid, p_visitor uuid, p_view uuid, p_path text, p_engaged boolean, p_country text, p_city text, p_device text, p_browser text, p_os text, p_channel text, p_source text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  INSERT INTO public.analytics_sessions(id,visitor_id,engaged,country,city,device,browser,os,traffic_channel,referrer_source,acquisition_recorded_at)
  VALUES(p_session,p_visitor,p_engaged,left(p_country,80),left(p_city,120),left(p_device,40),left(p_browser,60),left(p_os,60),
    CASE WHEN p_channel IN ('Direct','Organic Search','Social','Referral') THEN p_channel ELSE 'Unknown' END, nullif(left(p_source,200),''), now())
  ON CONFLICT(id) DO UPDATE SET last_seen=now(), engaged=analytics_sessions.engaged OR excluded.engaged
  WHERE analytics_sessions.visitor_id=excluded.visitor_id;
  IF p_view IS NOT NULL THEN
    INSERT INTO public.analytics_pageviews(id,session_id,path) VALUES(p_view,p_session,left(p_path,500)) ON CONFLICT(id) DO NOTHING;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.record_hero_slide_click(p_id uuid, p_slide uuid, p_session uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.analytics_sessions WHERE id=p_session AND last_seen > now()-interval '30 minutes') THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.hero_slide_clicks WHERE session_id=p_session AND created_at > now()-interval '1 minute') >= 20 THEN RETURN; END IF;
  INSERT INTO public.hero_slide_clicks(id,slide_id,session_id) SELECT p_id,p_slide,p_session WHERE EXISTS(SELECT 1 FROM public.hero_slides WHERE id=p_slide)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_analytics_event(uuid,uuid,uuid,text,boolean,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_analytics_acquisition(uuid,uuid,uuid,text,boolean,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_hero_slide_click(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_analytics_event(uuid,uuid,uuid,text,boolean,text,text,text,text,text), public.record_analytics_acquisition(uuid,uuid,uuid,text,boolean,text,text,text,text,text,text,text), public.record_hero_slide_click(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_analytics_acquisition(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE since timestamptz; d int := least(greatest(coalesce(p_days,30),1),365); r jsonb; BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  since := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - make_interval(days => d-1);
  WITH s AS (SELECT * FROM public.analytics_sessions WHERE started_at >= since),
  v AS (SELECT pv.* FROM public.analytics_pageviews pv WHERE pv.created_at >= since),
  sv AS (SELECT s.id, s.engaged, s.last_seen, (SELECT count(*) FROM public.analytics_pageviews p WHERE p.session_id=s.id) AS views FROM s),
  completed AS (SELECT * FROM sv WHERE last_seen < now()-interval '30 minutes')
  SELECT jsonb_build_object(
    'visitors', (SELECT count(DISTINCT visitor_id) FROM s),
    'sessions', (SELECT count(*) FROM s),
    'pageviews', (SELECT count(*) FROM v),
    'bounce_rate', (SELECT CASE WHEN count(*)=0 THEN NULL ELSE round(100.0*count(*) FILTER (WHERE views<=1 AND NOT engaged)/count(*),1) END FROM completed),
    'live', (SELECT count(*) FROM public.analytics_sessions WHERE last_seen > now()-interval '5 minutes'),
    'tracking_since', (SELECT min(started_at) FROM public.analytics_sessions),
    'acquisition_since', (SELECT min(acquisition_recorded_at) FROM public.analytics_sessions),
    'daily', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', to_char(g,'YYYY-MM-DD'),
        'visitors', (SELECT count(DISTINCT visitor_id) FROM s WHERE (started_at AT TIME ZONE 'UTC')::date = g::date),
        'pageviews', (SELECT count(*) FROM v WHERE (created_at AT TIME ZONE 'UTC')::date = g::date)) ORDER BY g),'[]'::jsonb)
      FROM generate_series((since AT TIME ZONE 'UTC')::date, (now() AT TIME ZONE 'UTC')::date, interval '1 day') g),
    'locations', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('country',country,'city',city,'count',count(*)) x FROM s GROUP BY country,city ORDER BY count(*) DESC LIMIT 10) t),
    'devices', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('name',device,'count',count(*)) x FROM s GROUP BY device ORDER BY count(*) DESC LIMIT 10) t),
    'browsers', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('name',browser,'count',count(*)) x FROM s GROUP BY browser ORDER BY count(*) DESC LIMIT 10) t),
    'operating_systems', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('name',os,'count',count(*)) x FROM s GROUP BY os ORDER BY count(*) DESC LIMIT 10) t),
    'pages', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('name',path,'count',count(*)) x FROM v GROUP BY path ORDER BY count(*) DESC LIMIT 10) t),
    'channels', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('name',traffic_channel,'count',count(*)) x FROM s GROUP BY traffic_channel ORDER BY count(*) DESC) t),
    'referrers', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'count')::int DESC),'[]'::jsonb) FROM (SELECT jsonb_build_object('name',referrer_source,'count',count(*)) x FROM s WHERE referrer_source IS NOT NULL GROUP BY referrer_source ORDER BY count(*) DESC LIMIT 10) t)
  ) INTO r;
  RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.admin_analytics(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN public.admin_analytics_acquisition(p_days);
END $$;
CREATE OR REPLACE FUNCTION public.admin_hero_slide_stats(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days,30),1),365)); r jsonb; BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',h.id,'title',h.title,'clicks',coalesce(c.clicks,0),'sessions',coalesce(c.sessions,0)) ORDER BY h.sort_order, h.created_at),'[]'::jsonb) INTO r
  FROM public.hero_slides h LEFT JOIN (SELECT slide_id, count(*) clicks, count(DISTINCT session_id) sessions FROM public.hero_slide_clicks WHERE created_at >= since GROUP BY slide_id) c ON c.slide_id=h.id;
  RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.dev_console_overview() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'active_users', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now()-interval '30 days'),
    'total_visitors', (SELECT count(DISTINCT visitor_id) FROM public.analytics_sessions),
    'total_posts', (SELECT count(*) FROM public.posts),
    'posts_today', (SELECT count(*) FROM public.posts WHERE created_at >= date_trunc('day', now())),
    'paid_posts', (SELECT count(*) FROM public.posts WHERE is_paid),
    'free_posts', (SELECT count(*) FROM public.posts WHERE NOT is_paid),
    'revenue_today', 0,
    'db_size_bytes', pg_database_size(current_database()),
    'db_connections', (SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()),
    'started_at', pg_postmaster_start_time(),
    'latency_ms', 0);
END $$;
REVOKE ALL ON FUNCTION public.admin_analytics(integer), public.admin_analytics_acquisition(integer), public.admin_hero_slide_stats(integer), public.dev_console_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics(integer), public.admin_analytics_acquisition(integer), public.admin_hero_slide_stats(integer), public.dev_console_overview() TO authenticated, service_role;

CREATE POLICY "admin upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='media' AND public.is_admin());
CREATE POLICY "admin read media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='media' AND public.is_admin());
CREATE POLICY "admin update media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='media' AND public.is_admin()) WITH CHECK (bucket_id='media' AND public.is_admin());
CREATE POLICY "admin delete media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='media' AND public.is_admin());