CREATE TABLE public.customer_accounts (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'active',
  status_reason text,
  customer_tier text NOT NULL DEFAULT 'regular',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_accounts_status_valid CHECK (status IN ('active', 'flagged', 'suspended', 'banned')),
  CONSTRAINT customer_accounts_tier_valid CHECK (customer_tier IN ('regular', 'vip', 'wholesale'))
);
GRANT SELECT, INSERT, UPDATE ON public.customer_accounts TO authenticated;
GRANT ALL ON public.customer_accounts TO service_role;
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer managers read accounts" ON public.customer_accounts FOR SELECT TO authenticated USING (public.has_permission('customers.manage'));
CREATE POLICY "Customer managers create accounts" ON public.customer_accounts FOR INSERT TO authenticated WITH CHECK (public.has_permission('customers.manage'));
CREATE POLICY "Customer managers update accounts" ON public.customer_accounts FOR UPDATE TO authenticated USING (public.has_permission('customers.manage')) WITH CHECK (public.has_permission('customers.manage'));

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT coalesce((SELECT CASE WHEN ur.protected THEN ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','orders.manage','customers.manage','footer.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view'] ELSE r.permissions END FROM public.user_roles ur JOIN public.app_roles r ON r.id=ur.role_id WHERE auth.uid() IS NOT NULL AND ur.email=lower(auth.jwt()->>'email')), '{}'::text[]) $function$;

CREATE OR REPLACE FUNCTION public.manage_app_role(p_id uuid, p_name text, p_permissions text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE rid uuid; oldrow jsonb; BEGIN
PERFORM pg_advisory_xact_lock(8972301);
IF NOT public.has_permission('roles.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF length(trim(p_name)) NOT BETWEEN 2 AND 40 OR p_name IS NULL OR p_permissions IS NULL OR NOT p_permissions <@ ARRAY['posts.create','posts.edit','posts.delete','slides.manage','offers.manage','announcement.manage','bottom_cta.manage','lookbooks.manage','reviews.manage','newsletter.manage','orders.manage','customers.manage','footer.manage','overview.view','analytics.view','roles.manage','security.manage','audit.view']::text[] THEN RAISE EXCEPTION 'Invalid role or permissions'; END IF;
IF p_id IS NULL THEN INSERT INTO public.app_roles(name,permissions) VALUES(trim(p_name),p_permissions) RETURNING id INTO rid;
ELSE SELECT to_jsonb(r) INTO oldrow FROM public.app_roles r WHERE id=p_id AND NOT is_system FOR UPDATE; IF oldrow IS NULL THEN RAISE EXCEPTION 'System role is protected or role not found'; END IF; UPDATE public.app_roles SET name=trim(p_name),permissions=p_permissions WHERE id=p_id RETURNING id INTO rid; END IF;
INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),lower(auth.jwt()->>'email'),CASE WHEN p_id IS NULL THEN 'role.created' ELSE 'role.updated' END,trim(p_name),jsonb_build_object('before',oldrow,'permissions',p_permissions)); RETURN rid; END $function$;

CREATE OR REPLACE FUNCTION public.checkout_quote(p_post_ids uuid[], p_coupon text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer; sub numeric; off numeric:=0; code text:=upper(trim(coalesce(p_coupon,''))); reward public.newsletter_reward;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to checkout'; END IF;
IF EXISTS (SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.status IN ('suspended','banned')) THEN RAISE EXCEPTION 'This account cannot place purchase requests'; END IF;
n:=cardinality(p_post_ids); IF n IS NULL OR n<1 OR n>100 OR n<>(SELECT count(DISTINCT x) FROM unnest(p_post_ids) x) THEN RAISE EXCEPTION 'Invalid cart'; END IF;
IF n<>(SELECT count(*) FROM public.posts WHERE id=ANY(p_post_ids) AND is_paid) THEN RAISE EXCEPTION 'Some items are unavailable'; END IF;
WITH base AS (SELECT id,CASE WHEN regexp_replace(coalesce(price,''),'[^0-9.]','','g') ~ '^[0-9]+(\.[0-9]+)?$' THEN regexp_replace(price,'[^0-9.]','','g')::numeric ELSE NULL END AS price FROM public.posts WHERE id=ANY(p_post_ids)), prices AS (SELECT b.id,b.price,least(b.price,coalesce((SELECT min(greatest(0,round(b.price-CASE WHEN o.discount_type='percentage' THEN b.price*o.discount_value/100 ELSE o.discount_value END,2))) FROM public.special_offers o WHERE o.is_active AND (o.starts_at IS NULL OR o.starts_at<=now()) AND (o.ends_at IS NULL OR o.ends_at>now()) AND (cardinality(o.post_ids)=0 OR b.id=ANY(o.post_ids))),b.price)) AS final FROM base b) SELECT CASE WHEN count(price)=n THEN sum(final) ELSE NULL END INTO sub FROM prices;
IF sub IS NULL OR sub<0 THEN RAISE EXCEPTION 'An item has an invalid price'; END IF;
IF code<>'' THEN SELECT * INTO reward FROM public.newsletter_reward WHERE id=1; IF reward.id IS NULL OR upper(reward.coupon_code)<>code OR reward.discount_amount<=0 OR (reward.expires_at IS NOT NULL AND reward.expires_at<=now()) THEN RAISE EXCEPTION 'Coupon is invalid or expired'; END IF; IF NOT EXISTS(SELECT 1 FROM public.newsletter_subscribers WHERE email=lower(auth.jwt()->>'email') AND status='active') THEN RAISE EXCEPTION 'Subscribe with your signed-in email to use this coupon'; END IF; off:=least(sub,reward.discount_amount); END IF;
RETURN jsonb_build_object('subtotal',round(sub,2),'discount',round(off,2),'total',round(sub-off,2),'coupon',nullif(code,'')); END $function$;

CREATE OR REPLACE FUNCTION public.order_secure_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE q jsonb; BEGIN
IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sign in to place an order'; END IF;
IF EXISTS (SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.status IN ('suspended','banned')) THEN RAISE EXCEPTION 'This account cannot place purchase requests'; END IF;
IF length(trim(NEW.full_name)) NOT BETWEEN 1 AND 100 OR length(trim(NEW.address)) NOT BETWEEN 1 AND 300 OR length(trim(NEW.city)) NOT BETWEEN 1 AND 100 OR NEW.phone !~ '^01[3-9][0-9]{8}$' OR NEW.bkash_number !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid buyer information'; END IF;
IF (SELECT count(*) FROM public.orders WHERE user_id=auth.uid() AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'Too many requests, please try again later'; END IF;
NEW.email:=lower(auth.jwt()->>'email'); NEW.status:='pending'; NEW.payment_ref:=NULL; NEW.transaction_id:=nullif(left(trim(coalesce(NEW.transaction_id,'')),40),''); NEW.reviewed_at:=NULL; NEW.reviewed_by:=NULL; NEW.admin_note:=NULL;
q:=public.checkout_quote(NEW.post_ids,NEW.coupon_code); NEW.subtotal:=(q->>'subtotal')::numeric; NEW.discount_amount:=(q->>'discount')::numeric; NEW.total:=(q->>'total')::numeric; NEW.coupon_code:=q->>'coupon'; RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.can_download_product_file(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT NOT EXISTS (SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.status IN ('suspended','banned')) AND (public.has_permission('posts.edit') OR EXISTS (SELECT 1 FROM public.posts p WHERE p.download_path=p_name AND (NOT p.is_paid OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id=auth.uid() AND o.status IN ('paid','approved') AND p.id=ANY(o.post_ids))))) $function$;

CREATE OR REPLACE FUNCTION public.post_play_urls()
RETURNS TABLE(id uuid, play_url text) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT p.id,p.play_url FROM public.posts p WHERE p.play_url IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.status IN ('suspended','banned')) AND (NOT p.is_paid OR public.has_permission('posts.edit') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id=auth.uid() AND o.status IN ('paid','approved') AND p.id=ANY(o.post_ids))) $function$;

CREATE OR REPLACE FUNCTION public.admin_customers(p_search text DEFAULT '', p_status text DEFAULT 'all', p_tier text DEFAULT 'all', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb; needle text:=lower(trim(coalesce(p_search,'')));
BEGIN
IF NOT public.has_permission('customers.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF p_limit NOT BETWEEN 1 AND 100 OR p_offset<0 OR p_status NOT IN ('all','active','flagged','suspended','banned') OR p_tier NOT IN ('all','regular','vip','wholesale') THEN RAISE EXCEPTION 'Invalid customer query'; END IF;
WITH enriched AS (
 SELECT u.id,lower(u.email) AS email,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),recent.full_name,split_part(u.email,'@',1)) AS full_name,coalesce(nullif(u.raw_user_meta_data->>'phone',''),recent.phone,'') AS phone,u.created_at,u.last_sign_in_at,coalesce(ca.status,'active') AS status,coalesce(ca.status_reason,'') AS status_reason,coalesce(ca.customer_tier,'regular') AS customer_tier,coalesce(ca.notes,'') AS notes,coalesce(stats.total_orders,0)::integer AS total_orders,coalesce(stats.total_spent,0)::numeric AS total_spent,recent.created_at AS last_order_at,coalesce(recent.address,'') AS latest_address,coalesce(recent.city,'') AS latest_city
 FROM auth.users u LEFT JOIN public.customer_accounts ca ON ca.user_id=u.id
 LEFT JOIN LATERAL (SELECT o.full_name,o.phone,o.address,o.city,o.created_at FROM public.orders o WHERE o.user_id=u.id ORDER BY o.created_at DESC LIMIT 1) recent ON true
 LEFT JOIN LATERAL (SELECT count(*)::integer AS total_orders,coalesce(sum(o.total) FILTER (WHERE o.status IN ('paid','approved')),0)::numeric AS total_spent FROM public.orders o WHERE o.user_id=u.id) stats ON true
), filtered AS (
 SELECT * FROM enriched e WHERE (p_status='all' OR e.status=p_status) AND (p_tier='all' OR e.customer_tier=p_tier) AND (needle='' OR lower(concat_ws(' ',e.email,e.full_name,e.phone)) LIKE '%'||needle||'%')
)
SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'customers',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY page.created_at DESC,page.email) FROM (SELECT * FROM filtered ORDER BY created_at DESC,email LIMIT p_limit OFFSET p_offset) page),'[]'::jsonb)) INTO result;
RETURN result;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_customer_profile(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
IF NOT public.has_permission('customers.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF p_user_id IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
SELECT jsonb_build_object(
 'id',u.id,'email',lower(u.email),'full_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),recent.full_name,split_part(u.email,'@',1)),
 'phone',coalesce(nullif(u.raw_user_meta_data->>'phone',''),recent.phone,''),'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,
 'status',coalesce(ca.status,'active'),'status_reason',coalesce(ca.status_reason,''),'customer_tier',coalesce(ca.customer_tier,'regular'),'notes',coalesce(ca.notes,''),
 'total_orders',coalesce(stats.total_orders,0),'total_spent',coalesce(stats.total_spent,0),'latest_address',coalesce(recent.address,''),'latest_city',coalesce(recent.city,''),
 'orders',coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'created_at',o.created_at,'status',o.status,'total',o.total,'subtotal',o.subtotal,'discount_amount',o.discount_amount,'coupon_code',o.coupon_code,'transaction_id',o.transaction_id,'bkash_number',o.bkash_number,'address',o.address,'city',o.city,'admin_note',o.admin_note,'products',coalesce((SELECT jsonb_agg(p.title ORDER BY p.title) FROM unnest(o.post_ids) post_id JOIN public.posts p ON p.id=post_id),'[]'::jsonb)) ORDER BY o.created_at DESC) FROM public.orders o WHERE o.user_id=u.id),'[]'::jsonb)
) INTO result
FROM auth.users u LEFT JOIN public.customer_accounts ca ON ca.user_id=u.id
LEFT JOIN LATERAL (SELECT o.full_name,o.phone,o.address,o.city FROM public.orders o WHERE o.user_id=u.id ORDER BY o.created_at DESC LIMIT 1) recent ON true
LEFT JOIN LATERAL (SELECT count(*)::integer AS total_orders,coalesce(sum(o.total) FILTER (WHERE o.status IN ('paid','approved')),0)::numeric AS total_spent FROM public.orders o WHERE o.user_id=u.id) stats ON true
WHERE u.id=p_user_id;
IF result IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
RETURN result;
END $function$;

CREATE OR REPLACE FUNCTION public.manage_customer(p_user_id uuid,p_status text,p_customer_tier text,p_reason text DEFAULT '',p_notes text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE old_status text; old_tier text; before_state jsonb; clean_reason text:=left(trim(coalesce(p_reason,'')),300); clean_notes text:=left(trim(coalesce(p_notes,'')),2000);
BEGIN
IF NOT public.has_permission('customers.manage') THEN RAISE EXCEPTION 'Access denied'; END IF;
IF p_user_id IS NULL OR p_status NOT IN ('active','flagged','suspended','banned') OR p_customer_tier NOT IN ('regular','vip','wholesale') THEN RAISE EXCEPTION 'Invalid customer update'; END IF;
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
SELECT jsonb_build_object('status',coalesce(ca.status,'active'),'customer_tier',coalesce(ca.customer_tier,'regular'),'status_reason',coalesce(ca.status_reason,''),'notes',coalesce(ca.notes,'')) INTO before_state FROM (SELECT p_user_id AS user_id) target LEFT JOIN public.customer_accounts ca USING(user_id);
INSERT INTO public.customer_accounts(user_id,status,status_reason,customer_tier,notes,updated_at) VALUES(p_user_id,p_status,clean_reason,p_customer_tier,clean_notes,now()) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,status_reason=excluded.status_reason,customer_tier=excluded.customer_tier,notes=excluded.notes,updated_at=now();
INSERT INTO public.security_audit_logs(actor_id,actor_email,action,target,details) VALUES(auth.uid(),lower(auth.jwt()->>'email'),'customer.account.updated',lower((SELECT email FROM auth.users WHERE id=p_user_id)),jsonb_build_object('user_id',p_user_id,'before',before_state,'after',jsonb_build_object('status',p_status,'customer_tier',p_customer_tier,'status_reason',clean_reason,'notes',clean_notes)));
END $function$;