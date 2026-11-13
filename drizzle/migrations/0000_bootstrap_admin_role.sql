INSERT INTO public.app_roles(name, permissions, is_system)
SELECT 'Administrator', ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','footer.manage','orders.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'], true
WHERE NOT EXISTS (SELECT 1 FROM public.app_roles WHERE name = 'Administrator');
INSERT INTO public.user_roles(email, role_id, protected)
SELECT e, (SELECT id FROM public.app_roles WHERE name = 'Administrator'), true
FROM unnest(ARRAY['noorasadbd@gmail.com','zenithgtastore@gmail.com','ramim980124@gmail.com']) e
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles u WHERE lower(u.email) = e);