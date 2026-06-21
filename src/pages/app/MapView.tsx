import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlasticDetectionMap, MapDetection } from '@/components/PlasticDetectionMap';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Cpu, Cloud } from 'lucide-react';
import { loadMapPoints, pointCountForSource, type MapPoint, type SourceFilter } from '@/services/analyticsService';

export default function MapView() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [source, setSource] = useState<SourceFilter>('both');

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
      description: `${p.fileName} — ${p.count} detección(es) ${source}`,
      count: p.count, source,
    }));

  const handleDetectionClick = (detection: MapDetection) => {
    toast({
      title: 'Plástico detectado',
      description: detection.description,
    });
  };

  const edgeTotal = points.reduce((a, p) => a + p.edgeCount, 0);
  const cloudTotal = points.reduce((a, p) => a + p.cloudCount, 0);

  const sourceLabels: Record<SourceFilter, string> = {
    edge: 'Edge',
    cloud: 'Cloud',
    both: 'Ambos',
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
              Imágenes con plástico
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
              Detecciones edge
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
              Detecciones cloud
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
    </div>
  );
}
