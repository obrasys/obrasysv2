
DO $$ BEGIN
  CREATE TYPE public.icf_source_type AS ENUM ('extraido_planta','calculado_sistema','sugerido_axia','confirmado_utilizador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.icf_assistant_plan_kind AS ENUM ('arquitetura','estrutural','icf','desconhecido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.icf_assistant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  obra_id uuid,
  user_id uuid NOT NULL,
  plan_kind public.icf_assistant_plan_kind NOT NULL DEFAULT 'arquitetura',
  file_path text,
  scale_m_per_px numeric,
  espessura_nucleo numeric DEFAULT 0.15,
  classe_betao text DEFAULT 'C25/30',
  classe_aco text DEFAULT 'A500NR',
  foundations_found boolean DEFAULT false,
  foundation_option text,
  foundation_params jsonb DEFAULT '{}'::jsonb,
  current_step integer DEFAULT 1,
  status text DEFAULT 'rascunho',
  axia_audit jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_assistant_sessions TO authenticated;
GRANT ALL ON public.icf_assistant_sessions TO service_role;

ALTER TABLE public.icf_assistant_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read assist sessions" ON public.icf_assistant_sessions
FOR SELECT TO authenticated USING (organization_id = public.get_user_org_id());

CREATE POLICY "org members insert assist sessions" ON public.icf_assistant_sessions
FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "org members update assist sessions" ON public.icf_assistant_sessions
FOR UPDATE TO authenticated USING (organization_id = public.get_user_org_id());

CREATE POLICY "org members delete assist sessions" ON public.icf_assistant_sessions
FOR DELETE TO authenticated USING (organization_id = public.get_user_org_id() AND user_id = auth.uid());

CREATE INDEX idx_icf_assist_sessions_org ON public.icf_assistant_sessions(organization_id);
CREATE INDEX idx_icf_assist_sessions_obra ON public.icf_assistant_sessions(obra_id);

CREATE TABLE public.icf_assistant_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.icf_assistant_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  category text NOT NULL,
  reference text,
  is_icf_candidate boolean DEFAULT false,
  user_confirmed boolean DEFAULT false,
  quantity numeric,
  unit text,
  attributes jsonb DEFAULT '{}'::jsonb,
  source_type public.icf_source_type NOT NULL,
  review_required boolean DEFAULT false,
  confidence numeric DEFAULT 1,
  assumptions jsonb DEFAULT '[]'::jsonb,
  notes text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_assistant_items TO authenticated;
GRANT ALL ON public.icf_assistant_items TO service_role;

ALTER TABLE public.icf_assistant_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read assist items" ON public.icf_assistant_items
FOR SELECT TO authenticated USING (organization_id = public.get_user_org_id());

CREATE POLICY "org members insert assist items" ON public.icf_assistant_items
FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "org members update assist items" ON public.icf_assistant_items
FOR UPDATE TO authenticated USING (organization_id = public.get_user_org_id());

CREATE POLICY "org members delete assist items" ON public.icf_assistant_items
FOR DELETE TO authenticated USING (organization_id = public.get_user_org_id());

CREATE INDEX idx_icf_assist_items_session ON public.icf_assistant_items(session_id);
CREATE INDEX idx_icf_assist_items_category ON public.icf_assistant_items(category);

CREATE TRIGGER trg_icf_assist_sessions_updated
BEFORE UPDATE ON public.icf_assistant_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_icf_assist_items_updated
BEFORE UPDATE ON public.icf_assistant_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
