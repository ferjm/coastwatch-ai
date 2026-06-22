import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload, UploadFile } from '@/components/ImageUpload';
import { InferenceResults, ProcessedImage, Detection } from '@/components/InferenceResults';
import { useToast } from '@/hooks/use-toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { updateImageStatus, saveDetections, saveCascadeMeta } from '@/services/imageService';
import { runCascade } from '@/services/inference/cascadeService';

export default function Uploads() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { uploads, uploadAndProcess, clearUploads } = useImageUpload();
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load images from database
  useEffect(() => {
    loadImages();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('image-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'images'
        },
        () => {
          loadImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadImages = async () => {
    try {
      const { data: images, error } = await supabase
        .from('images')
        .select(`
          *,
          detections (*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (images) {
        const formattedImages: ProcessedImage[] = images.map(img => {
          // Las coords se persisten como fracciones 0–1 (edge y cloud). El visor usa %.
          const detections: Detection[] = (img.detections || []).map((d: any) => ({
            id: d.id,
            class: d.label,
            confidence: parseFloat(d.confidence),
            source: d.source,
            bbox: {
              x: d.x * 100,
              y: d.y * 100,
              width: d.width * 100,
              height: d.height * 100,
            },
          }));

          // Get image URL from storage
          const { data: urlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(img.thumbnail_path || img.storage_path);

          // Map database status to component status
          let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
          if (img.status === 'uploaded' || img.status === 'queued') {
            status = 'pending';
          } else if (img.status === 'processing') {
            status = 'processing';
          } else if (img.status === 'processed') {
            status = 'completed';
          } else if (img.status === 'failed') {
            status = 'failed';
          }

          return {
            id: img.id,
            fileName: img.file_name,
            fileSize: img.file_size,
            resolution: { width: img.width_px, height: img.height_px },
            uploadedAt: new Date(img.uploaded_at),
            status,
            progress: status === 'completed' ? 100 : status === 'processing' ? 50 : 0,
            imageUrl: urlData.publicUrl,
            storagePath: img.storage_path,
            lat: img.gps_latitude != null ? Number(img.gps_latitude) : null,
            lng: img.gps_longitude != null ? Number(img.gps_longitude) : null,
            capturedAt: img.captured_at ?? null,
            detections,
            edgeCount: img.edge_count ?? undefined,
            cloudCount: img.cloud_count ?? undefined,
            screeningWouldEscalate: img.screening_would_escalate,
            error: img.error_message || undefined,
            processingTime: img.processed_at ? 
              Math.round((new Date(img.processed_at).getTime() - new Date(img.uploaded_at).getTime()) / 1000) : 
              undefined,
          };
        });

        setProcessedImages(formattedImages);
      }
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Error loading images",
        description: error instanceof Error ? error.message : "Failed to load images",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesAdded = (files: UploadFile[]) => {
    console.log('Files added:', files);
  };

  const handleUploadComplete = async (files: UploadFile[]) => {
    const actualFiles = files.map(f => f.file);
    
    // Immediately add images to state in "pending" status
    const pendingImages: ProcessedImage[] = actualFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      fileSize: file.size,
      resolution: { width: 0, height: 0 },
      uploadedAt: new Date(),
      status: 'pending',
      progress: 0,
      imageUrl: URL.createObjectURL(file),
      detections: [],
    }));
    
    setProcessedImages(prev => [...pendingImages, ...prev]);
    
    await uploadAndProcess(actualFiles);
  };

  const handleReprocess = async (imageId: string) => {
    try {
      const image = processedImages.find(img => img.id === imageId);
      if (!image) return;

      // Reset status to queued
      await updateImageStatus(imageId, 'queued');

      toast({
        title: "Reprocessing",
        description: `Reprocessing ${image.fileName}...`,
      });

      // Update status to processing
      await updateImageStatus(imageId, 'processing');

      // Get the original file from storage
      const { data: imageData } = await supabase
        .from('images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (!imageData) throw new Error('Image not found');

      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('images')
        .download(imageData.storage_path);

      if (downloadError) throw downloadError;

      // Convert blob to File
      const file = new File([fileData], image.fileName, { type: fileData.type });

      // Delete old detections
      await supabase
        .from('detections')
        .delete()
        .eq('image_id', imageId);

      // Run cascade inference again (edge + cloud)
      const cascade = await runCascade(file);

      // Save new detections + cascade metadata
      await saveDetections(imageId, cascade.detections);
      await saveCascadeMeta(imageId, cascade);

      // Update status to processed
      await updateImageStatus(imageId, 'processed');

      toast({
        title: "Reprocessing Complete",
        description: `${image.fileName}: ${cascade.edgeCount} edge + ${cascade.cloudCount} cloud.`,
      });
    } catch (error) {
      console.error('Error reprocessing:', error);
      await updateImageStatus(imageId, 'failed', error instanceof Error ? error.message : 'Reprocessing failed');
      toast({
        title: "Reprocess Failed",
        description: error instanceof Error ? error.message : "Failed to reprocess image",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      // Get image data to delete from storage
      const { data: imageData } = await supabase
        .from('images')
        .select('storage_path, thumbnail_path')
        .eq('id', imageId)
        .single();

      if (!imageData) throw new Error('Image not found');

      // Delete detections first (foreign key constraint)
      const { error: detectionsError } = await supabase
        .from('detections')
        .delete()
        .eq('image_id', imageId);

      if (detectionsError) {
        console.error('Error deleting detections:', detectionsError);
        // Continue anyway - image might not have detections
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Delete from storage (in background, don't wait)
      supabase.storage
        .from('images')
        .remove([imageData.storage_path])
        .catch(err => console.error('Error deleting image from storage:', err));

      if (imageData.thumbnail_path) {
        supabase.storage
          .from('thumbnails')
          .remove([imageData.thumbnail_path])
          .catch(err => console.error('Error deleting thumbnail from storage:', err));
      }

      toast({
        title: "Deleted",
        description: "Image deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (imageId: string) => {
    try {
      const image = processedImages.find(img => img.id === imageId);
      if (!image) return;

      const { data: imageData } = await supabase
        .from('images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (!imageData) throw new Error('Image not found');

      const { data, error } = await supabase.storage
        .from('images')
        .download(imageData.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Downloading",
        description: "Image download started",
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download image",
        variant: "destructive",
      });
    }
  };

  // Resuelve una URL firmada (1h) de la imagen ORIGINAL (bucket privado `images`) para el modal.
  const resolveFullImage = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUrl(storagePath, 3600);
    if (error) {
      console.error('No se pudo firmar la URL de la imagen original:', error);
      return null;
    }
    return data?.signedUrl ?? null;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading images...</p>
      </div>
    );
  }

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

      {/* Current Uploads Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Current Uploads</h2>
          {uploads.map(upload => (
            <div key={upload.fileId} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{upload.fileName}</span>
                <span className="text-sm text-muted-foreground capitalize">{upload.status}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.error && (
                <p className="text-sm text-destructive mt-1">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Results Section */}
      <InferenceResults
        images={processedImages}
        onReprocess={handleReprocess}
        onDelete={handleDelete}
        onDownload={handleDownload}
        resolveFullImage={resolveFullImage}
      />
    </div>
  );
}