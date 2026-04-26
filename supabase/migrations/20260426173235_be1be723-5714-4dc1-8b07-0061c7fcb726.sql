-- =========================================================
-- AXIA VOICE INTAKE — base tables, RLS, triggers, storage
-- =========================================================

-- ---------- 1. voice_commands ----------
CREATE TABLE IF NOT EXISTS public.voice_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  source_context text NOT NULL DEFAULT 'global',
  audio_file_path text,
  transcript text NOT NULL,
  language text NOT NULL DEFAULT 'pt-PT',
  detected_intent text,
  confidence numeric(5,4),
  processing_status text NOT NULL DEFAULT 'pending',
  axia_result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT voice_commands_status_check CHECK (processing_status IN ('pending','processing','processed','needs_review','failed')),
  CONSTRAINT voice_commands_context_check CHECK (source_context IN ('global','project','financial','rdo','pre_budget'))
);
CREATE INDEX IF NOT EXISTS idx_voice_commands_user_created ON public.voice_commands(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_commands_obra ON public.voice_commands(obra_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_commands_status ON public.voice_commands(processing_status);

-- ---------- 2. axia_intake_items ----------
CREATE TABLE IF NOT EXISTS public.axia_intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  voice_command_id uuid REFERENCES public.voice_commands(id) ON DELETE SET NULL,
  item_type text NOT NULL,
  title text NOT NULL,
  summary text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_review',
  target_entity_type text,
  target_entity_id uuid,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  axia_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT axia_intake_type_check CHECK (item_type IN ('pre_budget','rdo','financial_record','material_need','task','unknown')),
  CONSTRAINT axia_intake_status_check CHECK (status IN ('pending_review','approved','rejected','converted','needs_more_info'))
);
CREATE INDEX IF NOT EXISTS idx_axia_intake_user_status ON public.axia_intake_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_axia_intake_obra_status ON public.axia_intake_items(obra_id, status);
CREATE INDEX IF NOT EXISTS idx_axia_intake_type ON public.axia_intake_items(item_type, status);

-- ---------- 3. pre_budgets ----------
CREATE TABLE IF NOT EXISTS public.pre_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_from text NOT NULL DEFAULT 'manual',
  source_voice_command_id uuid REFERENCES public.voice_commands(id) ON DELETE SET NULL,
  source_axia_intake_item_id uuid REFERENCES public.axia_intake_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  confidence numeric(5,4),
  estimated_total numeric(14,2),
  currency text NOT NULL DEFAULT 'EUR',
  axia_summary text,
  axia_assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  axia_missing_info jsonb NOT NULL DEFAULT '[]'::jsonb,
  converted_orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pre_budgets_status_check CHECK (status IN ('draft','pending_review','ready_to_convert','converted_to_budget','archived','rejected')),
  CONSTRAINT pre_budgets_created_from_check CHECK (created_from IN ('manual','voice_axia','import','template'))
);
CREATE INDEX IF NOT EXISTS idx_pre_budgets_user_status ON public.pre_budgets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pre_budgets_obra ON public.pre_budgets(obra_id);

CREATE TABLE IF NOT EXISTS public.pre_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pre_budget_id uuid NOT NULL REFERENCES public.pre_budgets(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,4),
  unit text,
  unit_price numeric(14,2),
  total_price numeric(14,2),
  source text NOT NULL DEFAULT 'axia',
  confidence numeric(5,4),
  needs_review boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pre_budget_items_source_check CHECK (source IN ('axia','manual','catalog'))
);
CREATE INDEX IF NOT EXISTS idx_pre_budget_items_pre_budget ON public.pre_budget_items(pre_budget_id);

-- ---------- 4. daily_report_material_needs ----------
CREATE TABLE IF NOT EXISTS public.daily_report_material_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_report_id uuid NOT NULL REFERENCES public.relatorios_diarios(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  quantity numeric(14,4),
  unit text,
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  related_supplier_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'axia_voice',
  voice_command_id uuid REFERENCES public.voice_commands(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mat_needs_urgency_check CHECK (urgency IN ('low','normal','high','critical')),
  CONSTRAINT mat_needs_status_check CHECK (status IN ('open','requested','purchased','resolved','ignored'))
);
CREATE INDEX IF NOT EXISTS idx_mat_needs_rdo ON public.daily_report_material_needs(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_mat_needs_user_status ON public.daily_report_material_needs(user_id, status);

-- ---------- 5. dashboard_alerts ----------
CREATE TABLE IF NOT EXISTS public.dashboard_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  source_entity_type text,
  source_entity_id uuid,
  status text NOT NULL DEFAULT 'open',
  action_label text,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT alerts_severity_check CHECK (severity IN ('info','warning','critical')),
  CONSTRAINT alerts_status_check CHECK (status IN ('open','resolved','dismissed')),
  CONSTRAINT alerts_type_check CHECK (alert_type IN ('pre_budget_pending','rdo_pending','financial_missing_project','axia_needs_review'))
);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_user_status ON public.dashboard_alerts(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_type ON public.dashboard_alerts(alert_type, status);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_source ON public.dashboard_alerts(source_entity_type, source_entity_id);

-- ---------- 6. axia_processing_logs ----------
CREATE TABLE IF NOT EXISTS public.axia_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  process_type text NOT NULL,
  source_entity_type text,
  source_entity_id uuid,
  input_summary text,
  output_summary text,
  model_used text,
  rule_version text,
  prompt_version text,
  status text NOT NULL,
  latency_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT axia_logs_status_check CHECK (status IN ('success','failed','partial','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_axia_logs_user_created ON public.axia_processing_logs(user_id, created_at DESC);

-- ---------- 7. Alterações nas tabelas existentes ----------
ALTER TABLE public.relatorios_diarios
  ADD COLUMN IF NOT EXISTS created_from text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_voice_command_id uuid REFERENCES public.voice_commands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_axia_intake_item_id uuid REFERENCES public.axia_intake_items(id) ON DELETE SET NULL;

ALTER TABLE public.contas_financeiras
  ADD COLUMN IF NOT EXISTS created_from text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_voice_command_id uuid REFERENCES public.voice_commands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_axia_intake_item_id uuid REFERENCES public.axia_intake_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intake_status text;

-- daily_report_activities exists; add columns only if missing
ALTER TABLE public.daily_report_activities
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS voice_command_id uuid REFERENCES public.voice_commands(id) ON DELETE SET NULL;

-- ---------- 8. RLS ----------
ALTER TABLE public.voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.axia_intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_material_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.axia_processing_logs ENABLE ROW LEVEL SECURITY;

-- voice_commands
CREATE POLICY "voice_commands_select_org" ON public.voice_commands FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "voice_commands_insert_self" ON public.voice_commands FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "voice_commands_update_org" ON public.voice_commands FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "voice_commands_delete_admin" ON public.voice_commands FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()) AND public.is_org_admin());

-- axia_intake_items
CREATE POLICY "axia_intake_select_org" ON public.axia_intake_items FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "axia_intake_insert_self" ON public.axia_intake_items FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "axia_intake_update_org" ON public.axia_intake_items FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "axia_intake_delete_admin" ON public.axia_intake_items FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()) AND public.is_org_admin());

-- pre_budgets
CREATE POLICY "pre_budgets_select_org" ON public.pre_budgets FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "pre_budgets_insert_self" ON public.pre_budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "pre_budgets_update_org" ON public.pre_budgets FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "pre_budgets_delete_admin" ON public.pre_budgets FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()) AND public.is_org_admin());

-- pre_budget_items
CREATE POLICY "pre_budget_items_select_org" ON public.pre_budget_items FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "pre_budget_items_insert_self" ON public.pre_budget_items FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "pre_budget_items_update_org" ON public.pre_budget_items FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "pre_budget_items_delete_org" ON public.pre_budget_items FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_material_needs
CREATE POLICY "mat_needs_select_org" ON public.daily_report_material_needs FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "mat_needs_insert_self" ON public.daily_report_material_needs FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "mat_needs_update_org" ON public.daily_report_material_needs FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "mat_needs_delete_org" ON public.daily_report_material_needs FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()));

-- dashboard_alerts
CREATE POLICY "dashboard_alerts_select_org" ON public.dashboard_alerts FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "dashboard_alerts_insert_org" ON public.dashboard_alerts FOR INSERT
  WITH CHECK (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "dashboard_alerts_update_org" ON public.dashboard_alerts FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "dashboard_alerts_delete_admin" ON public.dashboard_alerts FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()) AND public.is_org_admin());

-- axia_processing_logs
CREATE POLICY "axia_logs_select_org" ON public.axia_processing_logs FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "axia_logs_insert_self" ON public.axia_processing_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "axia_logs_delete_admin" ON public.axia_processing_logs FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()) AND public.is_org_admin());

-- ---------- 9. updated_at triggers ----------
CREATE TRIGGER update_pre_budgets_updated_at
  BEFORE UPDATE ON public.pre_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 10. Alert triggers ----------

-- Pre-budget alerts
CREATE OR REPLACE FUNCTION public.handle_pre_budget_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.created_from = 'voice_axia' AND NEW.status IN ('draft','pending_review') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.dashboard_alerts
      WHERE source_entity_type = 'pre_budget' AND source_entity_id = NEW.id AND status = 'open'
    ) THEN
      INSERT INTO public.dashboard_alerts (user_id, obra_id, alert_type, severity, title, message, source_entity_type, source_entity_id, action_label, action_url)
      VALUES (NEW.user_id, NEW.obra_id, 'pre_budget_pending', 'info',
              'Pré-orçamento pendente',
              'Existe um pré-orçamento criado pela Axia pendente de finalização.',
              'pre_budget', NEW.id, 'Revisar pré-orçamento', '/pre-orcamentos/' || NEW.id::text);
    END IF;
  ELSIF NEW.status IN ('ready_to_convert','converted_to_budget','archived','rejected') THEN
    UPDATE public.dashboard_alerts SET status = 'resolved', resolved_at = now()
    WHERE source_entity_type = 'pre_budget' AND source_entity_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_pre_budget_alert
  AFTER INSERT OR UPDATE OF status ON public.pre_budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_pre_budget_alert();

-- RDO alerts
CREATE OR REPLACE FUNCTION public.handle_rdo_voice_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.created_from = 'voice_axia' AND NEW.status IN ('rascunho','submetido') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.dashboard_alerts
      WHERE source_entity_type = 'rdo' AND source_entity_id = NEW.id AND status = 'open'
    ) THEN
      INSERT INTO public.dashboard_alerts (user_id, obra_id, alert_type, severity, title, message, source_entity_type, source_entity_id, action_label, action_url)
      VALUES (NEW.user_id, NEW.obra_id, 'rdo_pending', 'info',
              'RDO pendente',
              'Existe um RDO criado pela Axia pendente de revisão.',
              'rdo', NEW.id, 'Finalizar RDO', '/rdos/' || NEW.id::text);
    END IF;
  ELSIF NEW.status = 'aprovado' THEN
    UPDATE public.dashboard_alerts SET status = 'resolved', resolved_at = now()
    WHERE source_entity_type = 'rdo' AND source_entity_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_rdo_voice_alert
  AFTER INSERT OR UPDATE OF status ON public.relatorios_diarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_rdo_voice_alert();

-- Financial missing-project alert
CREATE OR REPLACE FUNCTION public.handle_financial_voice_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.created_from = 'voice_axia' AND NEW.obra_id IS NULL AND NEW.intake_status = 'missing_project' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.dashboard_alerts
      WHERE source_entity_type = 'financial_record' AND source_entity_id = NEW.id AND status = 'open'
    ) THEN
      INSERT INTO public.dashboard_alerts (user_id, obra_id, alert_type, severity, title, message, source_entity_type, source_entity_id, action_label, action_url)
      VALUES (NEW.user_id, NULL, 'financial_missing_project', 'warning',
              'Registo financeiro sem obra',
              'Existe um registo financeiro sem obra associada.',
              'financial_record', NEW.id, 'Associar obra', '/axia/inbox');
    END IF;
  ELSIF NEW.obra_id IS NOT NULL OR NEW.intake_status = 'confirmed' OR NEW.intake_status = 'rejected' THEN
    UPDATE public.dashboard_alerts SET status = 'resolved', resolved_at = now()
    WHERE source_entity_type = 'financial_record' AND source_entity_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_financial_voice_alert
  AFTER INSERT OR UPDATE OF obra_id, intake_status ON public.contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.handle_financial_voice_alert();

-- Axia intake needs-review alert
CREATE OR REPLACE FUNCTION public.handle_intake_review_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'needs_more_info' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.dashboard_alerts
      WHERE source_entity_type = 'axia_intake_item' AND source_entity_id = NEW.id AND status = 'open'
    ) THEN
      INSERT INTO public.dashboard_alerts (user_id, obra_id, alert_type, severity, title, message, source_entity_type, source_entity_id, action_label, action_url)
      VALUES (NEW.user_id, NEW.obra_id, 'axia_needs_review', 'warning',
              CASE NEW.item_type
                WHEN 'rdo' THEN 'RDO sem obra definida'
                WHEN 'financial_record' THEN 'Registo financeiro precisa revisão'
                WHEN 'pre_budget' THEN 'Pré-orçamento precisa revisão'
                ELSE 'Item Axia precisa revisão'
              END,
              COALESCE('A Axia precisa de mais informação: ' || NEW.title, 'A Axia precisa de mais informação para concluir esta ação.'),
              'axia_intake_item', NEW.id, 'Rever na Caixa da Axia', '/axia/inbox');
    END IF;
  ELSIF NEW.status IN ('approved','converted','rejected') THEN
    UPDATE public.dashboard_alerts SET status = 'resolved', resolved_at = now()
    WHERE source_entity_type = 'axia_intake_item' AND source_entity_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_intake_review_alert
  AFTER INSERT OR UPDATE OF status ON public.axia_intake_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_intake_review_alert();

-- ---------- 11. Storage bucket for audio ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-intake', 'voice-intake', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice_intake_read_org" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-intake'
    AND (split_part(name, '/', 1)::uuid) = ANY(public.get_org_member_ids())
  );

CREATE POLICY "voice_intake_insert_self" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-intake'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "voice_intake_update_self" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'voice-intake'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "voice_intake_delete_self" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'voice-intake'
    AND split_part(name, '/', 1) = auth.uid()::text
  );