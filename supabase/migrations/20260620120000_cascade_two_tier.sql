-- Cascade two-tier: etiquetar detecciones por nivel/modelo + flag de criba a nivel imagen.

ALTER TABLE public.detections
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'edge'
    CHECK (source IN ('edge','cloud')),
  ADD COLUMN IF NOT EXISTS model TEXT;

CREATE INDEX IF NOT EXISTS idx_detections_source ON public.detections(source);

ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS screening_would_escalate BOOLEAN,
  ADD COLUMN IF NOT EXISTS edge_count INTEGER,
  ADD COLUMN IF NOT EXISTS cloud_count INTEGER;

COMMENT ON COLUMN public.detections.source IS 'Nivel de inferencia que produjo la detección: edge (FOMO/WASM) o cloud (Roboflow)';
COMMENT ON COLUMN public.detections.model IS 'Identificador del modelo, p.ej. fomo-320 o rfdetr-medium-v6';
COMMENT ON COLUMN public.images.screening_would_escalate IS 'Analítico H8: ¿la criba edge habría escalado esta imagen a cloud? (la cascada corre ambos niveles igualmente)';
