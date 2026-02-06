
-- =====================================================
-- CORREÇÃO FINAL DE VAZAMENTO DE DADOS - Remover políticas públicas
-- =====================================================

-- 1. MATERIALS - Remover políticas públicas antigas
DROP POLICY IF EXISTS "Materials catalog is publicly readable" ON public.materials;
DROP POLICY IF EXISTS "Materiais são públicos para leitura" ON public.materials;

-- Criar/substituir por política segura
DROP POLICY IF EXISTS "Authenticated users can view materials catalog" ON public.materials;
CREATE POLICY "Authenticated users can view materials catalog"
ON public.materials FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. MATERIAL_CATEGORIES - Remover políticas públicas antigas
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.material_categories;
DROP POLICY IF EXISTS "Categorias são públicas para leitura" ON public.material_categories;

DROP POLICY IF EXISTS "Authenticated users can view material categories" ON public.material_categories;
CREATE POLICY "Authenticated users can view material categories"
ON public.material_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. MATERIAL_PRICE_REFERENCE - Remover políticas públicas antigas
DROP POLICY IF EXISTS "Reference prices are publicly readable" ON public.material_price_reference;
DROP POLICY IF EXISTS "Preços de referência visíveis para autenticados" ON public.material_price_reference;

DROP POLICY IF EXISTS "Authenticated users can view price references" ON public.material_price_reference;
CREATE POLICY "Authenticated users can view price references"
ON public.material_price_reference FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. REGIONS - Remover políticas públicas antigas
DROP POLICY IF EXISTS "Regions são públicas para leitura" ON public.regions;

DROP POLICY IF EXISTS "Authenticated users can view regions" ON public.regions;
CREATE POLICY "Authenticated users can view regions"
ON public.regions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. PRICE_SOURCES - Remover política pública antiga (já existe uma segura)
DROP POLICY IF EXISTS "Fontes são públicas para leitura" ON public.price_sources;
-- A política "Authenticated users can view price sources" já existe e está correta

-- 6. DEFAULT_ARTICLES - Substituir política pública
DROP POLICY IF EXISTS "Authenticated users can view default_articles" ON public.default_articles;
CREATE POLICY "Authenticated users can view default_articles"
ON public.default_articles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 7. SUBSCRIPTION_PLANS - Remover política que não exige autenticação
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
-- A política "Authenticated users can view subscription plans" já existe
