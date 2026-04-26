ALTER TABLE public.axia_intake_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.axia_intake_items;