CREATE TABLE public.announcement_bar_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 message text NOT NULL DEFAULT 'ঈদ ধামাকা অফার! ২০% ছাড় চলছে',
 is_enabled boolean NOT NULL DEFAULT false,
 link_text text NOT NULL DEFAULT '',
 link_url text NOT NULL DEFAULT '',
 bg_color text NOT NULL DEFAULT '#1f2937' CHECK (bg_color ~ '^#[0-9a-fA-F]{6}$'),
 text_color text NOT NULL DEFAULT '#ffffff' CHECK (text_color ~ '^#[0-9a-fA-F]{6}$'),
 font_size text NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small','medium','large')),
 starts_at timestamptz,
 expires_at timestamptz,
 is_dismissible boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcement_bar_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.announcement_bar_settings TO authenticated;
GRANT ALL ON public.announcement_bar_settings TO service_role;
ALTER TABLE public.announcement_bar_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads announcement bar" ON public.announcement_bar_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Managers create announcement bar" ON public.announcement_bar_settings FOR INSERT TO authenticated WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "Managers update announcement bar" ON public.announcement_bar_settings FOR UPDATE TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));