
CREATE POLICY "Users can upload own property images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own property images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own property images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Property images readable by authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'property-images');
CREATE POLICY "Property images readable by anon" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'property-images');
