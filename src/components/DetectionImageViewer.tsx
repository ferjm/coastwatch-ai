import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { MapDetection } from './PlasticDetectionMap';
import { EditableBoundingBox } from './EditableBoundingBox';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  id: string;
  label?: string;
}

interface DetectionImageViewerProps {
  detection: MapDetection & { verified?: boolean; boundingBoxes?: BoundingBox[] };
  onVerify?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDirectly?: boolean;
  editable?: boolean;
}

export function DetectionImageViewer({ 
  detection, 
  onVerify, 
  onReject, 
  onDelete, 
  showDirectly = false,
  editable = false 
}: DetectionImageViewerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);

  // Use bounding boxes from detection data or create default ones
  useEffect(() => {
    console.log('DetectionImageViewer - detection:', detection);
    console.log('DetectionImageViewer - boundingBoxes from detection:', detection.boundingBoxes);
    if (detection.boundingBoxes && detection.boundingBoxes.length > 0) {
      console.log('Using detection bounding boxes:', detection.boundingBoxes);
      setBoundingBoxes(detection.boundingBoxes);
    } else {
      // Fallback to default boxes only if none provided
      const defaultBoxes: BoundingBox[] = [
        {
          id: 'default-1',
          x: 100,
          y: 80,
          width: 150,
          height: 100,
          confidence: detection.confidence,
          label: t('plastic')
        },
        {
          id: 'default-2',
          x: 300,
          y: 180,
          width: 120,
          height: 80,
          confidence: detection.confidence * 0.9,
          label: t('plastic')
        }
      ];
      setBoundingBoxes(defaultBoxes);
    }
  }, [detection]);

  const handleVerify = () => {
    onVerify?.(detection.id);
    setIsOpen(false);
  };

  const handleReject = () => {
    onReject?.(detection.id);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete?.(detection.id);
    setIsOpen(false);
  };

  const handleBoundingBoxChange = (newBoxes: BoundingBox[]) => {
    setBoundingBoxes(newBoxes);
  };

  if (showDirectly) {
    return (
      <EditableBoundingBox
        imageUrl={detection.imageUrl}
        boundingBoxes={boundingBoxes}
        onBoundingBoxChange={handleBoundingBoxChange}
        showDirectly={true}
        editable={editable}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          {t('viewImage')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('detectionOfPlastic')}</span>
            <Badge variant={detection.verified ? 'default' : 'secondary'}>
              {detection.verified ? t('verified') : t('unverified')}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
            <div className="text-sm text-muted-foreground">
              {t('editBoxesHint')}
            </div>
            
            <div className="flex items-center space-x-2">
              {!detection.verified && (
                <>
                  <Button variant="outline" size="sm" onClick={handleVerify}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    {t('verify')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReject}>
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    {t('reject')}
                  </Button>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    {t('delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteDetectionTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteDetectionDesc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Editable bounding boxes */}
          <EditableBoundingBox
            imageUrl={detection.imageUrl}
            boundingBoxes={boundingBoxes}
            onBoundingBoxChange={handleBoundingBoxChange}
            editable={true}
          />

          {/* Detection info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">{t('averageConfidence')}:</span>{' '}
              <Badge variant="outline">
                {Math.round(detection.confidence * 100)}%
              </Badge>
            </div>
            <div>
              <span className="font-medium">{t('objectsDetected')}:</span>{' '}
              <Badge variant="outline">
                {boundingBoxes.length}
              </Badge>
            </div>
            <div>
              <span className="font-medium">{t('coordinates')}:</span>{' '}
              {detection.lat.toFixed(4)}, {detection.lng.toFixed(4)}
            </div>
            <div>
              <span className="font-medium">{t('detected')}:</span>{' '}
              {detection.detectedAt.toLocaleDateString()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}