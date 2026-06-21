ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','accepted','rejected'));
CREATE INDEX IF NOT EXISTS idx_images_review_status ON public.images(review_status);
COMMENT ON COLUMN public.images.review_status IS 'Revisión humana: pending | accepted | rejected';
