-- Create storage bucket for RDO photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('rdo-fotos', 'rdo-fotos', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can view their own RDO photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rdo-fotos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own RDO photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rdo-fotos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own RDO photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rdo-fotos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add fotos column to relatorios_diarios table
ALTER TABLE public.relatorios_diarios
ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.relatorios_diarios.fotos IS 'Array of storage paths for RDO photos';