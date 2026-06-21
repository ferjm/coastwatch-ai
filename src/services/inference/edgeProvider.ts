// Nivel 1 (edge): envuelve el WASM de Edge Impulse (mlService) y normaliza las
// detecciones de espacio-modelo (px) a fracciones 0–1 de la imagen original.
import { mlService, type DetectionResult } from '../mlService';
import type { TieredDetection } from '../detectionMapper';
import { useSettingsStore } from '@/stores/settings';

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
  // Umbral de criba configurable (Ajustes). Gobierna el min_score de FOMO y, por coherencia,
  // se filtra la salida: la capa edge y la decisión de criba honran el mismo umbral.
  const threshold = useSettingsStore.getState().edgeScreenThreshold;
  const { detections, inputWidth, inputHeight } = await mlService.processImage(file, threshold);
  return normalizeEdgeDetections(detections, inputWidth, inputHeight).filter(
    (d) => d.confidence >= threshold,
  );
}
