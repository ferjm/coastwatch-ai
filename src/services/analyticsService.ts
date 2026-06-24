export type SourceFilter = 'both' | 'edge' | 'cloud';

export const SOURCE_COLORS = { edge: '#EC4899', cloud: '#06B6D4', both: '#3B82F6' } as const;

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  fileName: string;
  edgeCount: number;
  cloudCount: number;
  capturedAt?: string;
  thumbnailPath: string | null;
}

export interface ImageAgg {
  status: string;
  capturedAt?: string;
  uploadedAt: string;
  edgeCount: number;
  cloudCount: number;
  screeningWouldEscalate: boolean | null;
  edgeMs?: number | null;
  cloudMs?: number | null;
}

export interface DashboardStats {
  totalImages: number;
  processedImages: number;
  edgeDetections: number;
  cloudDetections: number;
  imagesWithPlastic: number;
  escalationRate: number;
  // Latencia media observada por nivel (ms), sobre las imágenes con medición. null si no hay datos.
  avgEdgeMs: number | null;
  avgCloudMs: number | null;
  bySource: { name: string; count: number; color: string }[];
  timeline: { date: string; detections: number }[];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, v) => a + v, 0) / values.length);
}

export function pointCountForSource(p: { edgeCount: number; cloudCount: number }, source: SourceFilter): number {
  if (source === 'edge') return p.edgeCount;
  if (source === 'cloud') return p.cloudCount;
  return p.edgeCount + p.cloudCount;
}

export function aggregateDashboardStats(images: ImageAgg[]): DashboardStats {
  const totalImages = images.length;
  const processedImages = images.filter((i) => i.status === 'processed').length;
  const edgeDetections = images.reduce((a, i) => a + i.edgeCount, 0);
  const cloudDetections = images.reduce((a, i) => a + i.cloudCount, 0);
  const imagesWithPlastic = images.filter((i) => i.edgeCount + i.cloudCount > 0).length;
  const withFlag = images.filter((i) => i.screeningWouldEscalate != null);
  const escalated = withFlag.filter((i) => i.screeningWouldEscalate === true).length;
  const escalationRate = withFlag.length ? Math.round((escalated / withFlag.length) * 100) : 0;
  const avgEdgeMs = mean(images.map((i) => i.edgeMs).filter((v): v is number => v != null));
  const avgCloudMs = mean(images.map((i) => i.cloudMs).filter((v): v is number => v != null));

  const byDay = new Map<string, number>();
  for (const i of images) {
    const iso = i.capturedAt ?? i.uploadedAt;
    const date = iso.slice(0, 10);
    const n = i.edgeCount + i.cloudCount;
    if (n > 0) byDay.set(date, (byDay.get(date) ?? 0) + n);
  }
  const timeline = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, detections]) => ({ date, detections }));

  return {
    totalImages, processedImages, edgeDetections, cloudDetections, imagesWithPlastic, escalationRate,
    avgEdgeMs, avgCloudMs,
    bySource: [
      { name: 'Edge', count: edgeDetections, color: SOURCE_COLORS.edge },
      { name: 'Cloud', count: cloudDetections, color: SOURCE_COLORS.cloud },
    ],
    timeline,
  };
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase
    .from('images')
    .select('status, captured_at, uploaded_at, edge_count, cloud_count, screening_would_escalate, edge_ms, cloud_ms');
  if (error) throw new Error(`loadDashboardStats: ${error.message}`);
  const images: ImageAgg[] = (data ?? []).map((i: any) => ({
    status: i.status,
    capturedAt: i.captured_at ?? undefined,
    uploadedAt: i.uploaded_at,
    edgeCount: i.edge_count ?? 0,
    cloudCount: i.cloud_count ?? 0,
    screeningWouldEscalate: i.screening_would_escalate,
    edgeMs: i.edge_ms ?? null,
    cloudMs: i.cloud_ms ?? null,
  }));
  return aggregateDashboardStats(images);
}

export async function loadMapPoints(): Promise<MapPoint[]> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase
    .from('images')
    .select('id, file_name, gps_latitude, gps_longitude, captured_at, thumbnail_path, edge_count, cloud_count')
    .not('gps_latitude', 'is', null)
    .not('gps_longitude', 'is', null);
  if (error) throw new Error(`loadMapPoints: ${error.message}`);
  return (data ?? []).map((i: any) => ({
    id: i.id,
    lat: Number(i.gps_latitude),
    lng: Number(i.gps_longitude),
    fileName: i.file_name,
    edgeCount: i.edge_count ?? 0,
    cloudCount: i.cloud_count ?? 0,
    capturedAt: i.captured_at ?? undefined,
    thumbnailPath: i.thumbnail_path ?? null,
  }));
}
