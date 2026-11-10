CREATE TABLE public.review_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_approve boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.review_settings TO authenticated;
GRANT ALL ON public.review_settings TO service_role;
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review settings readable" ON public.review_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "review settings insert" ON public.review_settings FOR INSERT TO authenticated WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "review settings update" ON public.review_settings FOR UPDATE TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));
INSERT INTO public.review_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 80),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(comment) BETWEEN 3 AND 1500),
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_featured boolean NOT NULL DEFAULT false,
  admin_reply text CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 1500),
  admin_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_reviews_status_idx ON public.customer_reviews (status, created_at DESC);
GRANT SELECT, INSERT ON public.customer_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_reviews TO authenticated;
GRANT ALL ON public.customer_reviews TO service_role;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved reviews public" ON public.customer_reviews FOR SELECT TO anon, authenticated USING (status = 'approved' OR public.has_permission('slides.manage'));
CREATE POLICY "anyone submits review" ON public.customer_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "managers update reviews" ON public.customer_reviews FOR UPDATE TO authenticated USING (public.has_permission('slides.manage')) WITH CHECK (public.has_permission('slides.manage'));
CREATE POLICY "managers delete reviews" ON public.customer_reviews FOR DELETE TO authenticated USING (public.has_permission('slides.manage'));

CREATE OR REPLACE FUNCTION public.review_before_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.is_featured := false;
  NEW.admin_reply := NULL;
  NEW.admin_replied_at := NULL;
  NEW.created_at := now();
  NEW.status := CASE WHEN (SELECT auto_approve FROM public.review_settings WHERE id = 1) THEN 'approved' ELSE 'pending' END;
  IF (SELECT count(*) FROM public.customer_reviews WHERE created_at > now() - interval '1 minute') > 20 THEN
    RAISE EXCEPTION 'Too many reviews right now, try again shortly';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER customer_reviews_before_insert BEFORE INSERT ON public.customer_reviews FOR EACH ROW EXECUTE FUNCTION public.review_before_insert();

CREATE OR REPLACE FUNCTION public.review_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'average', coalesce(round(avg(rating)::numeric, 1), 0),
    'total', count(*),
    'dist', jsonb_build_array(count(*) FILTER (WHERE rating=1), count(*) FILTER (WHERE rating=2), count(*) FILTER (WHERE rating=3), count(*) FILTER (WHERE rating=4), count(*) FILTER (WHERE rating=5))
  ) FROM public.customer_reviews WHERE status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.review_stats() TO anon, authenticated;