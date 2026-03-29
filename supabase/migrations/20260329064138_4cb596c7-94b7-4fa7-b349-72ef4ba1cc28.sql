
-- Add foto_url column to all 3 resource tables
ALTER TABLE public.equipa_membros ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.subempreiteiros ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Create storage bucket for resource photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('recursos', 'recursos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for recursos bucket
CREATE POLICY "Users can upload resource photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recursos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their resource photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recursos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their resource photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recursos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Resource photos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recursos');
