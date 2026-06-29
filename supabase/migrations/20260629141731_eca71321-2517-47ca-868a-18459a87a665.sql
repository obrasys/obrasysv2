CREATE TABLE public.agenda_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  hora TEXT,
  concluida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_notes TO authenticated;
GRANT ALL ON public.agenda_notes TO service_role;
ALTER TABLE public.agenda_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agenda notes" ON public.agenda_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_agenda_notes_user_data ON public.agenda_notes(user_id, data);
CREATE TRIGGER trg_agenda_notes_updated BEFORE UPDATE ON public.agenda_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();