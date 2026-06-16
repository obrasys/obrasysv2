-- 1. Add tracing columns to obra_purchases
ALTER TABLE public.obra_purchases
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_response_id uuid REFERENCES public.quote_responses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_obra_purchases_quote_response_id
  ON public.obra_purchases(quote_response_id);
CREATE INDEX IF NOT EXISTS idx_obra_purchases_fornecedor_id
  ON public.obra_purchases(fornecedor_id);

-- 2. Secure award action that also seeds the Forecast/EAC via obra_purchases
CREATE OR REPLACE FUNCTION public.award_direct_quote_response(p_response_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_id uuid;
  v_builder uuid;
  v_obra uuid;
  v_budget uuid;
  v_org uuid;
  v_fornecedor uuid;
  v_inserted int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT qr.id, qr.builder_user_id, qr.obra_id, qr.budget_id, qr.organization_id, qr.fornecedor_id
    INTO v_request_id, v_builder, v_obra, v_budget, v_org, v_fornecedor
  FROM public.quote_responses resp
  JOIN public.quote_requests qr ON qr.id = resp.quote_request_id
  WHERE resp.id = p_response_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Resposta não encontrada';
  END IF;
  IF v_builder <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para adjudicar este pedido';
  END IF;

  UPDATE public.quote_responses
     SET status = 'accepted', updated_at = now()
   WHERE id = p_response_id;

  UPDATE public.quote_requests
     SET status = 'closed', updated_at = now()
   WHERE id = v_request_id;

  -- Only seed purchases when an obra is linked
  IF v_obra IS NOT NULL THEN
    INSERT INTO public.obra_purchases (
      user_id, organization_id, obra_id, source_budget_id,
      supplier_id, fornecedor_id, quote_response_id,
      description, quantity, unit_price, total_amount, status, notes
    )
    SELECT
      auth.uid(), v_org, v_obra, v_budget,
      NULL, v_fornecedor, p_response_id,
      qri.item_name, qri.qty, qri.unit_price,
      qri.qty * qri.unit_price, 'registered',
      'Adjudicado via cotação direta'
    FROM public.quote_response_items qri
    WHERE qri.quote_response_id = p_response_id;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'response_id', p_response_id,
    'request_id', v_request_id,
    'obra_id', v_obra,
    'purchases_created', v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_direct_quote_response(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_direct_quote_response(uuid) TO authenticated;