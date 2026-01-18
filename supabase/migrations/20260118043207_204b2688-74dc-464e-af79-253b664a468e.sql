-- =============================================
-- MÓDULO BASE DE PREÇOS - TABELAS E CONFIGURAÇÃO
-- =============================================

-- 1. TABELA: regions - Regiões geográficas
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. TABELA: material_categories - Categorias de materiais
CREATE TABLE public.material_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'Package',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. TABELA: materials - Catálogo de materiais
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.material_categories(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade_base TEXT NOT NULL,
  unidades_alternativas JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. TABELA: price_sources - Fontes de preços
CREATE TABLE public.price_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fornecedor', 'obra', 'admin', 'api')),
  base_weight DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (base_weight >= 0.5 AND base_weight <= 1.5),
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. TABELA: material_price_raw - Preços brutos (INPUT)
CREATE TABLE public.material_price_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  source_id UUID NOT NULL REFERENCES public.price_sources(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  preco DECIMAL(12,4) NOT NULL CHECK (preco > 0),
  unidade_original TEXT NOT NULL,
  preco_normalizado DECIMAL(12,4) CHECK (preco_normalizado > 0),
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'penalized')),
  motivo_rejeicao TEXT,
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. TABELA: material_price_reference - Preços de referência (OUTPUT - READ ONLY)
CREATE TABLE public.material_price_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  preco_medio DECIMAL(12,4) NOT NULL CHECK (preco_medio > 0),
  preco_p10 DECIMAL(12,4) CHECK (preco_p10 > 0),
  preco_p50 DECIMAL(12,4) CHECK (preco_p50 > 0),
  preco_p90 DECIMAL(12,4) CHECK (preco_p90 > 0),
  sample_size INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  ultima_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(material_id, region_id)
);

-- 7. TABELA: price_audit_log - Log de auditoria
CREATE TABLE public.price_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  acao TEXT NOT NULL CHECK (acao IN ('recalculated', 'price_accepted', 'price_rejected', 'price_penalized', 'price_inserted')),
  detalhes JSONB DEFAULT '{}'::jsonb,
  executado_por TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_materials_category ON public.materials(category_id);
CREATE INDEX idx_materials_ativo ON public.materials(ativo);
CREATE INDEX idx_material_price_raw_material ON public.material_price_raw(material_id);
CREATE INDEX idx_material_price_raw_region ON public.material_price_raw(region_id);
CREATE INDEX idx_material_price_raw_status ON public.material_price_raw(status);
CREATE INDEX idx_material_price_raw_created ON public.material_price_raw(created_at);
CREATE INDEX idx_material_price_reference_material ON public.material_price_reference(material_id);
CREATE INDEX idx_material_price_reference_region ON public.material_price_reference(region_id);
CREATE INDEX idx_price_audit_log_material ON public.price_audit_log(material_id);
CREATE INDEX idx_price_audit_log_created ON public.price_audit_log(created_at);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_material_categories_updated_at BEFORE UPDATE ON public.material_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_sources_updated_at BEFORE UPDATE ON public.price_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_material_price_raw_updated_at BEFORE UPDATE ON public.material_price_raw FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_material_price_reference_updated_at BEFORE UPDATE ON public.material_price_reference FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_audit_log ENABLE ROW LEVEL SECURITY;

-- Regions: Todos podem ler
CREATE POLICY "Regions são públicas para leitura" ON public.regions FOR SELECT USING (true);

-- Material Categories: Todos podem ler
CREATE POLICY "Categorias são públicas para leitura" ON public.material_categories FOR SELECT USING (true);

-- Materials: Todos podem ler
CREATE POLICY "Materiais são públicos para leitura" ON public.materials FOR SELECT USING (true);

-- Price Sources: Todos podem ler
CREATE POLICY "Fontes são públicas para leitura" ON public.price_sources FOR SELECT USING (true);

-- Material Price Reference: Todos autenticados podem ler
CREATE POLICY "Preços de referência visíveis para autenticados" ON public.material_price_reference FOR SELECT TO authenticated USING (true);

-- Material Price Raw: Autenticados podem inserir, apenas admins podem ver todos
CREATE POLICY "Utilizadores podem inserir preços brutos" ON public.material_price_raw FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utilizadores veem seus próprios preços" ON public.material_price_raw FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Price Audit Log: Apenas admins podem ver
CREATE POLICY "Apenas admins veem auditoria" ON public.price_audit_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Service role pode fazer tudo (para o job automático)
CREATE POLICY "Service role full access regions" ON public.regions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access categories" ON public.material_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access materials" ON public.materials FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access sources" ON public.price_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access raw" ON public.material_price_raw FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reference" ON public.material_price_reference FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access audit" ON public.price_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- DADOS INICIAIS (SEED)
-- =============================================

-- Regiões de Portugal
INSERT INTO public.regions (nome, codigo) VALUES
  ('Lisboa', 'LIS'),
  ('Porto', 'PRT'),
  ('Centro', 'CTR'),
  ('Algarve', 'ALG'),
  ('Norte', 'NRT'),
  ('Alentejo', 'ALT'),
  ('Madeira', 'MAD'),
  ('Açores', 'ACR');

-- Categorias de Materiais
INSERT INTO public.material_categories (nome, descricao, icone, ordem) VALUES
  ('Cimentos e Argamassas', 'Cimentos, argamassas, betões e ligantes', 'Cylinder', 1),
  ('Aços e Metais', 'Aços estruturais, armaduras e metais diversos', 'Wrench', 2),
  ('Madeiras', 'Madeiras para construção e carpintaria', 'TreePine', 3),
  ('Cerâmicas e Revestimentos', 'Azulejos, mosaicos e revestimentos cerâmicos', 'Grid3x3', 4),
  ('Isolamentos', 'Isolamentos térmicos e acústicos', 'Layers', 5),
  ('Tubagens e Canalizações', 'Tubos, acessórios e materiais hidráulicos', 'Pipette', 6),
  ('Tintas e Vernizes', 'Tintas, vernizes e produtos de acabamento', 'Paintbrush', 7),
  ('Pedras e Agregados', 'Pedras naturais, areias e britas', 'Mountain', 8),
  ('Impermeabilizantes', 'Telas, membranas e produtos impermeabilizantes', 'Droplets', 9),
  ('Materiais Elétricos', 'Cabos, quadros e materiais elétricos', 'Zap', 10);

-- Fontes de Preços
INSERT INTO public.price_sources (nome, tipo, base_weight) VALUES
  ('Fornecedor Direto', 'fornecedor', 1.20),
  ('Registo de Obra', 'obra', 1.00),
  ('Administrador', 'admin', 1.50),
  ('API Externa', 'api', 0.80);

-- Materiais de Exemplo (seleção representativa)
INSERT INTO public.materials (category_id, codigo, nome, descricao, unidade_base) VALUES
  -- Cimentos
  ((SELECT id FROM public.material_categories WHERE nome = 'Cimentos e Argamassas'), 'CIM001', 'Cimento Portland CEM II/A-L 42.5R', 'Cimento Portland composto com calcário', 'kg'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Cimentos e Argamassas'), 'CIM002', 'Argamassa de Reboco Pronta', 'Argamassa seca pronta a aplicar', 'kg'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Cimentos e Argamassas'), 'CIM003', 'Betão Pronto C25/30', 'Betão pronto classe C25/30', 'm³'),
  -- Aços
  ((SELECT id FROM public.material_categories WHERE nome = 'Aços e Metais'), 'ACO001', 'Varão Aço A500 NR SD Ø8', 'Varão nervurado para betão armado', 'kg'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Aços e Metais'), 'ACO002', 'Varão Aço A500 NR SD Ø12', 'Varão nervurado para betão armado', 'kg'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Aços e Metais'), 'ACO003', 'Malhasol CQ38', 'Malha eletrossoldada', 'm²'),
  -- Madeiras
  ((SELECT id FROM public.material_categories WHERE nome = 'Madeiras'), 'MAD001', 'Tábua Pinho Tratado 22mm', 'Madeira tratada para cofragem', 'm²'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Madeiras'), 'MAD002', 'Barrote Pinho 7x7cm', 'Barrote para estruturas', 'ml'),
  -- Cerâmicas
  ((SELECT id FROM public.material_categories WHERE nome = 'Cerâmicas e Revestimentos'), 'CER001', 'Tijolo Cerâmico 30x20x15', 'Tijolo cerâmico furado', 'un'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Cerâmicas e Revestimentos'), 'CER002', 'Azulejo Branco 20x20', 'Azulejo cerâmico branco brilhante', 'm²'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Cerâmicas e Revestimentos'), 'CER003', 'Mosaico Porcelânico 60x60', 'Pavimento porcelânico polido', 'm²'),
  -- Isolamentos
  ((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos'), 'ISO001', 'Lã de Rocha 40mm', 'Painel de lã de rocha 40mm', 'm²'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos'), 'ISO002', 'XPS Extrudido 40mm', 'Poliestireno extrudido 40mm', 'm²'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos'), 'ISO003', 'EPS Expandido 30mm', 'Poliestireno expandido 30mm', 'm²'),
  -- Tubagens
  ((SELECT id FROM public.material_categories WHERE nome = 'Tubagens e Canalizações'), 'TUB001', 'Tubo PVC 110mm', 'Tubo PVC esgoto Ø110', 'ml'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Tubagens e Canalizações'), 'TUB002', 'Tubo PPR Ø20mm', 'Tubo PPR água quente/fria', 'ml'),
  -- Tintas
  ((SELECT id FROM public.material_categories WHERE nome = 'Tintas e Vernizes'), 'TIN001', 'Tinta Plástica Interior Branco', 'Tinta plástica para interiores', 'l'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Tintas e Vernizes'), 'TIN002', 'Primário Acrílico', 'Primário para superfícies novas', 'l'),
  -- Pedras
  ((SELECT id FROM public.material_categories WHERE nome = 'Pedras e Agregados'), 'PED001', 'Areia Média Lavada', 'Areia para argamassas', 'm³'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Pedras e Agregados'), 'PED002', 'Brita 1 (9,5-19mm)', 'Agregado grosso para betão', 'm³'),
  -- Impermeabilizantes
  ((SELECT id FROM public.material_categories WHERE nome = 'Impermeabilizantes'), 'IMP001', 'Tela Asfáltica APP 4kg', 'Tela betuminosa para coberturas', 'm²'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Impermeabilizantes'), 'IMP002', 'Membrana Líquida', 'Impermeabilizante líquido bicomponente', 'kg'),
  -- Elétricos
  ((SELECT id FROM public.material_categories WHERE nome = 'Materiais Elétricos'), 'ELE001', 'Cabo H07V-U 2.5mm²', 'Cabo unipolar rígido', 'ml'),
  ((SELECT id FROM public.material_categories WHERE nome = 'Materiais Elétricos'), 'ELE002', 'Tubo VD 20mm', 'Tubo corrugado para encastrar', 'ml');