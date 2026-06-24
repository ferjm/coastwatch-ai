import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Download, RefreshCw, Trash2, Target, Zap, ZoomIn, ZoomOut, Maximize2,
  MapPin, Loader2, AlertCircle,
} from 'lucide-react';
import type { Detection, ProcessedImage } from './InferenceResults';

// Colores por nivel de inferencia (alto contraste sobre arena/vegetación).
export const SOURCE_COLORS: Record<'edge' | 'cloud', string> = { edge: '#EC4899', cloud: '#06B6D4' };
const sourceColor = (source?: 'edge' | 'cloud') => (source ? SOURCE_COLORS[source] : '#3B82F6');

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatProcessingTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const DETECTION_CLASS_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16',
];

interface ImageDetailModalProps {
  /** Imagen seleccionada; si es null el modal está cerrado. */
  image: ProcessedImage | null;
  /** Lista para navegar con ← →. Opcional (p.ej. el mapa abre una sola imagen). */
  images?: ProcessedImage[];
  /** Cambia la imagen mostrada (navegación con teclado). */
  onSelect?: (img: ProcessedImage) => void;
  onClose: () => void;
  onReprocess?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  onDownload?: (imageId: string) => void;
  /** Resuelve la URL (firmada) de la imagen original a resolución completa. */
  resolveFullImage?: (storagePath: string) => Promise<string | null>;
}

/**
 * Modal de detalle de una imagen: visor con zoom/pan, cajas por nivel (edge/cloud),
 * criba H8, latencias, metadatos y resumen de detecciones. Compartido por la página de
 * Subidas y por los pines del Mapa para garantizar exactamente la misma vista.
 */
export function ImageDetailModal({
  image,
  images = [],
  onSelect,
  onClose,
  onReprocess,
  onDelete,
  onDownload,
  resolveFullImage,
}: ImageDetailModalProps) {
  const { t } = useTranslation();
  const [layer, setLayer] = useState<'both' | 'edge' | 'cloud'>('both');
  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const canNavigate = images.length > 1 && !!onSelect;

  // Atajos de teclado con el modal abierto: zoom (+/=  -/_  0) y navegación (← →).
  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); transformRef.current?.zoomIn(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); transformRef.current?.zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); transformRef.current?.resetTransform(); }
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && canNavigate) {
        e.preventDefault();
        const idx = images.findIndex((im) => im.id === image.id);
        if (idx === -1) return;
        const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        if (nextIdx >= 0 && nextIdx < images.length) {
          transformRef.current?.resetTransform();
          onSelect!(images[nextIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image, images, canNavigate, onSelect]);

  // Al abrir, carga la imagen original a resolución completa (URL firmada); mientras
  // llega se muestra la miniatura (imageUrl) como placeholder.
  useEffect(() => {
    let active = true;
    setFullImageSrc(null);
    const path = image?.storagePath;
    if (path && resolveFullImage) {
      resolveFullImage(path)
        .then((url) => { if (active) setFullImageSrc(url); })
        .catch(() => { /* si falla, se queda la miniatura */ });
    }
    return () => { active = false; };
  }, [image, resolveFullImage]);

  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{image.fileName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-muted">
            {/* Controles de zoom */}
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button variant="secondary" size="icon" className="h-8 w-8 shadow"
                onClick={() => transformRef.current?.zoomOut()} title="Alejar (−)">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 shadow"
                onClick={() => transformRef.current?.resetTransform()} title="Restablecer (0)">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 shadow"
                onClick={() => transformRef.current?.zoomIn()} title="Acercar (+)">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Capas (Edge / Cloud / Ambos) + leyenda de colores por nivel */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
              <div className="flex rounded-md overflow-hidden border bg-background/80 backdrop-blur">
                {(['both', 'edge', 'cloud'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayer(l)}
                    className={`px-2 py-1 text-xs transition-colors ${layer === l ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    {l === 'both' ? t('layerBoth') : l === 'edge' ? 'Edge' : 'Cloud'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs bg-background/80 backdrop-blur rounded-md px-2 py-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: SOURCE_COLORS.edge }} />Edge
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: SOURCE_COLORS.cloud }} />Cloud
                </span>
              </div>
            </div>

            <TransformWrapper
              ref={transformRef}
              minScale={1}
              maxScale={12}
              centerOnInit
              doubleClick={{ mode: 'zoomIn', step: 0.7 }}
              wheel={{ step: 0.15 }}
              panning={{ velocityDisabled: true }}
            >
              <TransformComponent
                wrapperStyle={{ width: '100%', maxHeight: '75vh' }}
                contentStyle={{ width: '100%' }}
              >
                <div className="relative w-full">
                  <img
                    src={fullImageSrc || image.imageUrl}
                    alt={image.fileName}
                    className="block w-full h-auto select-none"
                    draggable={false}
                  />

                  {/* Overlay de cajas (en % de la imagen), coloreadas por nivel y filtradas por capa */}
                  {(() => {
                    const visible = image.detections.filter(
                      (d) => layer === 'both' || d.source === layer,
                    );
                    if (visible.length === 0) return null;
                    return (
                      <div className="absolute inset-0">
                        {visible.map((detection) => {
                          const color = sourceColor(detection.source);
                          return (
                            <div
                              key={detection.id}
                              className="absolute border-2 rounded"
                              style={{
                                left: `${detection.bbox.x}%`,
                                top: `${detection.bbox.y}%`,
                                width: `${detection.bbox.width}%`,
                                height: `${detection.bbox.height}%`,
                                borderColor: color,
                              }}
                            >
                              <div
                                className="absolute -top-6 left-0 px-2 py-1 text-xs font-medium text-white rounded text-nowrap"
                                style={{ backgroundColor: color }}
                              >
                                {detection.class} {Math.round(detection.confidence * 100)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>

          {/* Detalles de la imagen */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('levelsLabel')}:</span>{' '}
              <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.edge, color: SOURCE_COLORS.edge }}>
                {image.edgeCount ?? 0} edge
              </Badge>{' '}
              <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.cloud, color: SOURCE_COLORS.cloud }}>
                {image.cloudCount ?? 0} cloud
              </Badge>
            </div>
            {image.screeningWouldEscalate != null && (
              <div>
                <span className="text-muted-foreground">{t('screeningH8')}:</span>{' '}
                <Badge variant={image.screeningWouldEscalate ? 'default' : 'secondary'}>
                  {image.screeningWouldEscalate
                    ? t('screeningEscalate')
                    : t('screeningNothing')}
                </Badge>
              </div>
            )}
            {(image.edgeMs != null || image.cloudMs != null) && (
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t('latencyLabel')}:</span>{' '}
                {image.edgeMs != null && (
                  <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.edge, color: SOURCE_COLORS.edge }}>
                    edge {image.edgeMs} ms
                  </Badge>
                )}{' '}
                {image.cloudMs != null && (
                  <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.cloud, color: SOURCE_COLORS.cloud }}>
                    cloud {(image.cloudMs / 1000).toFixed(1)} s
                  </Badge>
                )}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('sizeLabel')}:</span> {formatFileSize(image.fileSize)}
            </div>
            {image.resolution && (
              <div>
                <span className="text-muted-foreground">{t('resolutionLabel')}:</span> {image.resolution.width}×{image.resolution.height}
              </div>
            )}
            {image.capturedAt && (
              <div>
                <span className="text-muted-foreground">{t('capturedLabel')}:</span>{' '}
                {new Date(image.capturedAt).toLocaleString()}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('uploadedLabel')}:</span> {new Date(image.uploadedAt).toLocaleString()}
            </div>
            {image.processingTime && (
              <div>
                <span className="text-muted-foreground">{t('processingTime')}:</span> {formatProcessingTime(image.processingTime)}
              </div>
            )}
            <div className="col-span-2">
              <span className="text-muted-foreground">{t('locationLabel')}:</span>{' '}
              {typeof image.lat === 'number' && typeof image.lng === 'number' ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${image.lat},${image.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {image.lat.toFixed(5)}, {image.lng.toFixed(5)}
                </a>
              ) : (
                <span className="text-muted-foreground italic">{t('noGpsCoords')}</span>
              )}
            </div>
          </div>

          {canNavigate && (
            <p className="text-xs text-muted-foreground">
              {t('navHint')}
            </p>
          )}

          {/* Estado del procesado: indicador para imágenes que aún no están completas */}
          {image.status !== 'completed' && (
            <div className="flex items-center gap-2 text-sm font-medium">
              {image.status === 'failed' ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">
                    {image.error || t('processingFailedMsg')}
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {image.status === 'processing'
                      ? t('processing')
                      : t('queued')}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Resumen de detecciones — cuenta y agrupa según la capa visible (Ambos/Edge/Cloud) */}
          {image.status === 'completed' && (() => {
            const visible = image.detections.filter(
              (d) => layer === 'both' || d.source === layer,
            );
            if (visible.length === 0) return null;
            return (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  {visible.length} {t('detectionsFound')}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {[...new Set(visible.map(d => d.class))].map((className, index) => {
                    const color = DETECTION_CLASS_COLORS[index % DETECTION_CLASS_COLORS.length];
                    const classDetections = visible.filter(d => d.class === className);
                    const avgConfidence = classDetections.reduce((acc, d) => acc + d.confidence, 0) / classDetections.length;
                    return (
                      <Badge
                        key={className}
                        variant="outline"
                        style={{ borderColor: color, color, backgroundColor: `${color}10` }}
                      >
                        {className} ({classDetections.length}) {Math.round(avgConfidence * 100)}%
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {image.status === 'completed' && onDownload && (
              <Button variant="outline" onClick={() => onDownload(image.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            {(image.status === 'failed' || image.status === 'completed') && onReprocess && (
              <Button
                variant="outline"
                onClick={() => { onReprocess(image.id); onClose(); }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('reprocess')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={() => { onDelete(image.id); onClose(); }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
