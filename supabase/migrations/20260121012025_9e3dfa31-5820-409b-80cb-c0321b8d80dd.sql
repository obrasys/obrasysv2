-- 1. Proteger tabela price_sources - apenas utilizadores autenticados
ALTER TABLE public.price_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view price sources" ON public.price_sources;
CREATE POLICY "Authenticated users can view price sources"
ON public.price_sources
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. Proteger tabela subscription_plans - apenas utilizadores autenticados
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. Proteger tabela parametric_rules - apenas utilizadores autenticados
ALTER TABLE public.parametric_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view parametric rules" ON public.parametric_rules;
CREATE POLICY "Authenticated users can view parametric rules"
ON public.parametric_rules
FOR SELECT
USING (auth.uid() IS NOT NULL);