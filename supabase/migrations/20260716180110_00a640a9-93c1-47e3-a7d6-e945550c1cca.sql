
-- Storage policies for property-docs (private bucket, per-user folder)
CREATE POLICY "docs_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "docs_public_signed_via_owner" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'property-docs');
CREATE POLICY "docs_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "docs_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "docs_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
