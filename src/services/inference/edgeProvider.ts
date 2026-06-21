// Nivel 1 (edge): envuelve el WASM de Edge Impulse (mlService) y normaliza las
// detecciones de espacio-modelo (px) a fracciones 0–1 de la imagen original.
import { mlService, type DetectionResult } from '../mlService';
import type { TieredDetection } from '../detectionMapper';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function normalizeEdgeDetections(
  raw: DetectionResult[],
  inputWidth: number,
  inputHeight: number,
): TieredDetection[] {
  const w = inputWidth || 1;
  const h = inputHeight || 1;
  return raw.map((d) => ({
    label: d.label,
    confidence: d.confidence,
    x: clamp01(d.x / w),
    y: clamp01(d.y / h),
    width: clamp01(d.width / w),
    height: clamp01(d.height / h),
    source: 'edge' as const,
    model: `fomo-${inputWidth}`,
  }));
}

export async function runEdgeInference(file: File): Promise<TieredDetection[]> {
  const { detections, inputWidth, inputHeight } = await mlService.processImage(file);
  return normalizeEdgeDetections(detections, inputWidth, inputHeight);
}
