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
}

export function buildCascadeResult(
  edge: TieredDetection[],
  cloud: TieredDetection[],
): CascadeResult {
  return {
    detections: [...edge, ...cloud],
    edgeCount: edge.length,
    cloudCount: cloud.length,
    // Criba H8: ¿la criba edge habría escalado esta imagen? (la cascada corre ambos igualmente)
    screeningWouldEscalate: edge.length > 0,
  };
}

export async function runCascade(file: File): Promise<CascadeResult> {
  // Nivel 1 (edge) es el núcleo: si falla, propaga el error (la subida falla).
  const edge = await runEdgeInference(file);

  // Nivel 2 (cloud) es best-effort: no tumba la subida si falla (cold start, créditos, red).
  let cloud: TieredDetection[] = [];
  try {
    cloud = await runCloudInference(file);
  } catch (e) {
    console.error('Cloud inference falló (best-effort, se conserva el edge):', e);
  }

  return buildCascadeResult(edge, cloud);
}
