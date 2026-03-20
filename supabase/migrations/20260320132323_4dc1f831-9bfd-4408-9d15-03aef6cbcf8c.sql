
-- Create storage bucket for supplier price list uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-pricelists',
  'supplier-pricelists',
  false,
  20971520,
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
);

-- Suppliers can upload to their own folder
CREATE POLICY "Suppliers can upload pricelists"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supplier-pricelists'
  AND public.is_supplier(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Suppliers can read their own uploads
CREATE POLICY "Suppliers can read own pricelists"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Suppliers can delete their own uploads
CREATE POLICY "Suppliers can delete own pricelists"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
