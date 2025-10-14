-- Change detection coordinate columns from integer to numeric to support decimal values
-- Edge Impulse returns coordinates with decimal precision

ALTER TABLE public.detections 
  ALTER COLUMN x TYPE numeric USING x::numeric,
  ALTER COLUMN y TYPE numeric USING y::numeric,
  ALTER COLUMN width TYPE numeric USING width::numeric,
  ALTER COLUMN height TYPE numeric USING height::numeric;

-- Add comments to document that these are in model pixel space
COMMENT ON COLUMN public.detections.x IS 'X coordinate in model pixel space (e.g., 0-160 for 160x160 model)';
COMMENT ON COLUMN public.detections.y IS 'Y coordinate in model pixel space (e.g., 0-160 for 160x160 model)';
COMMENT ON COLUMN public.detections.width IS 'Width in model pixel space';
COMMENT ON COLUMN public.detections.height IS 'Height in model pixel space';