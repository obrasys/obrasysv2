
CREATE TABLE public.plan_room_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo_compartimento text NOT NULL DEFAULT 'habitacao',
  artigos jsonb NOT NULL DEFAULT '[]'::jsonb,
  pe_direito_m numeric NOT NULL DEFAULT 2.70,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_room_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own room templates"
ON public.plan_room_templates
FOR ALL
TO authenticated
USING (user_id = ANY(public.get_org_member_ids()))
WITH CHECK (user_id = ANY(public.get_org_member_ids()));
