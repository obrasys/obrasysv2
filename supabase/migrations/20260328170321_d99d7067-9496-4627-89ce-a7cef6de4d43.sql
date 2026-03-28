
-- Add commercial fields to orcamentos
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS client_document_mode_default text DEFAULT 'tecnico',
  ADD COLUMN IF NOT EXISTS commercial_intro_text text,
  ADD COLUMN IF NOT EXISTS commercial_payment_terms_text text,
  ADD COLUMN IF NOT EXISTS commercial_validity_text text,
  ADD COLUMN IF NOT EXISTS commercial_notes_text text,
  ADD COLUMN IF NOT EXISTS show_signature_block boolean DEFAULT false;

-- Add commercial fields to capitulos_orcamento
ALTER TABLE public.capitulos_orcamento
  ADD COLUMN IF NOT EXISTS client_summary_title text,
  ADD COLUMN IF NOT EXISTS client_summary_text text,
  ADD COLUMN IF NOT EXISTS client_exclusions_text text,
  ADD COLUMN IF NOT EXISTS include_in_client_summary boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_summary_order integer;

-- Create budget_documents table
CREATE TABLE IF NOT EXISTS public.budget_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_id uuid REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL DEFAULT 'pdf',
  view_mode text NOT NULL DEFAULT 'tecnico',
  storage_path text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_to_email text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget documents" ON public.budget_documents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own budget documents" ON public.budget_documents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Create budget-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-documents', 'budget-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for budget-documents bucket
CREATE POLICY "Users can upload budget documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own budget documents storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'budget-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
