-- Add company fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS empresa_nome TEXT,
ADD COLUMN IF NOT EXISTS empresa_nif TEXT,
ADD COLUMN IF NOT EXISTS empresa_morada TEXT,
ADD COLUMN IF NOT EXISTS empresa_cidade TEXT,
ADD COLUMN IF NOT EXISTS empresa_codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS empresa_pais TEXT DEFAULT 'Portugal',
ADD COLUMN IF NOT EXISTS empresa_telefone TEXT,
ADD COLUMN IF NOT EXISTS empresa_email TEXT,
ADD COLUMN IF NOT EXISTS empresa_logo_url TEXT;

-- Create bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa-logos', 'empresa-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own company logo
CREATE POLICY "Users can upload their company logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'empresa-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their company logo
CREATE POLICY "Users can update their company logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'empresa-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their company logo
CREATE POLICY "Users can delete their company logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'empresa-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for company logos (needed for PDF generation)
CREATE POLICY "Public read access for company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'empresa-logos');