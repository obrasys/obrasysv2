DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'axia_intake_item_history'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.axia_intake_item_history';
  END IF;
END $$;

ALTER TABLE public.axia_intake_item_history REPLICA IDENTITY FULL;