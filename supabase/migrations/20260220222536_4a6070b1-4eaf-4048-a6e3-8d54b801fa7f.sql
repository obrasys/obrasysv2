
-- ============================================================
-- Supplier Reviews: table + trigger to sync rating on supplier_profiles
-- ============================================================

CREATE TABLE public.supplier_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL,           -- builder's auth.uid()
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  rating        SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, reviewer_id)      -- one review per builder per supplier
);

-- Enable RLS
ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

-- Builders can read all reviews (for context / transparency)
CREATE POLICY "reviews_select_authenticated"
  ON public.supplier_reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Builders can insert their own reviews
CREATE POLICY "reviews_insert_own"
  ON public.supplier_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Builders can update only their own reviews
CREATE POLICY "reviews_update_own"
  ON public.supplier_reviews FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Builders can delete their own reviews
CREATE POLICY "reviews_delete_own"
  ON public.supplier_reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

-- updated_at trigger
CREATE TRIGGER supplier_reviews_updated_at
  BEFORE UPDATE ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Function: recalculate and sync rating_avg + rating_count ──────────────────
CREATE OR REPLACE FUNCTION public.sync_supplier_rating()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_id UUID;
  v_avg         NUMERIC;
  v_count       INTEGER;
BEGIN
  -- Determine which supplier to recalculate for
  IF TG_OP = 'DELETE' THEN
    v_supplier_id := OLD.supplier_id;
  ELSE
    v_supplier_id := NEW.supplier_id;
  END IF;

  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)::INTEGER
  INTO v_avg, v_count
  FROM public.supplier_reviews
  WHERE supplier_id = v_supplier_id;

  UPDATE public.supplier_profiles
  SET
    rating_avg   = COALESCE(v_avg, 0),
    rating_count = COALESCE(v_count, 0),
    updated_at   = now()
  WHERE id = v_supplier_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger fires after any INSERT / UPDATE / DELETE on supplier_reviews
CREATE TRIGGER trg_sync_supplier_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_rating();
