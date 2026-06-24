import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlasticDetectionMap, MapDetection } from '@/components/PlasticDetectionMap';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Cpu, Cloud } from 'lucide-react';
import { loadMapPoints, pointCountForSource, type MapPoint, type SourceFilter } from '@/services/analyticsService';
import { supabase } from '@/integrations/supabase/client';
import { ImageDetailModal } from '@/components/ImageDetailModal';
import type { ProcessedImage, Detection } from '@/components/InferenceResults';

export default function MapView() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [source, setSource] = useState<SourceFilter>('both');
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);

  useEffect(() => {
    loadMapPoints()
      .then(setPoints)
      .catch((e) => toast({ title: 'Error cargando mapa', description: String(e), variant: 'destructive' }));
  }, []);

  const detections: MapDetection[] = points
    .map((p) => ({ ...p, count: pointCountForSource(p, source) }))
    .filter((p) => p.count > 0)
    .map((p) => ({
      id: p.id, lat: p.lat, lng: p.lng, confidence: 1, imageUrl: '/placeholder.svg',
      detectedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
      description: `${p.fileName} — ${p.count} (${source})`,
      count: p.count, source,
    }));

  // Resuelve la URL firmada (1h) de la imagen original (bucket privado) para el visor.
  const resolveFullImage = async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('images').createSignedUrl(storagePath, 3600);
    if (error) { console.error('No se pudo firmar la URL:', error); return null; }
    return data?.signedUrl ?? null;
  };

  // Al pulsar un pin, carga la imagen + sus detecciones y abre el MISMO modal de detalle
  // que la página de Subidas (imagen con cajas por nivel, criba H8, latencias, etc.).
  const handleDetectionClick = async (detection: MapDetection) => {
    try {
      const { data: img, error } = await supabase
        .from('images')
        .select('*, detections(*)')
        .eq('id', detection.id)
        .single();
      if (error || !img) throw error ?? new Error('Imagen no encontrada');

      const dets: Detection[] = (img.detections || []).map((d: any) => ({
        id: d.id,
        class: d.label,
        confidence: parseFloat(d.confidence),
        source: d.source,
        bbox: { x: d.x * 100, y: d.y * 100, width: d.width * 100, height: d.height * 100 },
      }));
      const { data: thumb } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(img.thumbnail_path || img.storage_path);
      const status: ProcessedImage['status'] =
        img.status === 'processed' ? 'completed'
        : img.status === 'failed' ? 'failed'
        : img.status === 'processing' ? 'processing' : 'pending';

      setSelectedImage({
        id: img.id,
        fileName: img.file_name,
        fileSize: img.file_size,
        resolution: { width: img.width_px, height: img.height_px },
        uploadedAt: new Date(img.uploaded_at),
        status,
        progress: status === 'completed' ? 100 : 0,
        imageUrl: thumb?.publicUrl ?? '/placeholder.svg',
        storagePath: img.storage_path,
        lat: img.gps_latitude != null ? Number(img.gps_latitude) : null,
        lng: img.gps_longitude != null ? Number(img.gps_longitude) : null,
        capturedAt: img.captured_at ?? null,
        detections: dets,
        edgeCount: img.edge_count ?? undefined,
        cloudCount: img.cloud_count ?? undefined,
        edgeMs: img.edge_ms ?? undefined,
        cloudMs: img.cloud_ms ?? undefined,
        screeningWouldEscalate: img.screening_would_escalate,
        processingTime: img.processed_at
          ? Math.round((new Date(img.processed_at).getTime() - new Date(img.uploaded_at).getTime()) / 1000)
          : undefined,
      });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  const edgeTotal = points.reduce((a, p) => a + p.edgeCount, 0);
  const cloudTotal = points.reduce((a, p) => a + p.cloudCount, 0);

  const sourceLabels: Record<SourceFilter, string> = {
    edge: 'Edge',
    cloud: 'Cloud',
    both: t('layerBoth'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('detectionMap')}</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {t('imagesWithPlastic')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{detections.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4" style={{ color: '#EC4899' }} />
              {t('edgeDetectionsLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#EC4899' }}>{edgeTotal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cloud className="h-4 w-4" style={{ color: '#06B6D4' }} />
              {t('cloudDetectionsLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#06B6D4' }}>{cloudTotal}</div>
          </CardContent>
        </Card>
      </div>

      {/* Source Filter */}
      <div className="flex gap-2">
        {(['edge', 'cloud', 'both'] as SourceFilter[]).map((s) => (
          <Button
            key={s}
            variant={source === s ? 'default' : 'outline'}
            onClick={() => setSource(s)}
          >
            {sourceLabels[s]}
          </Button>
        ))}
      </div>

      {/* Map */}
      <PlasticDetectionMap
        detections={detections}
        onDetectionClick={handleDetectionClick}
      />

      {/* Detalle de la imagen del pin — mismo modal que en Subidas */}
      <ImageDetailModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        resolveFullImage={resolveFullImage}
      />
    </div>
  );
}
