import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  EyeOff, 
  Download, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Image as ImageIcon,
  Target,
  Zap
} from 'lucide-react';

export interface Detection {
  id: string;
  class: string;
  confidence: number;
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
  processingTime?: number;
  resolution?: { width: number; height: number };
  detections: Detection[];
  error?: string;
}

interface InferenceResultsProps {
  images: ProcessedImage[];
  onReprocess?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  onDownload?: (imageId: string) => void;
}

export function InferenceResults({ 
  images, 
  onReprocess, 
  onDelete, 
  onDownload 
}: InferenceResultsProps) {
  const { t } = useTranslation();
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<Record<string, boolean>>({});

  const toggleBoundingBoxes = (imageId: string) => {
    setShowBoundingBoxes(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('recentUploads')}</h2>
        <p className="text-sm text-muted-foreground">
          {images.length} {t('uploadedImages')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {images.map((image) => {
          const colors = getDetectionClassColors();
          const uniqueClasses = [...new Set(image.detections.map(d => d.class))];
          
          return (
            <Card key={image.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{image.fileName}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{formatFileSize(image.fileSize)}</span>
                      {image.resolution && (
                        <span>{image.resolution.width}×{image.resolution.height}</span>
                      )}
                      <span>{new Date(image.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(image.status)}>
                    {getStatusText(image.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Image with Bounding Boxes */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={image.imageUrl}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Bounding Boxes Overlay */}
                  {showBoundingBoxes[image.id] && image.detections.length > 0 && (
                    <div className="absolute inset-0">
                      {image.detections.map((detection, index) => {
                        const colorIndex = uniqueClasses.indexOf(detection.class) % colors.length;
                        const color = colors[colorIndex];
                        
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
                  )}
                </div>

                {/* Progress Bar for Processing */}
                {image.status === 'processing' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('processingStatus')}</span>
                      <span>{image.progress}%</span>
                    </div>
                    <Progress value={image.progress} className="h-2" />
                  </div>
                )}

                {/* Detection Results */}
                {image.status === 'completed' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {image.detections.length} {t('detectionsFound')}
                        </span>
                      </div>
                      {image.processingTime && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatProcessingTime(image.processingTime)}
                        </div>
                      )}
                    </div>

                    {/* Detection Classes */}
                    {uniqueClasses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {uniqueClasses.map((className, index) => {
                          const colorIndex = index % colors.length;
                          const color = colors[colorIndex];
                          const classDetections = image.detections.filter(d => d.class === className);
                          const avgConfidence = classDetections.reduce((acc, d) => acc + d.confidence, 0) / classDetections.length;
                          
                          return (
                            <Badge 
                              key={className}
                              variant="outline"
                              className="text-xs"
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
                    )}
                  </div>
                )}

                {/* Error State */}
                {image.status === 'failed' && image.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{image.error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {image.detections.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBoundingBoxes(image.id)}
                      >
                        {showBoundingBoxes[image.id] ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            {t('hideBoundingBoxes')}
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            {t('showBoundingBoxes')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {image.status === 'completed' && onDownload && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownload(image.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {(image.status === 'failed' || image.status === 'completed') && onReprocess && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReprocess(image.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(image.id)}
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
    </div>
  );
}