DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile or admin all" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Insert detections" ON public.detections;
CREATE POLICY "Insert detections (admin/researcher)" ON public.detections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'researcher'));

DROP POLICY IF EXISTS "View thumbnails" ON storage.objects;
CREATE POLICY "Manage thumbnails listing (admin/researcher)" ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'researcher')));