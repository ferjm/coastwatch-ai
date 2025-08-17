import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload, UploadFile } from '@/components/ImageUpload';
import { InferenceResults, ProcessedImage, Detection } from '@/components/InferenceResults';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration
const mockProcessedImages: ProcessedImage[] = [
  {
    id: '1',
    fileName: 'coastal_beach_001.jpg',
    fileSize: 2458624, // ~2.4MB
    uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'completed',
    progress: 100,
    imageUrl: '/placeholder.svg', // Would be actual image URL
    processingTime: 45,
    resolution: { width: 1920, height: 1080 },
    detections: [
      {
        id: 'd1',
        class: 'Botellas',
        confidence: 0.89,
        bbox: { x: 15, y: 25, width: 8, height: 12 }
      },
      {
        id: 'd2', 
        class: 'Bolsas',
        confidence: 0.76,
        bbox: { x: 45, y: 35, width: 12, height: 8 }
      },
      {
        id: 'd3',
        class: 'Fragmentos', 
        confidence: 0.92,
        bbox: { x: 70, y: 55, width: 6, height: 4 }
      }
    ]
  },
  {
    id: '2',
    fileName: 'drone_survey_002.jpg',
    fileSize: 3785216, // ~3.7MB
    uploadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    status: 'processing',
    progress: 65,
    imageUrl: '/placeholder.svg',
    resolution: { width: 2048, height: 1536 },
    detections: []
  },
  {
    id: '3',
    fileName: 'beach_cleanup_003.jpg', 
    fileSize: 1924867, // ~1.9MB
    uploadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    status: 'completed',
    progress: 100,
    imageUrl: '/placeholder.svg',
    processingTime: 32,
    resolution: { width: 1600, height: 1200 },
    detections: [
      {
        id: 'd4',
        class: 'Redes',
        confidence: 0.84,
        bbox: { x: 20, y: 40, width: 15, height: 10 }
      }
    ]
  },
  {
    id: '4',
    fileName: 'error_image_004.jpg',
    fileSize: 5123456, // ~5MB  
    uploadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    status: 'failed',
    progress: 0,
    imageUrl: '/placeholder.svg',
    detections: [],
    error: 'Error en el procesamiento: imagen corrupta'
  }
];

export default function Uploads() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>(mockProcessedImages);

  const handleFilesAdded = (files: UploadFile[]) => {
    console.log('Files added:', files);
  };

  const handleUploadComplete = (files: UploadFile[]) => {
    console.log('Upload completed:', files);
    
    // Simulate adding uploaded files to processed images with pending status
    const newProcessedImages: ProcessedImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.file.name,
      fileSize: file.file.size,
      uploadedAt: new Date(),
      status: 'pending' as const,
      progress: 0,
      imageUrl: file.preview,
      detections: []
    }));

    setProcessedImages(prev => [...newProcessedImages, ...prev]);
    
    // Simulate processing after a delay
    setTimeout(() => {
      setProcessedImages(prev => 
        prev.map(img => {
          const newImg = newProcessedImages.find(ni => ni.id === img.id);
          if (newImg) {
            return { ...img, status: 'processing' as const, progress: 25 };
          }
          return img;
        })
      );
    }, 2000);
  };

  const handleReprocess = (imageId: string) => {
    setProcessedImages(prev =>
      prev.map(img =>
        img.id === imageId
          ? { ...img, status: 'pending', progress: 0, error: undefined }
          : img
      )
    );
    
    toast({
      title: t('processingImages'),
      description: `Reprocesando imagen...`,
    });
  };

  const handleDelete = (imageId: string) => {
    setProcessedImages(prev => prev.filter(img => img.id !== imageId));
    
    toast({
      title: t('deleteImage'),
      description: `Imagen eliminada`,
    });
  };

  const handleDownload = (imageId: string) => {
    const image = processedImages.find(img => img.id === imageId);
    if (image) {
      toast({
        title: t('downloadResults'),
        description: `Descargando resultados para ${image.fileName}`,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('uploadImages')}</h1>
      </div>
      
      {/* Upload Section */}
      <ImageUpload 
        onFilesAdded={handleFilesAdded}
        onUploadComplete={handleUploadComplete}
        maxFiles={20}
      />

      {/* Results Section */}
      <InferenceResults
        images={processedImages}
        onReprocess={handleReprocess}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />
    </div>
  );
}