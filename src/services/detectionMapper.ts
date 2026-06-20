// Mapeo de detecciones de dos niveles (edge/cloud) a filas de la tabla `detections`.
// Nota: la normalización de coordenadas a fracciones 0–1 se implementa en F3.
// En F1 las coordenadas se guardan tal cual las produce cada nivel.

export const EDGE_MODEL_ID = 'fomo-320';

export interface TieredDetection {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'edge' | 'cloud';
  model?: string;
}

export interface DetectionRow {
  image_id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'edge' | 'cloud';
  model: string | null;
}

export function buildDetectionRows(imageId: string, detections: TieredDetection[]): DetectionRow[] {
  return detections.map((d) => ({
    image_id: imageId,
    label: d.label,
    confidence: d.confidence,
    x: d.x,
    y: d.y,
    width: d.width,
    height: d.height,
    source: d.source,
    model: d.model ?? null,
  }));
}

export function toEdgeDetections(
  detections: { label: string; confidence: number; x: number; y: number; width: number; height: number }[],
): TieredDetection[] {
  return detections.map((d) => ({ ...d, source: 'edge' as const, model: EDGE_MODEL_ID }));
}
