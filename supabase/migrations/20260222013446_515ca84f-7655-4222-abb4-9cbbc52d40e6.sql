CREATE POLICY "Users can update their own receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'comprovantes' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'comprovantes' AND (auth.uid())::text = (storage.foldername(name))[1]);