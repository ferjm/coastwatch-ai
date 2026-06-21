// Normalización pura de la respuesta de Roboflow (object-detection) a detecciones
// en fracciones 0–1, esquina superior-izquierda. Sin APIs de Deno: testeable con vitest.

export const CLOUD_MODEL_ID = 'rfdetr-medium-v6';

export interface RoboflowPrediction {
  x: number;       // centro X en px
  y: number;       // centro Y en px
  width: number;   // px
  height: number;  // px
  confidence: number;
  class: string;
}

export interface RoboflowResponse {
  image: { width: number; height: number };
  predictions: RoboflowPrediction[];
}

export interface CloudDetection {
  label: string;
  confidence: number;
  x: number;      // fracción 0–1, esquina superior-izquierda
  y: number;
  width: number;  // fracción 0–1
  height: number; // fracción 0–1
  source: 'cloud';
  model: string;
}

export function normalizeRoboflowResponse(resp: RoboflowResponse): CloudDetection[] {
  const iw = resp.image.width;
  const ih = resp.image.height;
  return resp.predictions.map((p) => ({
    label: p.class,
    confidence: p.confidence,
    x: (p.x - p.width / 2) / iw,
    y: (p.y - p.height / 2) / ih,
    width: p.width / iw,
    height: p.height / ih,
    source: 'cloud' as const,
    model: CLOUD_MODEL_ID,
  }));
}
