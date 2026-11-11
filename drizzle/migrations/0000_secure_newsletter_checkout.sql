ALTER TABLE public.newsletter_reward ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0 AND discount_amount <= 1000000), ADD COLUMN expires_at timestamptz;
ALTER TABLE public.orders ADD COLUMN coupon_code text, ADD COLUMN subtotal numeric NOT NULL DEFAULT 0, ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.checkout_quote(p_post_ids uuid[], p_coupon text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; sub numeric; off numeric:=0; code text:=upper(trim(coalesce(p_coupon,''))); reward public.newsletter_reward; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to checkout'; END IF;
n:=cardinality(p_post_ids); IF n IS NULL OR n<1 OR n>100 OR n<>(SELECT count(DISTINCT x) FROM unnest(p_post_ids) x) THEN RAISE EXCEPTION 'Invalid cart'; END IF;
IF n<>(SELECT count(*) FROM public.posts WHERE id=ANY(p_post_ids) AND is_paid) THEN RAISE EXCEPTION 'Some items are unavailable'; END IF;
WITH base AS (SELECT id,CASE WHEN regexp_replace(coalesce(price,''),'[^0-9.]','','g') ~ '^[0-9]+(\.[0-9]+)?$' THEN regexp_replace(price,'[^0-9.]','','g')::numeric ELSE NULL END AS price FROM public.posts WHERE id=ANY(p_post_ids)), prices AS (SELECT b.id,b.price,least(b.price,coalesce((SELECT min(greatest(0,round(b.price-CASE WHEN o.discount_type='percentage' THEN b.price*o.discount_value/100 ELSE o.discount_value END,2))) FROM public.special_offers o WHERE o.is_active AND (o.starts_at IS NULL OR o.starts_at<=now()) AND (o.ends_at IS NULL OR o.ends_at>now()) AND (cardinality(o.post_ids)=0 OR b.id=ANY(o.post_ids))),b.price)) AS final FROM base b) SELECT CASE WHEN count(price)=n THEN sum(final) ELSE NULL END INTO sub FROM prices;
IF sub IS NULL OR sub<0 THEN RAISE EXCEPTION 'An item has an invalid price'; END IF;
IF code<>'' THEN
SELECT * INTO reward FROM public.newsletter_reward WHERE id=1;
IF reward.id IS NULL OR upper(reward.coupon_code)<>code OR reward.discount_amount<=0 OR (reward.expires_at IS NOT NULL AND reward.expires_at<=now()) THEN RAISE EXCEPTION 'Coupon is invalid or expired'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.newsletter_subscribers WHERE email=lower(auth.jwt()->>'email') AND status='active') THEN RAISE EXCEPTION 'Subscribe with your signed-in email to use this coupon'; END IF;
off:=least(sub,reward.discount_amount);
END IF;
RETURN jsonb_build_object('subtotal',round(sub,2),'discount',round(off,2),'total',round(sub-off,2),'coupon',nullif(code,'')); END $$;
REVOKE ALL ON FUNCTION public.checkout_quote(uuid[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.checkout_quote(uuid[],text) TO authenticated;
CREATE OR REPLACE FUNCTION public.order_secure_totals() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q jsonb; BEGIN
IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sign in to place an order'; END IF;
IF length(trim(NEW.full_name)) NOT BETWEEN 1 AND 100 OR length(trim(NEW.address)) NOT BETWEEN 1 AND 300 OR length(trim(NEW.city)) NOT BETWEEN 1 AND 100 OR NEW.phone !~ '^01[3-9][0-9]{8}$' OR NEW.bkash_number !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid buyer information'; END IF;
NEW.email:=lower(auth.jwt()->>'email'); NEW.status:='pending'; NEW.payment_ref:=NULL;
q:=public.checkout_quote(NEW.post_ids,NEW.coupon_code); NEW.subtotal:=(q->>'subtotal')::numeric; NEW.discount_amount:=(q->>'discount')::numeric; NEW.total:=(q->>'total')::numeric; NEW.coupon_code:=q->>'coupon'; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.order_secure_totals() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER order_secure_totals BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_secure_totals();