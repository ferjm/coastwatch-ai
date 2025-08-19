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
}

interface DetectionImageViewerProps {
  detection: MapDetection & { verified?: boolean; boundingBoxes?: BoundingBox[] };
  onVerify?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDirectly?: boolean;
}

export function DetectionImageViewer({ detection, onVerify, onReject, onDelete, showDirectly = false }: DetectionImageViewerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);

  // Mock bounding boxes for demo
  useEffect(() => {
    const defaultBoxes: BoundingBox[] = detection.boundingBoxes || [
      {
        id: '1',
        x: 120,
        y: 80,
        width: 180,
        height: 120,
        confidence: detection.confidence
      },
      {
        id: '2',
        x: 350,
        y: 200,
        width: 140,
        height: 90,
        confidence: detection.confidence * 0.9
      }
    ];
    setBoundingBoxes(defaultBoxes);
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
            <span>Detección de Plástico</span>
            <Badge variant={detection.verified ? 'default' : 'secondary'}>
              {detection.verified ? t('verified') : 'Sin verificar'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
            <div className="text-sm text-muted-foreground">
              Edita las cajas de detección arrastrando y redimensionando
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
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar detección?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. La detección será eliminada permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Eliminar
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