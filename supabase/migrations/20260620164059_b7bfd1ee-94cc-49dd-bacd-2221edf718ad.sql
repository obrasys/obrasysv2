
-- Restrict direct SELECT on supplier_reviews to only the reviewer themselves.
DROP POLICY IF EXISTS reviews_select_authenticated ON public.supplier_reviews;

CREATE POLICY reviews_select_own
  ON public.supplier_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- Public view that excludes reviewer_id so suppliers/builders can read aggregated review info
-- without ever learning which user submitted each review.
DROP VIEW IF EXISTS public.supplier_reviews_public;
CREATE VIEW public.supplier_reviews_public
WITH (security_invoker = on) AS
SELECT
  id,
  supplier_id,
  quote_request_id,
  rating,
  comment,
  created_at,
  updated_at
FROM public.supplier_reviews;

GRANT SELECT ON public.supplier_reviews_public TO authenticated, anon;
