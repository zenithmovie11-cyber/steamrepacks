DROP POLICY IF EXISTS "anyone submits review" ON public.customer_reviews;
CREATE POLICY "anyone submits review" ON public.customer_reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    is_featured = false
    AND admin_reply IS NULL
    AND admin_replied_at IS NULL
    AND status IN ('pending', 'approved')
    AND rating BETWEEN 1 AND 5
    AND char_length(btrim(customer_name)) BETWEEN 1 AND 80
    AND char_length(btrim(comment)) BETWEEN 3 AND 1500
  );

DROP POLICY IF EXISTS "review settings readable" ON public.review_settings;
CREATE POLICY "review settings readable" ON public.review_settings
  FOR SELECT TO authenticated
  USING (id = 1 AND public.has_permission('slides.manage'));
REVOKE SELECT ON public.review_settings FROM anon;