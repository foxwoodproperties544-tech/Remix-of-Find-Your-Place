
CREATE POLICY "kyc_own_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "kyc_own_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "kyc_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "kyc_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(),'admin')));
