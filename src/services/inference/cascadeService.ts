// Orquestador de la cascada: corre ambos niveles por imagen. El cloud es best-effort
// (si falla, se conserva el edge). Registra contadores y la criba analítica (H8).
import { runEdgeInference } from './edgeProvider';
import { runCloudInference } from './cloudProvider';
import type { TieredDetection } from '../detectionMapper';

export interface CascadeResult {
  detections: TieredDetection[];
  edgeCount: number;
  cloudCount: number;
  screeningWouldEscalate: boolean;
  // Latencia observada por nivel (ms). edgeMs siempre presente; cloudMs es null si el
  // Nivel 2 no llegó a ejecutarse (fallo/timeout best-effort). Soporte de H8 (Cap. 5 TFM).
  edgeMs?: number;
  cloudMs?: number | null;
}

export function buildCascadeResult(
  edge: TieredDetection[],
  cloud: TieredDetection[],
  timing?: { edgeMs?: number; cloudMs?: number | null },
): CascadeResult {
  return {
    detections: [...edge, ...cloud],
    edgeCount: edge.length,
    cloudCount: cloud.length,
    // Criba H8: ¿la criba edge habría escalado esta imagen? (la cascada corre ambos igualmente)
    screeningWouldEscalate: edge.length > 0,
    edgeMs: timing?.edgeMs,
    cloudMs: timing?.cloudMs,
  };
}

// Evita que un nivel se cuelgue indefinidamente (cold start del Space, WASM atascado, red).
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: timeout tras ${ms} ms`)), ms),
    ),
  ]);
}

const EDGE_TIMEOUT_MS = 60_000;
const CLOUD_TIMEOUT_MS = 60_000;

export async function runCascade(file: File): Promise<CascadeResult> {
  // Nivel 1 (edge) es el núcleo: si falla o se cuelga, propaga el error (la imagen pasa a 'failed').
  const edgeStart = performance.now();
  const edge = await withTimeout(runEdgeInference(file), EDGE_TIMEOUT_MS, 'edge');
  const edgeMs = Math.round(performance.now() - edgeStart);

  // Nivel 2 (cloud) es best-effort: no tumba la subida si falla (cold start, créditos, red).
  let cloud: TieredDetection[] = [];
  let cloudMs: number | null = null;
  try {
    const cloudStart = performance.now();
    cloud = await withTimeout(runCloudInference(file), CLOUD_TIMEOUT_MS, 'cloud');
    cloudMs = Math.round(performance.now() - cloudStart);
  } catch (e) {
    console.error('Cloud inference falló/timeout (best-effort, se conserva el edge):', e);
  }

  return buildCascadeResult(edge, cloud, { edgeMs, cloudMs });
}
