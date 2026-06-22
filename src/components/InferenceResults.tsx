import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Eye, 
  EyeOff, 
  Download, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Image as ImageIcon,
  Target,
  Zap,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Loader2,
  AlertCircle
} from 'lucide-react';

export interface Detection {
  id: string;
  class: string;
  confidence: number;
  source?: 'edge' | 'cloud';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessedImage {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  imageUrl: string;
  storagePath?: string;
  processingTime?: number;
  resolution?: { width: number; height: number };
  lat?: number | null;
  lng?: number | null;
  capturedAt?: string | null;
  detections: Detection[];
  edgeCount?: number;
  cloudCount?: number;
  screeningWouldEscalate?: boolean | null;
  error?: string;
}

// Colores por nivel de inferencia (alto contraste sobre arena/vegetación).
const SOURCE_COLORS: Record<'edge' | 'cloud', string> = { edge: '#EC4899', cloud: '#06B6D4' };
const sourceColor = (source?: 'edge' | 'cloud') => (source ? SOURCE_COLORS[source] : '#3B82F6');

interface InferenceResultsProps {
  images: ProcessedImage[];
  onReprocess?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  onDownload?: (imageId: string) => void;
  /** Resuelve la URL (firmada) de la imagen original a resolución completa para el modal. */
  resolveFullImage?: (storagePath: string) => Promise<string | null>;
}

export function InferenceResults({
  images,
  onReprocess,
  onDelete,
  onDownload,
  resolveFullImage,
}: InferenceResultsProps) {
  const { t } = useTranslation();
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);
  const [layer, setLayer] = useState<'both' | 'edge' | 'cloud'>('both');
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const itemsPerPage = 12;

  // Atajos de teclado con el modal abierto: zoom (+/=  -/_  0) y navegación (← →).
  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); transformRef.current?.zoomIn(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); transformRef.current?.zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); transformRef.current?.resetTransform(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = images.findIndex((im) => im.id === selectedImage.id);
        if (idx === -1) return;
        const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        if (nextIdx >= 0 && nextIdx < images.length) {
          transformRef.current?.resetTransform();
          setSelectedImage(images[nextIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage, images]);

  // Al abrir el modal, carga la imagen original a resolución completa (URL firmada).
  // Mientras llega, se muestra la miniatura (imageUrl) como placeholder.
  useEffect(() => {
    let active = true;
    setFullImageSrc(null);
    const path = selectedImage?.storagePath;
    if (path && resolveFullImage) {
      resolveFullImage(path).then((url) => {
        if (active) setFullImageSrc(url);
      }).catch(() => {
        /* si falla, se queda la miniatura */
      });
    }
    return () => { active = false; };
  }, [selectedImage, resolveFullImage]);

  const toggleBoundingBoxes = (imageId: string) => {
    setShowBoundingBoxes(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  };

  // Pagination logic
  const totalPages = Math.ceil(images.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedImages = images.slice(startIndex, endIndex);

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('pendingInference');
      case 'processing': return t('processingInference');
      case 'completed': return t('completedInference');
      case 'failed': return t('failed');
      default: return status;
    }
  };

  const getDetectionClassColors = () => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green  
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#06B6D4', // cyan
      '#F97316', // orange
      '#84CC16', // lime
    ];
    return colors;
  };

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="mx-auto h-12 w-12 mb-4" />
            <p>{t('noDetections')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('recentUploads')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {images.length} {t('uploadedImages')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-2">
            {paginatedImages.map((image) => {
              const colors = getDetectionClassColors();
              const uniqueClasses = [...new Set(image.detections.map(d => d.class))];
              
              return (
                <Card 
                  key={image.id} 
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={image.imageUrl}
                          alt={image.fileName}
                          className="w-full h-full object-cover"
                        />
                        {image.status === 'processing' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium truncate">{image.fileName}</h3>
                          <Badge className={getStatusColor(image.status)}>
                            {getStatusText(image.status)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span>{formatFileSize(image.fileSize)}</span>
                          {image.resolution && (
                            <span>{image.resolution.width}×{image.resolution.height}</span>
                          )}
                          <span>{new Date(image.uploadedAt).toLocaleDateString()}</span>
                          {image.processingTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatProcessingTime(image.processingTime)}
                            </span>
                          )}
                        </div>

                        {image.status === 'completed' && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Target className="h-3 w-3 text-green-600" />
                              <span className="font-medium">{image.detections.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {uniqueClasses.slice(0, 3).map((className, index) => {
                                const colorIndex = index % colors.length;
                                const color = colors[colorIndex];
                                const classDetections = image.detections.filter(d => d.class === className);
                                
                                return (
                                  <Badge 
                                    key={className}
                                    variant="outline"
                                    className="text-xs px-1.5 py-0"
                                    style={{ 
                                      borderColor: color, 
                                      color: color,
                                      backgroundColor: `${color}10`
                                    }}
                                  >
                                    {className} ({classDetections.length})
                                  </Badge>
                                );
                              })}
                              {uniqueClasses.length > 3 && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  +{uniqueClasses.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {image.error && (
                          <p className="text-sm text-destructive mt-1">{image.error}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {image.status === 'completed' && onDownload && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload(image.id);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {onDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(image.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {paginatedImages.map((image) => {
              const colors = getDetectionClassColors();
              const uniqueClasses = [...new Set(image.detections.map(d => d.class))];
              
              return (
                <Card 
                  key={image.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">
                          {image.fileName}
                        </CardTitle>
                        <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(image.fileSize)}</span>
                          {image.resolution && (
                            <span>{image.resolution.width}×{image.resolution.height}</span>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(image.status)}>
                        {getStatusText(image.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {/* Image Thumbnail */}
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={image.imageUrl}
                        alt={image.fileName}
                        className="w-full h-full object-cover"
                      />
                      {image.status === 'processing' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Detection Count */}
                    {image.status === 'completed' && image.detections.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium">
                          {image.detections.length} {t('detectionsFound')}
                        </span>
                      </div>
                    )}

                    {/* Error State */}
                    {image.status === 'failed' && image.error && (
                      <p className="text-xs text-destructive">{image.error}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedImage.fileName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Imagen con zoom/pan. Las cajas (en %) van DENTRO del contenedor transformado,
                  así escalan y se desplazan junto con la imagen y siguen alineadas.
                  UX: rueda del ratón, doble click, arrastrar para pan, botones +/−/reset y
                  atajos de teclado +, −, 0. */}
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
                        {l === 'both' ? 'Ambos' : l === 'edge' ? 'Edge' : 'Cloud'}
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
                        src={fullImageSrc || selectedImage.imageUrl}
                        alt={selectedImage.fileName}
                        className="block w-full h-auto select-none"
                        draggable={false}
                      />

                      {/* Overlay de cajas (en % de la imagen), coloreadas por nivel y filtradas por capa */}
                      {(() => {
                        const visible = selectedImage.detections.filter(
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

              {/* Image Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Niveles:</span>{' '}
                  <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.edge, color: SOURCE_COLORS.edge }}>
                    {selectedImage.edgeCount ?? 0} edge
                  </Badge>{' '}
                  <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.cloud, color: SOURCE_COLORS.cloud }}>
                    {selectedImage.cloudCount ?? 0} cloud
                  </Badge>
                </div>
                {selectedImage.screeningWouldEscalate != null && (
                  <div>
                    <span className="text-muted-foreground">Criba (H8):</span>{' '}
                    <Badge variant={selectedImage.screeningWouldEscalate ? 'default' : 'secondary'}>
                      {selectedImage.screeningWouldEscalate
                        ? 'El edge la habría escalado'
                        : 'El edge no vió nada (ahorro / posible falso negativo)'}
                    </Badge>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Size:</span> {formatFileSize(selectedImage.fileSize)}
                </div>
                {selectedImage.resolution && (
                  <div>
                    <span className="text-muted-foreground">Resolution:</span> {selectedImage.resolution.width}×{selectedImage.resolution.height}
                  </div>
                )}
                {selectedImage.capturedAt && (
                  <div>
                    <span className="text-muted-foreground">{t('captured') || 'Captura'}:</span>{' '}
                    {new Date(selectedImage.capturedAt).toLocaleString()}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Uploaded:</span> {new Date(selectedImage.uploadedAt).toLocaleString()}
                </div>
                {selectedImage.processingTime && (
                  <div>
                    <span className="text-muted-foreground">Processing time:</span> {formatProcessingTime(selectedImage.processingTime)}
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('location') || 'Ubicación'}:</span>{' '}
                  {typeof selectedImage.lat === 'number' && typeof selectedImage.lng === 'number' ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedImage.lat},${selectedImage.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedImage.lat.toFixed(5)}, {selectedImage.lng.toFixed(5)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">sin coordenadas GPS</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                ← → para navegar entre imágenes · rueda/+/− para zoom
              </p>

              {/* Estado del procesado: indicador para imágenes que aún no están completas */}
              {selectedImage.status !== 'completed' && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  {selectedImage.status === 'failed' ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">
                        {selectedImage.error || t('processingFailed') || 'Error al procesar'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {selectedImage.status === 'processing'
                          ? t('processing') || 'Procesando…'
                          : t('queued') || 'En cola…'}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Detection Summary — cuenta y agrupa según la capa visible (Ambos/Edge/Cloud) */}
              {selectedImage.status === 'completed' && (() => {
                const visible = selectedImage.detections.filter(
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
                      const colors = getDetectionClassColors();
                      const colorIndex = index % colors.length;
                      const color = colors[colorIndex];
                      const classDetections = visible.filter(d => d.class === className);
                      const avgConfidence = classDetections.reduce((acc, d) => acc + d.confidence, 0) / classDetections.length;

                      return (
                        <Badge
                          key={className}
                          variant="outline"
                          style={{
                            borderColor: color,
                            color: color,
                            backgroundColor: `${color}10`
                          }}
                        >
                          {className} ({classDetections.length}) {Math.round(avgConfidence * 100)}%
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedImage.status === 'completed' && onDownload && (
                  <Button
                    variant="outline"
                    onClick={() => onDownload(selectedImage.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                {(selectedImage.status === 'failed' || selectedImage.status === 'completed') && onReprocess && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onReprocess(selectedImage.id);
                      setSelectedImage(null);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocess
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onDelete(selectedImage.id);
                      setSelectedImage(null);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}