CREATE TABLE public.lookbooks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, theme text NOT NULL DEFAULT '', short_story text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', layout text NOT NULL DEFAULT 'grid' CHECK (layout IN ('grid','slider','masonry')), is_published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lookbooks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lookbooks TO authenticated;
GRANT ALL ON public.lookbooks TO service_role;
ALTER TABLE public.lookbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published lookbooks" ON public.lookbooks FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Managers read all lookbooks" ON public.lookbooks FOR SELECT TO authenticated USING (public.has_permission('slides.manage'));
CREATE POLICY "Managers create lookbooks" ON public.lookbooks FOR INSERT TO authenticated WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "Managers update lookbooks" ON public.lookbooks FOR UPDATE TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "Managers delete lookbooks" ON public.lookbooks FOR DELETE TO authenticated USING (public.has_permission('slides.manage'));
CREATE TABLE public.lookbook_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lookbook_id uuid NOT NULL REFERENCES public.lookbooks(id) ON DELETE CASCADE, storage_path text NOT NULL UNIQUE, caption text NOT NULL DEFAULT '', sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lookbook_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lookbook_images TO authenticated;
GRANT ALL ON public.lookbook_images TO service_role;
ALTER TABLE public.lookbook_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published images" ON public.lookbook_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.lookbooks l WHERE l.id = lookbook_id AND l.is_published));
CREATE POLICY "Managers manage lookbook images" ON public.lookbook_images FOR ALL TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));
CREATE TABLE public.lookbook_hotspots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), image_id uuid NOT NULL REFERENCES public.lookbook_images(id) ON DELETE CASCADE, post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, x numeric NOT NULL CHECK (x >= 0 AND x <= 100), y numeric NOT NULL CHECK (y >= 0 AND y <= 100)
);
GRANT SELECT ON public.lookbook_hotspots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lookbook_hotspots TO authenticated;
GRANT ALL ON public.lookbook_hotspots TO service_role;
ALTER TABLE public.lookbook_hotspots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published hotspots" ON public.lookbook_hotspots FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.lookbook_images i JOIN public.lookbooks l ON l.id = i.lookbook_id WHERE i.id = image_id AND l.is_published));
CREATE POLICY "Managers manage hotspots" ON public.lookbook_hotspots FOR ALL TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));
CREATE INDEX lookbook_images_album_order ON public.lookbook_images(lookbook_id, sort_order);
CREATE INDEX lookbook_hotspots_image ON public.lookbook_hotspots(image_id);
CREATE POLICY "Managers upload lookbook media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lookbook-media' AND public.has_permission('slides.manage'));
CREATE POLICY "Managers read lookbook media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lookbook-media' AND public.has_permission('slides.manage'));
CREATE POLICY "Managers delete lookbook media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lookbook-media' AND public.has_permission('slides.manage'));
CREATE POLICY "Public reads published lookbook media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'lookbook-media' AND EXISTS (SELECT 1 FROM public.lookbook_images i JOIN public.lookbooks l ON l.id = i.lookbook_id WHERE i.storage_path = name AND l.is_published));