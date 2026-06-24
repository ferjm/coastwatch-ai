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
import { ImageDetailModal } from './ImageDetailModal';

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
  edgeMs?: number;
  cloudMs?: number | null;
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
  const itemsPerPage = 12;

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

      {/* Image Detail Modal (componente compartido con el Mapa) */}
      <ImageDetailModal
        image={selectedImage}
        images={images}
        onSelect={setSelectedImage}
        onClose={() => setSelectedImage(null)}
        onReprocess={onReprocess}
        onDelete={onDelete}
        onDownload={onDownload}
        resolveFullImage={resolveFullImage}
      />
    </>
  );
}