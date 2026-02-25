
-- 1. Templates essenciais
CREATE TABLE public.orcamento_templates_essencial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo_obra TEXT NOT NULL,
  itens_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orcamento_templates_essencial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates essenciais sao publicos" ON public.orcamento_templates_essencial
  FOR SELECT USING (true);

-- 2. Eventos de conversão
CREATE TABLE public.essencial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  tempo_total_segundos INTEGER,
  quantidade_itens INTEGER,
  modelo_utilizado BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.essencial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own events" ON public.essencial_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own events" ON public.essencial_events
  FOR SELECT USING (auth.uid() = user_id);
