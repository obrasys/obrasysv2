
-- ============================================================
-- AI Budget Insights system: 3 tables + RLS + triggers
-- ============================================================

-- 1. Company AI Settings (per user = per company)
CREATE TABLE public.company_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT 'PT',
  enabled BOOLEAN NOT NULL DEFAULT true,
  llm_enabled BOOLEAN NOT NULL DEFAULT false,
  min_margin_percent NUMERIC NOT NULL DEFAULT 15,
  outlier_zscore NUMERIC NOT NULL DEFAULT 2.5,
  param_profile_default TEXT NOT NULL DEFAULT 'med',
  ruleset JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai_settings"
  ON public.company_ai_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_company_ai_settings_updated_at
  BEFORE UPDATE ON public.company_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. AI Budget Insights
CREATE TABLE public.ai_budget_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  budget_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('missing_sections','missing_items','outlier_prices','low_margin','parametric_suggestion')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  impact_value NUMERIC,
  impact_percent NUMERIC,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','applied','dismissed')),
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_insights_budget ON public.ai_budget_insights(budget_id);
CREATE INDEX idx_ai_insights_status ON public.ai_budget_insights(budget_id, status);
CREATE UNIQUE INDEX idx_ai_insights_dedup ON public.ai_budget_insights(budget_id, type, content_hash) WHERE content_hash IS NOT NULL;

ALTER TABLE public.ai_budget_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insights"
  ON public.ai_budget_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_budget_insights_updated_at
  BEFORE UPDATE ON public.ai_budget_insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. AI Budget Actions Log (audit trail)
CREATE TABLE public.ai_budget_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  budget_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.ai_budget_insights(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('applied','dismissed','edited_then_applied')),
  before_snapshot JSONB,
  after_snapshot JSONB,
  actor_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_actions_budget ON public.ai_budget_actions_log(budget_id);

ALTER TABLE public.ai_budget_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own action logs"
  ON public.ai_budget_actions_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own action logs"
  ON public.ai_budget_actions_log FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = actor_user_id);

-- 4. Helper function: get price stats per category/unit from user's historical budgets
CREATE OR REPLACE FUNCTION public.get_price_stats(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS TABLE (
  categoria TEXT,
  unidade TEXT,
  avg_price NUMERIC,
  median_price NUMERIC,
  stddev_price NUMERIC,
  sample_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH prices AS (
    SELECT
      COALESCE(at2.categoria, 'Geral') AS cat,
      ao.unidade,
      ao.preco_unitario
    FROM artigos_orcamento ao
    JOIN capitulos_orcamento co ON co.id = ao.capitulo_id
    JOIN orcamentos o ON o.id = co.orcamento_id
    LEFT JOIN artigos_trabalho at2 ON at2.codigo = ao.codigo AND at2.user_id = p_user_id
    WHERE o.user_id = p_user_id
      AND o.created_at >= (now() - (p_months || ' months')::INTERVAL)
      AND ao.preco_unitario > 0
  )
  SELECT
    p.cat AS categoria,
    p.unidade,
    ROUND(AVG(p.preco_unitario), 2) AS avg_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.preco_unitario), 2) AS median_price,
    ROUND(COALESCE(STDDEV_POP(p.preco_unitario), 0), 2) AS stddev_price,
    COUNT(*) AS sample_count
  FROM prices p
  GROUP BY p.cat, p.unidade
  HAVING COUNT(*) >= 2;
END;
$$;
