-- Seed the singleton banner row so the homepage keeps its current default banner once hidden rows stop being public.
INSERT INTO public.bottom_cta_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public reads bottom CTA" ON public.bottom_cta_settings;
CREATE POLICY "Public reads visible bottom CTA" ON public.bottom_cta_settings FOR SELECT TO anon, authenticated
  USING (id = 1 AND (is_visible OR public.has_permission('slides.manage')));

DROP POLICY IF EXISTS "Public reads announcement bar" ON public.announcement_bar_settings;
CREATE POLICY "Public reads enabled announcement bar" ON public.announcement_bar_settings FOR SELECT TO anon, authenticated
  USING (id = 1 AND ((is_enabled AND (expires_at IS NULL OR expires_at > now())) OR public.has_permission('slides.manage')));

DROP POLICY IF EXISTS "Anyone reads slider settings" ON public.hero_slider_settings;
CREATE POLICY "Public reads singleton slider settings" ON public.hero_slider_settings FOR SELECT TO anon, authenticated
  USING (id = 1);

-- Posts: the catalogue stays public, but the protected play link is only reachable through post_play_urls().
REVOKE SELECT ON public.posts FROM anon, authenticated;
GRANT SELECT (id, title, description, category, cover_url, file_url, file_name, device_support, is_paid, price, created_at, updated_at) ON public.posts TO anon, authenticated;
DROP POLICY IF EXISTS "public read" ON public.posts;
CREATE POLICY "Public reads catalogue posts" ON public.posts FOR SELECT TO anon, authenticated
  USING (created_at <= now() OR public.has_permission('posts.edit'));

-- Lookbook media: no direct public object reads; published images are served via short-lived signed URLs issued server-side.
DROP POLICY IF EXISTS "Public reads published lookbook media" ON storage.objects;