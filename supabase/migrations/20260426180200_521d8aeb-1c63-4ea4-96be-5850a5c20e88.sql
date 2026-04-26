CREATE TABLE public.axia_intake_item_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_item_id uuid NOT NULL REFERENCES public.axia_intake_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_axia_intake_history_item ON public.axia_intake_item_history(intake_item_id, created_at DESC);

ALTER TABLE public.axia_intake_item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view intake history"
ON public.axia_intake_item_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.axia_intake_items i
    WHERE i.id = intake_item_id
      AND i.user_id = ANY(public.get_org_member_ids())
  )
);

CREATE POLICY "Authenticated users can insert their own actions"
ON public.axia_intake_item_history FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.axia_intake_items i
    WHERE i.id = intake_item_id
      AND i.user_id = ANY(public.get_org_member_ids())
  )
);

ALTER TABLE public.axia_intake_item_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.axia_intake_item_history;