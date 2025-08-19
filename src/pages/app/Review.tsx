import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageItem, Detection } from '@/types';
import { 
  Grid, 
  List, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit,
  MousePointer,
  Trash2,
  Plus,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data for images ready for review
const mockReviewImages: (ImageItem & { detections: Detection[] })[] = [
  {
    id: '1',
    fileName: 'ocean_plastic_1.jpg',
    widthPx: 1920,
    heightPx: 1080,
    status: 'processed',
    hash: 'hash1',
    uploadedAt: new Date(Date.now() - 1200000).toISOString(),
    processedAt: new Date(Date.now() - 60000).toISOString(),
    thumbUrl: '/placeholder.svg',
    detections: [
      {
        id: 'd1',
        imageId: '1',
        score: 0.95,
        bbox: { x: 100, y: 150, w: 80, h: 120 },
        reviewerLabel: 'pending',
        verified: false
      },
      {
        id: 'd2',
        imageId: '1',
        score: 0.87,
        bbox: { x: 300, y: 200, w: 60, h: 90 },
        reviewerLabel: 'pending',
        verified: false
      }
    ]
  },
  {
    id: '2',
    fileName: 'beach_debris_2.jpg',
    widthPx: 1920,
    heightPx: 1080,
    status: 'processed',
    hash: 'hash2',
    uploadedAt: new Date(Date.now() - 1800000).toISOString(),
    processedAt: new Date(Date.now() - 300000).toISOString(),
    thumbUrl: '/placeholder.svg',
    detections: [
      {
        id: 'd3',
        imageId: '2',
        score: 0.72,
        bbox: { x: 200, y: 100, w: 40, h: 50 },
        reviewerLabel: 'pending',
        verified: false
      }
    ]
  }
];

export default function Review() {
  const { t } = useTranslation();
  const [images, setImages] = useState(mockReviewImages);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<(typeof mockReviewImages)[0] | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing in inputs
      }

      switch (e.key) {
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSelectAll();
          }
          break;
        case 'Escape':
          handleClearSelection();
          break;
        case 'Enter':
          if (selectedImages.size > 0) {
            handleBatchApprove();
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedImages.size > 0) {
            handleBatchReject();
          }
          break;
        case 'g':
          setViewMode('grid');
          break;
        case 'l':
          setViewMode('list');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedImages]);

  const handleSelectImage = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedImages(new Set());
  };

  const handleBatchApprove = () => {
    const count = selectedImages.size;
    setImages(prev => prev.map(img => 
      selectedImages.has(img.id) 
        ? { 
            ...img, 
            status: 'reviewed' as const,
            reviewedAt: new Date().toISOString(),
            detections: img.detections.map(det => ({
              ...det, 
              reviewerLabel: 'accepted' as const,
              verified: true,
              reviewedAt: new Date().toISOString()
            }))
          }
        : img
    ));
    setSelectedImages(new Set());
    toast.success(t('approvedImages', { count }));
  };

  const handleBatchReject = () => {
    const count = selectedImages.size;
    setImages(prev => prev.filter(img => !selectedImages.has(img.id)));
    setSelectedImages(new Set());
    toast.success(t('rejectedImages', { count }));
  };

  const handleEditImage = (image: typeof mockReviewImages[0]) => {
    setSelectedImage(image);
    setIsEditMode(true);
  };

  const handleViewImage = (image: typeof mockReviewImages[0]) => {
    setSelectedImage(image);
    setIsEditMode(false);
  };

  // Filter images based on verification status
  const filteredImages = images.filter(image => {
    if (showVerifiedOnly && !showUnverifiedOnly) {
      return image.detections.some(d => d.verified);
    }
    if (showUnverifiedOnly && !showVerifiedOnly) {
      return image.detections.some(d => !d.verified);
    }
    return true; // Show all if both or neither are selected
  });

  const pendingImages = filteredImages.filter(img => img.status === 'processed');
  const reviewedImages = filteredImages.filter(img => img.status === 'reviewed');
  
  const verifiedCount = images.filter(img => img.detections.some(d => d.verified)).length;
  const unverifiedCount = images.filter(img => img.detections.some(d => !d.verified)).length;

  const GridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {pendingImages.map((image) => (
        <Card key={image.id} className="relative group hover:shadow-lg transition-shadow">
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={selectedImages.has(image.id)}
              onCheckedChange={() => handleSelectImage(image.id)}
              className="bg-background border-2"
            />
          </div>
          
          <div className="relative">
            <img
              src={image.thumbUrl}
              alt={image.fileName}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            
            {/* Detection overlay */}
            <div className="absolute inset-0">
              {image.detections.map((detection) => (
                 <div
                  key={detection.id}
                  className="absolute border-2 border-primary bg-primary/20"
                  style={{
                    left: `${(detection.bbox.x / image.widthPx) * 100}%`,
                    top: `${(detection.bbox.y / image.heightPx) * 100}%`,
                    width: `${(detection.bbox.w / image.widthPx) * 100}%`,
                    height: `${(detection.bbox.h / image.heightPx) * 100}%`
                  }}
                >
                  <Badge className="absolute -top-6 -left-1 text-xs">
                    Plástico ({Math.round(detection.score * 100)}%)
                  </Badge>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => handleViewImage(image)}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleEditImage(image)}>
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <CardContent className="p-3">
            <p className="font-medium text-sm truncate">{image.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {image.detections.length} detection{image.detections.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(image.processedAt!).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="space-y-2">
      {pendingImages.map((image) => (
        <Card key={image.id} className="p-4">
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={selectedImages.has(image.id)}
              onCheckedChange={() => handleSelectImage(image.id)}
            />
            
            <img
              src={image.thumbUrl}
              alt={image.fileName}
              className="h-16 w-16 object-cover rounded"
            />
            
            <div className="flex-1">
              <p className="font-medium">{image.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {image.detections.length} detection{image.detections.length !== 1 ? 's' : ''} • 
                {new Date(image.processedAt!).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {image.detections.map((detection) => (
                <Badge key={detection.id} variant="outline">
                  Plástico ({Math.round(detection.score * 100)}%)
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => handleViewImage(image)}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleEditImage(image)}>
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('detectionReview')}</h1>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('pendingReview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingImages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {t('verified')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              {t('pendingVerification')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unverifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalDetections')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {images.reduce((acc, img) => acc + img.detections.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filterDetections')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-verified"
                checked={showVerifiedOnly}
                onCheckedChange={(checked) => {
                  setShowVerifiedOnly(checked);
                  if (checked) setShowUnverifiedOnly(false);
                }}
              />
              <Label htmlFor="show-verified" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t('showVerifiedOnly')}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-unverified"
                checked={showUnverifiedOnly}
                onCheckedChange={(checked) => {
                  setShowUnverifiedOnly(checked);
                  if (checked) setShowVerifiedOnly(false);
                }}
              />
              <Label htmlFor="show-unverified" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                {t('showUnverifiedOnly')}
              </Label>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setShowVerifiedOnly(false);
                setShowUnverifiedOnly(false);
              }}
              disabled={!showVerifiedOnly && !showUnverifiedOnly}
            >
              {t('showAll')}
            </Button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t('showing')} {filteredImages.length} {t('of')} {images.length} {t('images')}
            </Badge>
            {showVerifiedOnly && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                {t('verifiedOnly')}
              </Badge>
            )}
            {showUnverifiedOnly && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {t('unverifiedOnly')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection Controls */}
      {selectedImages.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClearSelection}>
                  {t('clearSelection')}
                </Button>
                <Button variant="default" size="sm" onClick={handleBatchApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('approveSelected')}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBatchReject}>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('rejectSelected')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyboard Shortcuts Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('keyboardShortcuts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+A</kbd> {t('selectAll')}</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> {t('clearSelection')}</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> {t('approveSelected')}</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Del</kbd> {t('rejectSelected')}</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">G</kbd> {t('gridView')}</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">L</kbd> {t('listView')}</div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('imagesForReview')}</CardTitle>
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            <MousePointer className="h-4 w-4 mr-2" />
            {selectedImages.size === images.length ? t('deselectAll') : t('selectAll')}
          </Button>
        </CardHeader>
        <CardContent>
          {pendingImages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('noImagesForReview')}</p>
            </div>
          ) : (
            viewMode === 'grid' ? <GridView /> : <ListView />
          )}
        </CardContent>
      </Card>

      {/* Image Detail Dialog */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedImage?.fileName} {isEditMode && '- Edit Mode'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedImage.thumbUrl}
                  alt={selectedImage.fileName}
                  className="w-full max-h-96 object-contain"
                />
                
                {/* Detection overlays */}
                {selectedImage.detections.map((detection) => (
                  <div
                    key={detection.id}
                    className="absolute border-2 border-primary bg-primary/20"
                    style={{
                      left: `${(detection.bbox.x / selectedImage.widthPx) * 100}%`,
                      top: `${(detection.bbox.y / selectedImage.heightPx) * 100}%`,
                      width: `${(detection.bbox.w / selectedImage.widthPx) * 100}%`,
                      height: `${(detection.bbox.h / selectedImage.heightPx) * 100}%`
                    }}
                  >
                   <Badge className="absolute -top-6 -left-1">
                      Plástico ({Math.round(detection.score * 100)}%)
                    </Badge>
                    
                    {isEditMode && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-8 -right-8 h-6 w-6"
                        onClick={() => {
                          // Remove detection logic here
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">{t('imageInfo')}</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>{t('fileName')}:</strong> {selectedImage.fileName}</p>
                    <p><strong>{t('resolution')}:</strong> {selectedImage.widthPx} × {selectedImage.heightPx}</p>
                    <p><strong>{t('uploaded')}:</strong> {new Date(selectedImage.uploadedAt).toLocaleString()}</p>
                    <p><strong>{t('processed')}:</strong> {new Date(selectedImage.processedAt!).toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">{t('detections')}</h4>
                  <div className="space-y-2">
                    {selectedImage.detections.map((detection) => (
        <div key={detection.id} className="p-2 bg-muted rounded">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Plástico</Badge>
            <span className="text-sm">{Math.round(detection.score * 100)}%</span>
          </div>
        </div>
                    ))}
                  </div>
                  
                  {isEditMode && (
                    <Button className="w-full mt-2" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('addDetection')}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                {isEditMode ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      {t('cancel')}
                    </Button>
                    <Button onClick={() => setSelectedImage(null)}>
                      {t('saveChanges')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditMode(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('editDetections')}
                    </Button>
                    <Button variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('reject')}
                    </Button>
                    <Button>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('approve')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}