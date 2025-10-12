-- Create images table
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width_px INTEGER NOT NULL,
  height_px INTEGER NOT NULL,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  captured_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'queued', 'processing', 'processed', 'failed')),
  error_message TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create detections table
CREATE TABLE public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_images_gps ON public.images(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;
CREATE INDEX idx_detections_image_id ON public.detections(image_id);
CREATE INDEX idx_detections_label ON public.detections(label);
CREATE INDEX idx_detections_confidence ON public.detections(confidence);

-- Enable RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for images
-- Admins and researchers can view all images
CREATE POLICY "Admins and researchers can view all images"
  ON public.images FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'researcher') OR
    has_role(auth.uid(), 'viewer')
  );

-- Admins and researchers can insert images
CREATE POLICY "Admins and researchers can insert images"
  ON public.images FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'researcher')
  );

-- Admins and researchers can update images
CREATE POLICY "Admins and researchers can update images"
  ON public.images FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'researcher')
  );

-- Only admins can delete images
CREATE POLICY "Admins can delete images"
  ON public.images FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for detections
-- All authenticated users can view detections
CREATE POLICY "All authenticated users can view detections"
  ON public.detections FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'researcher') OR
    has_role(auth.uid(), 'viewer')
  );

-- System can insert detections (via service role)
CREATE POLICY "System can insert detections"
  ON public.detections FOR INSERT
  WITH CHECK (true);

-- Only admins can delete detections
CREATE POLICY "Admins can delete detections"
  ON public.detections FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('images', 'images', false),
  ('thumbnails', 'thumbnails', true);

-- Storage policies for images bucket
CREATE POLICY "Admins and researchers can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'researcher'))
  );

CREATE POLICY "Authenticated users can view images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'images' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'researcher') OR has_role(auth.uid(), 'viewer'))
  );

CREATE POLICY "Admins can delete images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' AND
    has_role(auth.uid(), 'admin')
  );

-- Storage policies for thumbnails bucket (public)
CREATE POLICY "Admins and researchers can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'thumbnails' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'researcher'))
  );

CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Admins can delete thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'thumbnails' AND
    has_role(auth.uid(), 'admin')
  );

-- Trigger to update updated_at
CREATE TRIGGER update_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();