
-- Axia Events: telemetria estruturada do wizard
CREATE TABLE public.axia_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'orcamento',
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.axia_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own axia_events" ON public.axia_events
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_axia_events_user ON public.axia_events(user_id);
CREATE INDEX idx_axia_events_name ON public.axia_events(event_name);

-- Axia Item Dictionary: normalização de descrições
CREATE TABLE public.axia_item_dictionary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text TEXT NOT NULL,
  canonical_label TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  locale TEXT NOT NULL DEFAULT 'pt-PT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.axia_item_dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read axia_item_dictionary" ON public.axia_item_dictionary
  FOR SELECT USING (true);
CREATE POLICY "Super admins manage dictionary" ON public.axia_item_dictionary
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE INDEX idx_axia_dict_raw ON public.axia_item_dictionary(raw_text);
CREATE INDEX idx_axia_dict_canonical ON public.axia_item_dictionary(canonical_label);

-- Axia Budget Stats: agregados por tipo_obra
CREATE TABLE public.axia_budget_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_obra TEXT NOT NULL,
  canonical_label TEXT NOT NULL,
  median_value NUMERIC NOT NULL DEFAULT 0,
  p25 NUMERIC NOT NULL DEFAULT 0,
  p75 NUMERIC NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_obra, canonical_label)
);

ALTER TABLE public.axia_budget_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read axia_budget_stats" ON public.axia_budget_stats
  FOR SELECT USING (true);
CREATE POLICY "Super admins manage budget_stats" ON public.axia_budget_stats
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Axia Suggestions Log: o que a Axia sugeriu e se foi aceite
CREATE TABLE public.axia_suggestions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  orcamento_id UUID,
  suggestion_type TEXT NOT NULL,
  suggestion_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.axia_suggestions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own suggestions_log" ON public.axia_suggestions_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_axia_suggestions_user ON public.axia_suggestions_log(user_id);
CREATE INDEX idx_axia_suggestions_type ON public.axia_suggestions_log(suggestion_type);
