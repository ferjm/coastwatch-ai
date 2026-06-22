-- Enable Postgres realtime for the uploads UI.
--
-- The uploads page (src/pages/app/Uploads.tsx) and the browser inference worker
-- (src/hooks/useInferenceWorker.ts) both subscribe to `postgres_changes` on
-- `public.images`. Without the table being part of the `supabase_realtime`
-- publication those events never fire, so the UI stays stuck on "Pendiente"
-- until a manual page reload. This migration registers the tables and sets
-- REPLICA IDENTITY FULL so UPDATE/DELETE payloads carry the full row.

ALTER TABLE public.images REPLICA IDENTITY FULL;
ALTER TABLE public.detections REPLICA IDENTITY FULL;

-- Add to the realtime publication, idempotently (ADD TABLE errors if already a member).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'images'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.images;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'detections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.detections;
  END IF;
END $$;
