CREATE TABLE public.base_artigos_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  capitulo TEXT NOT NULL,
  subcapitulo TEXT,
  artigo TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  mao_obra_estimada_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  material_estimado_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_direto_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  margem_configuravel_pct NUMERIC(5,2) NOT NULL DEFAULT 25,
  preco_indicativo_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  fonte_base TEXT,
  data_atualizacao DATE DEFAULT CURRENT_DATE,
  edicao_livre BOOLEAN NOT NULL DEFAULT true,
  estado TEXT DEFAULT 'Provisório',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_base_artigos_global_capitulo ON public.base_artigos_global(capitulo);
ALTER TABLE public.base_artigos_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view global artigos"
ON public.base_artigos_global FOR SELECT TO authenticated
USING (ativo = true OR public.is_super_admin());

CREATE POLICY "Super admins insert global artigos"
ON public.base_artigos_global FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins update global artigos"
ON public.base_artigos_global FOR UPDATE TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins delete global artigos"
ON public.base_artigos_global FOR DELETE TO authenticated
USING (public.is_super_admin());

CREATE TRIGGER update_base_artigos_global_updated_at
BEFORE UPDATE ON public.base_artigos_global
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.base_artigos_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  global_artigo_id UUID REFERENCES public.base_artigos_global(id) ON DELETE SET NULL,
  origem TEXT NOT NULL DEFAULT 'manual',
  codigo TEXT NOT NULL,
  capitulo TEXT NOT NULL,
  subcapitulo TEXT,
  artigo TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  mao_obra_estimada_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  material_estimado_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_direto_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  margem_configuravel_pct NUMERIC(5,2) NOT NULL DEFAULT 25,
  preco_indicativo_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  fonte_base TEXT,
  data_atualizacao DATE DEFAULT CURRENT_DATE,
  estado TEXT DEFAULT 'Provisório',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, codigo)
);
CREATE INDEX idx_base_artigos_user_org ON public.base_artigos_user(organization_id);
CREATE INDEX idx_base_artigos_user_capitulo ON public.base_artigos_user(capitulo);
ALTER TABLE public.base_artigos_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view artigos"
ON public.base_artigos_user FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members insert artigos"
ON public.base_artigos_user FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND user_id = auth.uid()
);

CREATE POLICY "Org members update artigos"
ON public.base_artigos_user FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members delete artigos"
ON public.base_artigos_user FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id());

CREATE TRIGGER update_base_artigos_user_updated_at
BEFORE UPDATE ON public.base_artigos_user
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();