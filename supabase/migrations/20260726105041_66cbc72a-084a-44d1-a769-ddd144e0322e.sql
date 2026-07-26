CREATE POLICY "Users can view profiles they referred"
ON public.profiles FOR SELECT TO authenticated
USING (referred_by = auth.uid());