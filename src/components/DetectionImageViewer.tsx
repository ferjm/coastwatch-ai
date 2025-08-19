import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, CheckCircle, XCircle, Trash2, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { MapDetection } from './PlasticDetectionMap';

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
}

export function DetectionImageViewer({ detection, onVerify, onReject, onDelete }: DetectionImageViewerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock bounding boxes for demo
  const boundingBoxes: BoundingBox[] = detection.boundingBoxes || [
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

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.5));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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
              {detection.verified ? 'Verificado' : 'Sin verificar'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Zoom: {Math.round(zoom * 100)}%
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {!detection.verified && (
                <>
                  <Button variant="outline" size="sm" onClick={handleVerify}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Verificar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReject}>
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    Rechazar
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

          {/* Image with bounding boxes */}
          <div 
            ref={containerRef}
            className="relative border-2 border-border rounded-lg overflow-hidden bg-background"
            style={{ height: '500px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute inset-0 cursor-move"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <img
                ref={imageRef}
                src={detection.imageUrl}
                alt="Detection"
                className="w-full h-auto select-none"
                draggable={false}
              />
              
              {/* Bounding boxes */}
              {boundingBoxes.map((box) => (
                <div key={box.id}>
                  {/* Bounding box rectangle - Roboflow style */}
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/10"
                    style={{
                      left: `${box.x}px`,
                      top: `${box.y}px`,
                      width: `${box.width}px`,
                      height: `${box.height}px`,
                      boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.8)',
                    }}
                  />
                  
                  {/* Confidence label - Roboflow style */}
                  <div
                    className="absolute bg-blue-500 text-white px-2 py-1 text-xs font-medium rounded"
                    style={{
                      left: `${box.x}px`,
                      top: `${box.y - 28}px`,
                      fontSize: '11px',
                      lineHeight: '1',
                    }}
                  >
                    Plástico {Math.round(box.confidence * 100)}%
                  </div>
                  
                  {/* Corner handles - Roboflow style */}
                  <div
                    className="absolute w-2 h-2 bg-blue-500 border border-white"
                    style={{
                      left: `${box.x - 4}px`,
                      top: `${box.y - 4}px`,
                    }}
                  />
                  <div
                    className="absolute w-2 h-2 bg-blue-500 border border-white"
                    style={{
                      left: `${box.x + box.width - 4}px`,
                      top: `${box.y - 4}px`,
                    }}
                  />
                  <div
                    className="absolute w-2 h-2 bg-blue-500 border border-white"
                    style={{
                      left: `${box.x - 4}px`,
                      top: `${box.y + box.height - 4}px`,
                    }}
                  />
                  <div
                    className="absolute w-2 h-2 bg-blue-500 border border-white"
                    style={{
                      left: `${box.x + box.width - 4}px`,
                      top: `${box.y + box.height - 4}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Detection info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Confianza promedio:</span>{' '}
              <Badge variant="outline">
                {Math.round(detection.confidence * 100)}%
              </Badge>
            </div>
            <div>
              <span className="font-medium">Objetos detectados:</span>{' '}
              <Badge variant="outline">
                {boundingBoxes.length}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Coordenadas:</span>{' '}
              {detection.lat.toFixed(4)}, {detection.lng.toFixed(4)}
            </div>
            <div>
              <span className="font-medium">Detectado:</span>{' '}
              {detection.detectedAt.toLocaleDateString()}
            </div>
            {detection.description && (
              <div className="col-span-2">
                <span className="font-medium">Descripción:</span>{' '}
                {detection.description}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}