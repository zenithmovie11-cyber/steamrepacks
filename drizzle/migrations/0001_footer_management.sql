CREATE TABLE public.footer_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 brand_name text NOT NULL DEFAULT 'Monolith', logo_url text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 quick_links jsonb NOT NULL DEFAULT '[{"label":"Content library","url":"/"}]'::jsonb,
 policies jsonb NOT NULL DEFAULT '[]'::jsonb,
 contact_email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', support_hours text NOT NULL DEFAULT '',
 socials jsonb NOT NULL DEFAULT '{}'::jsonb,
 copyright_text text NOT NULL DEFAULT '© {year} Monolith. All rights reserved.',
 is_visible boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.footer_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.footer_settings TO authenticated;
GRANT ALL ON public.footer_settings TO service_role;
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible footer public read" ON public.footer_settings FOR SELECT TO anon, authenticated USING (id=1 AND is_visible);
CREATE POLICY "Footer manager read" ON public.footer_settings FOR SELECT TO authenticated USING (id=1 AND public.has_permission('footer.manage'));
CREATE POLICY "Footer manager insert" ON public.footer_settings FOR INSERT TO authenticated WITH CHECK (id=1 AND public.has_permission('footer.manage'));
CREATE POLICY "Footer manager update" ON public.footer_settings FOR UPDATE TO authenticated USING (id=1 AND public.has_permission('footer.manage')) WITH CHECK (id=1 AND public.has_permission('footer.manage'));
CREATE FUNCTION public.footer_audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 NEW.updated_at=now();
 INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),coalesce(lower(auth.jwt()->>'email'),'system'),'footer.updated','Footer',jsonb_build_object('operation',TG_OP));
 RETURN NEW;
END $$;
CREATE TRIGGER footer_settings_audit BEFORE INSERT OR UPDATE ON public.footer_settings FOR EACH ROW EXECUTE FUNCTION public.footer_audit_change();
DO $$ DECLARE fn text; BEGIN
 SELECT pg_get_functiondef('public.manage_app_role(uuid,text,text[])'::regprocedure) INTO fn;
 EXECUTE replace(fn,'''newsletter.manage''','''newsletter.manage'',''footer.manage''');
 SELECT pg_get_functiondef('public.my_permissions()'::regprocedure) INTO fn;
 EXECUTE replace(fn,'''newsletter.manage''','''newsletter.manage'',''footer.manage''');
END $$;
UPDATE public.app_roles SET permissions=array_append(permissions,'footer.manage') WHERE is_system AND NOT ('footer.manage'=ANY(permissions));