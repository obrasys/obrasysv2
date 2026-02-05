-- =============================================
-- MOTOR FISCAL PORTUGAL - MODELO DE DADOS
-- =============================================

-- Enum para tipos de regime fiscal
CREATE TYPE public.regime_fiscal_tipo AS ENUM (
  'normal',           -- IVA Normal 23%
  'reduzido',         -- IVA Reduzido 6%
  'autoliquidacao',   -- Autoliquidação (IVA 0%, cliente liquida)
  'isento'            -- Isento de IVA
);

-- Enum para tipo de operação
CREATE TYPE public.tipo_operacao_fiscal AS ENUM (
  'empreitada',       -- Empreitada de construção
  'subempreitada',    -- Subempreitada
  'servicos',         -- Prestação de serviços
  'materiais',        -- Fornecimento de materiais
  'mao_obra'          -- Apenas mão de obra
);

-- Enum para tipo de cliente fiscal
CREATE TYPE public.tipo_cliente_fiscal AS ENUM (
  'particular',       -- Cliente particular (pessoa singular)
  'empresa',          -- Empresa (pessoa coletiva)
  'construtor',       -- Construtor com alvará
  'entidade_publica'  -- Entidade pública
);

-- Enum para tipo de obra fiscal
CREATE TYPE public.tipo_obra_fiscal AS ENUM (
  'construcao_nova',          -- Construção nova
  'reabilitacao_urbana',      -- Reabilitação urbana (zona ARU)
  'renovacao_habitacao',      -- Renovação/remodelação habitação
  'manutencao',               -- Manutenção e reparação
  'obra_publica'              -- Obra pública
);

-- =============================================
-- TABELA: Regimes Fiscais
-- =============================================
CREATE TABLE public.regimes_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo regime_fiscal_tipo NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.regimes_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Leitura pública para autenticados
CREATE POLICY "Regimes fiscais são públicos para leitura"
ON public.regimes_fiscais FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =============================================
-- TABELA: Taxas de IVA
-- =============================================
CREATE TABLE public.taxas_iva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime_id UUID NOT NULL REFERENCES public.regimes_fiscais(id) ON DELETE RESTRICT,
  percentagem NUMERIC(5,2) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT taxas_iva_percentagem_check CHECK (percentagem >= 0 AND percentagem <= 100)
);

-- Habilitar RLS
ALTER TABLE public.taxas_iva ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Taxas IVA são públicas para leitura"
ON public.taxas_iva FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =============================================
-- TABELA: Regras Fiscais
-- =============================================
CREATE TABLE public.regras_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  -- Condições de aplicação
  tipo_obra tipo_obra_fiscal,
  tipo_cliente tipo_cliente_fiscal,
  tipo_operacao tipo_operacao_fiscal,
  -- Resultado
  regime_id UUID NOT NULL REFERENCES public.regimes_fiscais(id) ON DELETE RESTRICT,
  -- Prioridade (menor = maior prioridade)
  prioridade INTEGER NOT NULL DEFAULT 100,
  -- Validade
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  -- Metadados
  referencia_legal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.regras_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Regras fiscais são públicas para leitura"
ON public.regras_fiscais FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =============================================
-- TABELA: Notas Legais Fiscais
-- =============================================
CREATE TABLE public.notas_legais_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime_id UUID NOT NULL REFERENCES public.regimes_fiscais(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  texto_curto TEXT,
  referencia_legal TEXT,
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notas_legais_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Notas legais são públicas para leitura"
ON public.notas_legais_fiscais FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =============================================
-- TABELA: Contexto Fiscal do Orçamento
-- =============================================
CREATE TABLE public.orcamento_contexto_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE UNIQUE,
  tipo_obra tipo_obra_fiscal,
  tipo_cliente tipo_cliente_fiscal,
  tipo_operacao tipo_operacao_fiscal,
  -- Regime determinado automaticamente ou override
  regime_id UUID REFERENCES public.regimes_fiscais(id),
  regra_aplicada_id UUID REFERENCES public.regras_fiscais(id),
  taxa_iva NUMERIC(5,2) NOT NULL DEFAULT 23,
  -- Override manual
  override_manual BOOLEAN NOT NULL DEFAULT false,
  override_justificacao TEXT,
  override_por UUID REFERENCES auth.users(id),
  override_em TIMESTAMP WITH TIME ZONE,
  -- Metadados
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.orcamento_contexto_fiscal ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own orcamento fiscal context"
ON public.orcamento_contexto_fiscal FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orcamento fiscal context"
ON public.orcamento_contexto_fiscal FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orcamento fiscal context"
ON public.orcamento_contexto_fiscal FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orcamento fiscal context"
ON public.orcamento_contexto_fiscal FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- TABELA: Auditoria Fiscal
-- =============================================
CREATE TABLE public.auditoria_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entidade_tipo TEXT NOT NULL, -- 'orcamento', 'auto_medicao', 'conta_financeira'
  entidade_id UUID NOT NULL,
  acao TEXT NOT NULL, -- 'calculo_automatico', 'override_manual', 'alteracao_regime'
  dados_anteriores JSONB,
  dados_novos JSONB,
  regime_anterior_id UUID REFERENCES public.regimes_fiscais(id),
  regime_novo_id UUID REFERENCES public.regimes_fiscais(id),
  taxa_anterior NUMERIC(5,2),
  taxa_nova NUMERIC(5,2),
  justificacao TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.auditoria_fiscal ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own fiscal audit logs"
ON public.auditoria_fiscal FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create fiscal audit logs"
ON public.auditoria_fiscal FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- DADOS INICIAIS: Regimes Fiscais PT
-- =============================================
INSERT INTO public.regimes_fiscais (codigo, nome, tipo, descricao) VALUES
('NORMAL', 'IVA Normal', 'normal', 'Taxa normal de IVA aplicável à generalidade das operações'),
('REDUZIDO', 'IVA Reduzido', 'reduzido', 'Taxa reduzida de IVA para obras de reabilitação urbana e renovação de habitações'),
('AUTOLIQ', 'Autoliquidação', 'autoliquidacao', 'Regime de inversão do sujeito passivo - IVA liquidado pelo adquirente'),
('ISENTO', 'Isento de IVA', 'isento', 'Operações isentas de IVA');

-- =============================================
-- DADOS INICIAIS: Taxas de IVA atuais
-- =============================================
INSERT INTO public.taxas_iva (regime_id, percentagem, data_inicio) 
SELECT id, 23, '2011-01-01' FROM public.regimes_fiscais WHERE codigo = 'NORMAL';

INSERT INTO public.taxas_iva (regime_id, percentagem, data_inicio) 
SELECT id, 6, '2011-01-01' FROM public.regimes_fiscais WHERE codigo = 'REDUZIDO';

INSERT INTO public.taxas_iva (regime_id, percentagem, data_inicio) 
SELECT id, 0, '2007-01-01' FROM public.regimes_fiscais WHERE codigo = 'AUTOLIQ';

INSERT INTO public.taxas_iva (regime_id, percentagem, data_inicio) 
SELECT id, 0, '2000-01-01' FROM public.regimes_fiscais WHERE codigo = 'ISENTO';

-- =============================================
-- DADOS INICIAIS: Regras Fiscais PT
-- =============================================

-- Regra: Autoliquidação em subempreitadas
INSERT INTO public.regras_fiscais (codigo, nome, descricao, tipo_operacao, tipo_cliente, regime_id, prioridade, referencia_legal)
SELECT 
  'SUBEMPREITADA_CONSTRUTOR',
  'Subempreitada para Construtor',
  'Autoliquidação aplicável a serviços de construção prestados a construtores com alvará',
  'subempreitada',
  'construtor',
  id,
  10,
  'Art. 2º, n.º 1, alínea j) do CIVA'
FROM public.regimes_fiscais WHERE codigo = 'AUTOLIQ';

-- Regra: IVA Reduzido em reabilitação urbana
INSERT INTO public.regras_fiscais (codigo, nome, descricao, tipo_obra, regime_id, prioridade, referencia_legal)
SELECT 
  'REABILITACAO_URBANA',
  'Reabilitação Urbana (ARU)',
  'Taxa reduzida para empreitadas de reabilitação em áreas de reabilitação urbana',
  'reabilitacao_urbana',
  id,
  20,
  'Verba 2.23 da Lista I anexa ao CIVA'
FROM public.regimes_fiscais WHERE codigo = 'REDUZIDO';

-- Regra: IVA Reduzido em renovação de habitação
INSERT INTO public.regras_fiscais (codigo, nome, descricao, tipo_obra, tipo_cliente, regime_id, prioridade, referencia_legal)
SELECT 
  'RENOVACAO_HABITACAO_PARTICULAR',
  'Renovação Habitação Particular',
  'Taxa reduzida para empreitadas de remodelação, renovação e reparação de habitações a particulares',
  'renovacao_habitacao',
  'particular',
  id,
  25,
  'Verba 2.27 da Lista I anexa ao CIVA'
FROM public.regimes_fiscais WHERE codigo = 'REDUZIDO';

-- Regra: IVA Normal para construção nova
INSERT INTO public.regras_fiscais (codigo, nome, descricao, tipo_obra, regime_id, prioridade, referencia_legal)
SELECT 
  'CONSTRUCAO_NOVA_NORMAL',
  'Construção Nova',
  'Taxa normal aplicável a construção nova',
  'construcao_nova',
  id,
  50,
  'Art. 18º, n.º 1, alínea c) do CIVA'
FROM public.regimes_fiscais WHERE codigo = 'NORMAL';

-- Regra: Autoliquidação para entidades públicas (obras públicas)
INSERT INTO public.regras_fiscais (codigo, nome, descricao, tipo_cliente, tipo_obra, regime_id, prioridade, referencia_legal)
SELECT 
  'OBRA_PUBLICA_AUTOLIQ',
  'Obra Pública - Autoliquidação',
  'Autoliquidação aplicável a obras públicas quando contratante é entidade pública',
  'entidade_publica',
  'obra_publica',
  id,
  15,
  'Art. 2º, n.º 1, alínea j) do CIVA'
FROM public.regimes_fiscais WHERE codigo = 'AUTOLIQ';

-- Regra Default: IVA Normal
INSERT INTO public.regras_fiscais (codigo, nome, descricao, regime_id, prioridade, referencia_legal)
SELECT 
  'DEFAULT_NORMAL',
  'Regime Normal (Default)',
  'Regime normal aplicável quando nenhuma outra regra específica se aplica',
  id,
  999,
  'Art. 18º, n.º 1, alínea c) do CIVA'
FROM public.regimes_fiscais WHERE codigo = 'NORMAL';

-- =============================================
-- DADOS INICIAIS: Notas Legais Fiscais
-- =============================================

-- Nota: Autoliquidação
INSERT INTO public.notas_legais_fiscais (regime_id, codigo, texto, texto_curto, referencia_legal, ordem)
SELECT 
  id,
  'AUTOLIQ_NOTA',
  'IVA devido pelo adquirente nos termos do art. 2º, n.º 1, alínea j) do Código do IVA. O adquirente é responsável pela liquidação e pagamento do imposto.',
  'IVA - Autoliquidação (art. 2º/1/j CIVA)',
  'Art. 2º, n.º 1, alínea j) do CIVA',
  1
FROM public.regimes_fiscais WHERE codigo = 'AUTOLIQ';

-- Nota: IVA Reduzido Reabilitação
INSERT INTO public.notas_legais_fiscais (regime_id, codigo, texto, texto_curto, referencia_legal, ordem)
SELECT 
  id,
  'REDUZIDO_REAB_NOTA',
  'IVA à taxa reduzida nos termos da verba 2.23 da Lista I anexa ao Código do IVA, aplicável a empreitadas de reabilitação de imóveis em áreas de reabilitação urbana.',
  'IVA Reduzido - Reabilitação Urbana (verba 2.23 Lista I CIVA)',
  'Verba 2.23 da Lista I anexa ao CIVA',
  1
FROM public.regimes_fiscais WHERE codigo = 'REDUZIDO';

-- Nota: IVA Reduzido Renovação Habitação
INSERT INTO public.notas_legais_fiscais (regime_id, codigo, texto, texto_curto, referencia_legal, ordem)
SELECT 
  id,
  'REDUZIDO_RENOV_NOTA',
  'IVA à taxa reduzida nos termos da verba 2.27 da Lista I anexa ao Código do IVA, aplicável a empreitadas de remodelação, renovação, restauro, reparação ou conservação de imóveis.',
  'IVA Reduzido - Renovação Habitação (verba 2.27 Lista I CIVA)',
  'Verba 2.27 da Lista I anexa ao CIVA',
  2
FROM public.regimes_fiscais WHERE codigo = 'REDUZIDO';

-- Nota: IVA Normal
INSERT INTO public.notas_legais_fiscais (regime_id, codigo, texto, texto_curto, referencia_legal, ordem)
SELECT 
  id,
  'NORMAL_NOTA',
  'IVA à taxa normal nos termos do art. 18º, n.º 1, alínea c) do Código do IVA.',
  'IVA à taxa normal (art. 18º/1/c CIVA)',
  'Art. 18º, n.º 1, alínea c) do CIVA',
  1
FROM public.regimes_fiscais WHERE codigo = 'NORMAL';

-- =============================================
-- FUNÇÃO: Determinar Regime Fiscal
-- =============================================
CREATE OR REPLACE FUNCTION public.determinar_regime_fiscal(
  p_tipo_obra tipo_obra_fiscal DEFAULT NULL,
  p_tipo_cliente tipo_cliente_fiscal DEFAULT NULL,
  p_tipo_operacao tipo_operacao_fiscal DEFAULT NULL,
  p_data_referencia DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  regime_id UUID,
  regime_codigo TEXT,
  regime_nome TEXT,
  taxa_iva NUMERIC,
  regra_id UUID,
  regra_codigo TEXT,
  nota_legal TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regra RECORD;
  v_regime RECORD;
  v_taxa NUMERIC;
  v_nota TEXT;
BEGIN
  -- Encontrar a regra com maior prioridade (menor número)
  SELECT rf.*, rg.codigo as regime_codigo, rg.nome as regime_nome, rg.tipo as regime_tipo
  INTO v_regra
  FROM public.regras_fiscais rf
  JOIN public.regimes_fiscais rg ON rg.id = rf.regime_id
  WHERE rf.ativo = true
    AND rg.ativo = true
    AND rf.data_inicio <= p_data_referencia
    AND (rf.data_fim IS NULL OR rf.data_fim >= p_data_referencia)
    AND (rf.tipo_obra IS NULL OR rf.tipo_obra = p_tipo_obra)
    AND (rf.tipo_cliente IS NULL OR rf.tipo_cliente = p_tipo_cliente)
    AND (rf.tipo_operacao IS NULL OR rf.tipo_operacao = p_tipo_operacao)
  ORDER BY 
    -- Priorizar regras mais específicas
    CASE WHEN rf.tipo_obra IS NOT NULL THEN 0 ELSE 1 END +
    CASE WHEN rf.tipo_cliente IS NOT NULL THEN 0 ELSE 1 END +
    CASE WHEN rf.tipo_operacao IS NOT NULL THEN 0 ELSE 1 END,
    rf.prioridade ASC
  LIMIT 1;

  -- Se não encontrou regra, usar regime normal
  IF v_regra IS NULL THEN
    SELECT * INTO v_regime 
    FROM public.regimes_fiscais 
    WHERE codigo = 'NORMAL' AND ativo = true;
    
    SELECT t.percentagem INTO v_taxa
    FROM public.taxas_iva t
    WHERE t.regime_id = v_regime.id
      AND t.ativo = true
      AND t.data_inicio <= p_data_referencia
      AND (t.data_fim IS NULL OR t.data_fim >= p_data_referencia)
    ORDER BY t.data_inicio DESC
    LIMIT 1;
    
    SELECT n.texto INTO v_nota
    FROM public.notas_legais_fiscais n
    WHERE n.regime_id = v_regime.id
      AND n.ativo = true
      AND n.obrigatoria = true
    ORDER BY n.ordem
    LIMIT 1;
    
    RETURN QUERY SELECT 
      v_regime.id,
      v_regime.codigo,
      v_regime.nome,
      COALESCE(v_taxa, 23)::NUMERIC,
      NULL::UUID,
      'DEFAULT_NORMAL'::TEXT,
      v_nota;
    RETURN;
  END IF;

  -- Obter taxa atual para o regime
  SELECT t.percentagem INTO v_taxa
  FROM public.taxas_iva t
  WHERE t.regime_id = v_regra.regime_id
    AND t.ativo = true
    AND t.data_inicio <= p_data_referencia
    AND (t.data_fim IS NULL OR t.data_fim >= p_data_referencia)
  ORDER BY t.data_inicio DESC
  LIMIT 1;

  -- Obter nota legal
  SELECT n.texto INTO v_nota
  FROM public.notas_legais_fiscais n
  WHERE n.regime_id = v_regra.regime_id
    AND n.ativo = true
    AND n.obrigatoria = true
  ORDER BY n.ordem
  LIMIT 1;

  RETURN QUERY SELECT 
    v_regra.regime_id,
    v_regra.regime_codigo,
    v_regra.regime_nome,
    COALESCE(v_taxa, 23)::NUMERIC,
    v_regra.id,
    v_regra.codigo,
    v_nota;
END;
$$;

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_regras_fiscais_lookup ON public.regras_fiscais (ativo, data_inicio, data_fim, prioridade);
CREATE INDEX idx_taxas_iva_lookup ON public.taxas_iva (regime_id, ativo, data_inicio, data_fim);
CREATE INDEX idx_notas_legais_regime ON public.notas_legais_fiscais (regime_id, ativo, obrigatoria);
CREATE INDEX idx_orcamento_fiscal_orcamento ON public.orcamento_contexto_fiscal (orcamento_id);
CREATE INDEX idx_auditoria_fiscal_entidade ON public.auditoria_fiscal (entidade_tipo, entidade_id);
CREATE INDEX idx_auditoria_fiscal_user ON public.auditoria_fiscal (user_id, created_at DESC);

-- =============================================
-- TRIGGER: Atualizar updated_at
-- =============================================
CREATE TRIGGER update_regimes_fiscais_updated_at
  BEFORE UPDATE ON public.regimes_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_taxas_iva_updated_at
  BEFORE UPDATE ON public.taxas_iva
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_regras_fiscais_updated_at
  BEFORE UPDATE ON public.regras_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notas_legais_updated_at
  BEFORE UPDATE ON public.notas_legais_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamento_fiscal_updated_at
  BEFORE UPDATE ON public.orcamento_contexto_fiscal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();