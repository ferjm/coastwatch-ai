import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DetectionImageViewer } from '@/components/DetectionImageViewer';
import {
  CheckCircle,
  XCircle,
  Clock,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Detection {
  id: string;
  lat: number;
  lng: number;
  confidence: number;
  imageUrl: string;
  detectedAt: Date;
  description: string;
  verified: boolean;
  boundingBoxes?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    label?: string;
  }>;
}

export default function Review() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  const currentDetection = detections[currentIndex];
  const hasNext = currentIndex < detections.length - 1;
  const hasPrevious = currentIndex > 0;

  const load = async () => {
    const { data } = await supabase
      .from('images')
      .select('id, file_name, storage_path, gps_latitude, gps_longitude, uploaded_at, detections(id,label,confidence,x,y,width,height,source)')
      .eq('status', 'processed')
      .eq('review_status', 'pending')
      .order('uploaded_at', { ascending: false })
      .limit(50);
    const items: Detection[] = await Promise.all((data ?? []).map(async (img: any) => {
      const { data: signed } = await supabase.storage.from('images').createSignedUrl(img.storage_path, 3600);
      return {
        id: img.id,
        lat: Number(img.gps_latitude ?? 0),
        lng: Number(img.gps_longitude ?? 0),
        confidence: (img.detections ?? []).reduce((m: number, d: any) => Math.max(m, Number(d.confidence)), 0),
        imageUrl: signed?.signedUrl ?? '/placeholder.svg',
        detectedAt: new Date(img.uploaded_at),
        description: `${img.file_name} — ${(img.detections ?? []).length} detección(es)`,
        verified: false,
        boundingBoxes: (img.detections ?? []).map((d: any) => ({
          id: d.id, x: Number(d.x) * 100, y: Number(d.y) * 100,
          width: Number(d.width) * 100, height: Number(d.height) * 100,
          confidence: Number(d.confidence), label: d.label,
        })),
      };
    }));
    setDetections(items);
    setCurrentIndex(0);
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (id: string) => {
    await supabase.from('images').update({ review_status: 'accepted' }).eq('id', id);
    setDetections(prev => prev.filter(d => d.id !== id));
    if (currentIndex >= detections.length - 1 && currentIndex > 0) setCurrentIndex(p => p - 1);
    toast({ title: t('detectionVerified'), description: t('verificationSuccess') });
  };

  const handleReject = async (id: string) => {
    await supabase.from('images').update({ review_status: 'rejected' }).eq('id', id);
    setDetections(prev => prev.filter(d => d.id !== id));
    if (currentIndex >= detections.length - 1 && currentIndex > 0) setCurrentIndex(p => p - 1);
    toast({ title: t('detectionRejected'), description: t('rejectionSuccess') });
  };

  const handleDelete = (id: string) => {
    setDetections(prev => prev.filter(d => d.id !== id));

    // Adjust current index if needed
    if (currentIndex >= detections.length - 1 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }

    toast({
      title: t('detectionDeleted'),
      description: t('deletionSuccess'),
      variant: "destructive"
    });
  };

  const nextDetection = () => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const previousDetection = () => {
    if (hasPrevious) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToDetection = (index: number) => {
    setCurrentIndex(index);
    setViewMode('single');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewMode === 'single' && detections.length > 0) {
        switch (event.key) {
          case 'ArrowRight':
            event.preventDefault();
            nextDetection();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            previousDetection();
            break;
          case 'v':
          case 'V':
            event.preventDefault();
            handleVerify(currentDetection.id);
            break;
          case 'r':
          case 'R':
            event.preventDefault();
            handleReject(currentDetection.id);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewMode, detections, currentDetection, handleVerify, handleReject, nextDetection, previousDetection]);

  const resetQueue = () => {
    load();
    toast({
      title: t('queueReset'),
      description: t('queueResetDescription'),
    });
  };

  if (detections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{t('reviewQueue')}</h1>
          <Button onClick={resetQueue} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetQueue')}
          </Button>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('excellentWork')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('noMoreDetections')}
            </p>
            <Button onClick={resetQueue}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('resetQueueDemo')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('reviewQueue')}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <Clock className="h-4 w-4 mr-1" />
            {detections.length} {t('pending')}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
          >
            {viewMode === 'single' ? (
              <>
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('gridView')}
              </>
            ) : (
              <>
                <Grid3X3 className="h-4 w-4 mr-2" />
                {t('singleView')}
              </>
            )}
          </Button>
        </div>
      </div>

      {viewMode === 'single' ? (
        // Single view mode
        <div className="space-y-6">
          {/* Progress bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {t('reviewProgress')}
                </span>
                <span className="text-sm font-medium">
                  {currentIndex + 1} {t('of')} {detections.length}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / detections.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current detection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {t('detectionInfo')} #{currentIndex + 1}
                  <Badge variant="outline">
                    {Math.round(currentDetection.confidence * 100)}% {t('confidence')}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousDetection}
                    disabled={!hasPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextDetection}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image with bounding boxes */}
                <div className="space-y-4">
                  <DetectionImageViewer
                    detection={currentDetection}
                    onVerify={handleVerify}
                    onReject={handleReject}
                    onDelete={handleDelete}
                    showDirectly={true}
                    editable={true}
                  />

                  {/* Quick actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleVerify(currentDetection.id)}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('verify')}
                    </Button>
                    <Button
                      onClick={() => handleReject(currentDetection.id)}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('reject')}
                    </Button>
                  </div>
                </div>

                {/* Detection details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">{t('detectionInfo')}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('confidence')}:</span>
                        <Badge variant="outline">
                          {Math.round(currentDetection.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('coordinates')}:</span>
                        <span>{currentDetection.lat.toFixed(4)}, {currentDetection.lng.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('detected')}:</span>
                        <span>{currentDetection.detectedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-4 p-2 bg-muted rounded text-xs text-muted-foreground">
                      {t('keyboardShortcuts')}: ← → {t('navigate')}, V {t('verify')}, R {t('reject')}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">{t('detectedObjects')}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{t('plastic')} #1</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(currentDetection.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{t('plastic')} #2</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(currentDetection.confidence * 0.9 * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Grid view mode
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {detections.map((detection, index) => (
            <Card
              key={detection.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => goToDetection(index)}
            >
              <CardContent className="p-4">
                <div className="aspect-video mb-3 overflow-hidden rounded">
                  <img
                    src={detection.imageUrl}
                    alt={`Detection ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{t('detection')} #{index + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(detection.confidence * 100)}%
                </Badge>
                  </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerify(detection.id);
                  }}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('verify')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(detection.id);
                  }}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('reject')}
                </Button>
              </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
