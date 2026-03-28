ALTER TABLE public.workers
  ADD COLUMN subempreiteiro_id UUID REFERENCES public.subempreiteiros(id) ON DELETE SET NULL,
  ADD COLUMN equipa_membro_id UUID REFERENCES public.equipa_membros(id) ON DELETE SET NULL;