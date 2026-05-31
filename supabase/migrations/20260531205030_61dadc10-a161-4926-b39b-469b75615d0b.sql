
-- 1) Estender estados das versões do Budget e adicionar metadados
ALTER TABLE public.orcamentos
  DROP CONSTRAINT IF EXISTS orcamentos_budget_version_status_check;

ALTER TABLE public.orcamentos
  ADD CONSTRAINT orcamentos_budget_version_status_check
  CHECK (budget_version_status IS NULL OR budget_version_status IN (
    'active','locked',  -- legacy
    'rascunho','em_revisao','aprovado','ativa','arquivada'
  ));

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS version_name TEXT,
  ADD COLUMN IF NOT EXISTS version_reason TEXT,
  ADD COLUMN IF NOT EXISTS version_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_base_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS base_locked_at TIMESTAMPTZ;

-- Apenas 1 versão "ativa" por base (substitui o índice antigo que olhava só para 'active')
DROP INDEX IF EXISTS idx_budget_active_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_active_v2_unique
  ON public.orcamentos (revisao_de)
  WHERE budget_version_status IN ('active','ativa');

-- 2) Trigger de proteção do Orçamento Base bloqueado
CREATE OR REPLACE FUNCTION public.prevent_locked_base_orcamento_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_skip TEXT;
BEGIN
  -- Permite bypass interno (SECURITY DEFINER define a flag)
  BEGIN
    v_skip := current_setting('app.skip_base_lock', true);
  EXCEPTION WHEN OTHERS THEN
    v_skip := NULL;
  END;
  IF v_skip = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.is_base_locked THEN
      RAISE EXCEPTION 'Orçamento Base bloqueado pela Folha de Fecho Base. Para reorçamentar, cria uma nova versão no Budget.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_base_locked THEN
    -- só permite alterar estes campos meta (não estruturais)
    IF NEW.titulo IS DISTINCT FROM OLD.titulo
       OR NEW.codigo IS DISTINCT FROM OLD.codigo
       OR NEW.margem_lucro IS DISTINCT FROM OLD.margem_lucro
       OR NEW.custos_indiretos::text IS DISTINCT FROM OLD.custos_indiretos::text
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.obra_id IS DISTINCT FROM OLD.obra_id
       OR NEW.project_metadata::text IS DISTINCT FROM OLD.project_metadata::text
    THEN
      RAISE EXCEPTION 'Orçamento Base bloqueado pela Folha de Fecho Base. Para reorçamentar, cria uma nova versão no Budget.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_base_orcamento ON public.orcamentos;
CREATE TRIGGER trg_prevent_locked_base_orcamento
  BEFORE UPDATE OR DELETE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_base_orcamento_edit();

-- Trigger para capítulos do Base bloqueado
CREATE OR REPLACE FUNCTION public.prevent_locked_base_chapter_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_skip TEXT;
  v_locked BOOLEAN;
  v_orc_id UUID;
BEGIN
  BEGIN v_skip := current_setting('app.skip_base_lock', true); EXCEPTION WHEN OTHERS THEN v_skip := NULL; END;
  IF v_skip = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;

  v_orc_id := COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  SELECT is_base_locked INTO v_locked FROM public.orcamentos WHERE id = v_orc_id;

  IF v_locked THEN
    RAISE EXCEPTION 'Orçamento Base bloqueado. Cria uma nova versão no Budget para reorçamentar.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_base_chapter ON public.capitulos_orcamento;
CREATE TRIGGER trg_prevent_locked_base_chapter
  BEFORE INSERT OR UPDATE OR DELETE ON public.capitulos_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_base_chapter_edit();

-- Trigger para artigos do Base bloqueado
CREATE OR REPLACE FUNCTION public.prevent_locked_base_artigo_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_skip TEXT;
  v_locked BOOLEAN;
  v_cap_id UUID;
BEGIN
  BEGIN v_skip := current_setting('app.skip_base_lock', true); EXCEPTION WHEN OTHERS THEN v_skip := NULL; END;
  IF v_skip = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;

  v_cap_id := COALESCE(NEW.capitulo_id, OLD.capitulo_id);
  SELECT o.is_base_locked INTO v_locked
    FROM public.capitulos_orcamento c
    JOIN public.orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = v_cap_id;

  IF v_locked THEN
    RAISE EXCEPTION 'Orçamento Base bloqueado. Cria uma nova versão no Budget para reorçamentar.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_base_artigo ON public.artigos_orcamento;
CREATE TRIGGER trg_prevent_locked_base_artigo
  BEFORE INSERT OR UPDATE OR DELETE ON public.artigos_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_base_artigo_edit();

-- 3) Marcar Base como bloqueado quando a Folha de Fecho Base é gravada
CREATE OR REPLACE FUNCTION public.lock_base_orcamento_on_closing_sheet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_budget_id IS NOT NULL THEN
    PERFORM set_config('app.skip_base_lock','on',true);
    UPDATE public.orcamentos
      SET is_base_locked = TRUE,
          base_locked_at = COALESCE(base_locked_at, NOW())
      WHERE id = NEW.source_budget_id
        AND is_base_locked = FALSE;
    PERFORM set_config('app.skip_base_lock','off',true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_base_on_closing_sheet ON public.closing_sheets;
CREATE TRIGGER trg_lock_base_on_closing_sheet
  AFTER INSERT ON public.closing_sheets
  FOR EACH ROW EXECUTE FUNCTION public.lock_base_orcamento_on_closing_sheet();

-- Backfill: marca como bloqueado qualquer Base que já tem Folha de Fecho
UPDATE public.orcamentos o
  SET is_base_locked = TRUE,
      base_locked_at = COALESCE(o.base_locked_at, NOW())
  WHERE o.budget_version_number IS NULL
    AND EXISTS (SELECT 1 FROM public.closing_sheets cs WHERE cs.source_budget_id = o.id);

-- 4) RPCs de gestão de versões do Budget

-- Aprovar versão
CREATE OR REPLACE FUNCTION public.approve_budget_version(p_version_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  UPDATE public.orcamentos
    SET budget_version_status = 'aprovado',
        approved_by = v_uid,
        approved_at = NOW()
    WHERE id = p_version_id
      AND budget_version_number IS NOT NULL;
END;
$$;

-- Definir versão ativa (desativa outras)
CREATE OR REPLACE FUNCTION public.set_active_budget_version(p_version_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_base UUID;
BEGIN
  SELECT revisao_de INTO v_base FROM public.orcamentos WHERE id = p_version_id;
  IF v_base IS NULL THEN RAISE EXCEPTION 'Versão não encontrada'; END IF;

  UPDATE public.orcamentos
    SET budget_version_status = 'arquivada'
    WHERE revisao_de = v_base
      AND id <> p_version_id
      AND budget_version_status IN ('active','ativa');

  UPDATE public.orcamentos
    SET budget_version_status = 'ativa'
    WHERE id = p_version_id;
END;
$$;

-- Arquivar versão
CREATE OR REPLACE FUNCTION public.archive_budget_version(p_version_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orcamentos
    SET budget_version_status = 'arquivada'
    WHERE id = p_version_id
      AND budget_version_number IS NOT NULL;
END;
$$;

-- Criar versão nomeada (com metadados)
CREATE OR REPLACE FUNCTION public.create_budget_version_named(
  p_base_id UUID,
  p_clone_from UUID,
  p_name TEXT,
  p_reason TEXT,
  p_notes TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_id UUID;
BEGIN
  v_new_id := public.create_budget_working_version(p_base_id, p_clone_from);
  UPDATE public.orcamentos
    SET version_name = p_name,
        version_reason = p_reason,
        version_notes = p_notes,
        budget_version_status = 'rascunho'
    WHERE id = v_new_id;
  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_budget_version(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_budget_version(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_budget_version(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_budget_version_named(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
