-- Hace la doble-inserción de detecciones IMPOSIBLE a nivel de base de datos.
--
-- Contexto: el procesado lo hace el navegador (cada pestaña abierta es un worker que
-- drena la cola compartida). Coordinar los workers solo por el estado en la BD es frágil:
-- una carrera o una pestaña con código viejo puede re-encolar trabajo en vuelo y la misma
-- imagen se procesa dos veces, insertando sus detecciones por duplicado (10 filas en vez de 5).
-- Una restricción única corta esto de raíz, sin depender de la versión del cliente.

-- 1) Limpia los duplicados exactos ya existentes (de doble-procesado previo al fix),
--    conservando la fila más antigua de cada grupo. Las dos pasadas de cascada producen
--    coordenadas idénticas, así que el match exacto identifica los duplicados reales.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY image_id, source, label, x, y, width, height
           ORDER BY created_at
         ) AS rn
  FROM public.detections
)
DELETE FROM public.detections
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Una detección queda definida por (imagen, nivel, clase, bbox). Dos objetos reales
--    distintos nunca comparten bbox+clase+nivel, así que esto solo colapsa duplicados
--    de doble-procesado, nunca detecciones legítimas.
CREATE UNIQUE INDEX IF NOT EXISTS detections_unique_per_image
  ON public.detections (image_id, source, label, x, y, width, height);
