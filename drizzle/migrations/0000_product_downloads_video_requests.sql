ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text, ADD COLUMN IF NOT EXISTS download_path text, ADD COLUMN IF NOT EXISTS download_name text;
ALTER TABLE public.posts ADD CONSTRAINT posts_video_url_check CHECK (video_url IS NULL OR (length(video_url) <= 2000 AND video_url ~ '^https://'));
ALTER TABLE public.posts ADD CONSTRAINT posts_download_check CHECK ((download_path IS NULL OR length(download_path) <= 500) AND (download_name IS NULL OR length(download_name) <= 255));
GRANT SELECT (video_url, download_path, download_name) ON public.posts TO anon, authenticated;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_id text, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz, ADD COLUMN IF NOT EXISTS reviewed_by text, ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['pending','paid','approved','rejected','failed','cancelled']));
ALTER TABLE public.orders ADD CONSTRAINT orders_request_text_check CHECK ((transaction_id IS NULL OR length(transaction_id) <= 40) AND (admin_note IS NULL OR length(admin_note) <= 300));

CREATE OR REPLACE FUNCTION public.order_secure_totals()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE q jsonb; BEGIN
IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sign in to place an order'; END IF;
IF length(trim(NEW.full_name)) NOT BETWEEN 1 AND 100 OR length(trim(NEW.address)) NOT BETWEEN 1 AND 300 OR length(trim(NEW.city)) NOT BETWEEN 1 AND 100 OR NEW.phone !~ '^01[3-9][0-9]{8}$' OR NEW.bkash_number !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid buyer information'; END IF;
IF (SELECT count(*) FROM public.orders WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 10 THEN RAISE EXCEPTION 'Too many requests, please try again later'; END IF;
NEW.email:=lower(auth.jwt()->>'email'); NEW.status:='pending'; NEW.payment_ref:=NULL;
NEW.transaction_id:=nullif(left(trim(coalesce(NEW.transaction_id,'')),40),'');
NEW.reviewed_at:=NULL; NEW.reviewed_by:=NULL; NEW.admin_note:=NULL;
q:=public.checkout_quote(NEW.post_ids,NEW.coupon_code); NEW.subtotal:=(q->>'subtotal')::numeric; NEW.discount_amount:=(q->>'discount')::numeric; NEW.total:=(q->>'total')::numeric; NEW.coupon_code:=q->>'coupon'; RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.my_permissions()
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT coalesce((SELECT CASE WHEN ur.protected THEN ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','orders.manage','footer.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'] ELSE r.permissions END FROM public.user_roles ur JOIN public.app_roles r ON r.id=ur.role_id WHERE auth.uid() IS NOT NULL AND ur.email=lower(auth.jwt()->>'email')), '{}'::text[]) $function$;

CREATE OR REPLACE FUNCTION public.manage_app_role(p_id uuid, p_name text, p_permissions text[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE rid uuid; oldrow jsonb; BEGIN
PERFORM pg_advisory_xact_lock(8972301);
IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF length(trim(p_name)) NOT BETWEEN 2 AND 40 OR p_name IS NULL OR p_permissions IS NULL OR NOT p_permissions <@ ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','orders.manage','footer.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view']::text[] THEN RAISE EXCEPTION 'Invalid role or permissions'; END IF;
IF p_id IS NULL THEN INSERT INTO public.app_roles(name,permissions) VALUES(trim(p_name),p_permissions) RETURNING id INTO rid;
ELSE SELECT to_jsonb(r) INTO oldrow FROM public.app_roles r WHERE id=p_id AND NOT is_system FOR UPDATE; IF oldrow IS NULL THEN RAISE EXCEPTION 'System role is protected or role not found'; END IF; UPDATE public.app_roles SET name=trim(p_name),permissions=p_permissions WHERE id=p_id RETURNING id INTO rid; END IF;
INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),lower(auth.jwt()->>'email'),CASE WHEN p_id IS NULL THEN 'role.created' ELSE 'role.updated' END,trim(p_name),jsonb_build_object('before',oldrow,'permissions',p_permissions)); RETURN rid; END $function$;

ALTER POLICY "Read own orders or manage" ON public.orders USING ((user_id = auth.uid()) OR public.has_permission('orders.manage'));

CREATE OR REPLACE FUNCTION public.review_order(p_id uuid, p_status text, p_note text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE o public.orders; BEGIN
IF NOT public.has_permission('orders.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF p_status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
UPDATE public.orders SET status=p_status, reviewed_at=CASE WHEN p_status='pending' THEN NULL ELSE now() END, reviewed_by=CASE WHEN p_status='pending' THEN NULL ELSE lower(auth.jwt()->>'email') END, admin_note=nullif(left(trim(coalesce(p_note,'')),300),'')
 WHERE id=p_id RETURNING * INTO o;
IF o.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),lower(auth.jwt()->>'email'),'order.'||p_status,o.email,jsonb_build_object('order',o.id,'total',o.total,'posts',o.post_ids));
END $function$;
REVOKE ALL ON FUNCTION public.review_order(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_order(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_play_urls()
 RETURNS TABLE(id uuid, play_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.play_url FROM public.posts p
  WHERE p.play_url IS NOT NULL AND (
    NOT p.is_paid
    OR public.has_permission('posts.edit')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = auth.uid() AND o.status IN ('paid','approved') AND p.id = ANY(o.post_ids))
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_download_product_file(p_name text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.has_permission('posts.edit') OR EXISTS (
    SELECT 1 FROM public.posts p WHERE p.download_path = p_name AND (
      NOT p.is_paid
      OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = auth.uid() AND o.status IN ('paid','approved') AND p.id = ANY(o.post_ids))));
$function$;
GRANT EXECUTE ON FUNCTION public.can_download_product_file(text) TO anon, authenticated;

CREATE POLICY "Entitled users read product files" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-files' AND public.can_download_product_file(name));
CREATE POLICY "Publishers upload product files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-files' AND (public.has_permission('posts.create') OR public.has_permission('posts.edit')));
CREATE POLICY "Editors delete product files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-files' AND (public.has_permission('posts.edit') OR public.has_permission('posts.delete')));