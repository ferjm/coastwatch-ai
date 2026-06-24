-- Cascade latency: latencia por nivel (ms) a nivel imagen, para análisis de rendimiento
-- del sistema de dos niveles (H8 / Capítulo 5 del TFM). edge_ms = inferencia FOMO en
-- navegador (WASM); cloud_ms = round-trip a la Edge Function infer-cloud (Roboflow).

ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS edge_ms INTEGER,
  ADD COLUMN IF NOT EXISTS cloud_ms INTEGER;

COMMENT ON COLUMN public.images.edge_ms IS 'Latencia del Nivel 1 (criba FOMO en navegador/WASM) en milisegundos';
COMMENT ON COLUMN public.images.cloud_ms IS 'Latencia del Nivel 2 (llamada a infer-cloud/Roboflow) en milisegundos; null si el cloud no se ejecutó';
