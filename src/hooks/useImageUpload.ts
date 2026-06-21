import { useState } from 'react';
import { uploadImage, updateImageStatus } from '@/services/imageService';
import { useToast } from '@/hooks/use-toast';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export function useImageUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const { toast } = useToast();

  const uploadAndProcess = async (files: File[]) => {
    for (const file of files) {
      const fileId = `${file.name}-${Date.now()}`;
      
      // Initialize upload progress
      setUploads(prev => new Map(prev).set(fileId, {
        fileId,
        fileName: file.name,
        status: 'uploading',
        progress: 0,
      }));

      try {
        const uploadedImage = await uploadImage(file);

        setUploads(prev => new Map(prev).set(fileId, {
          fileId, fileName: file.name, status: 'processing', progress: 80,
        }));

        // Encola: el worker (useInferenceWorker) la procesará.
        await updateImageStatus(uploadedImage.id, 'queued');

        setUploads(prev => new Map(prev).set(fileId, {
          fileId, fileName: file.name, status: 'completed', progress: 100,
        }));

        toast({
          title: 'Subida completada',
          description: `${file.name} en cola para procesar.`,
        });

      } catch (error) {
        console.error('Upload error:', error);
        
        setUploads(prev => new Map(prev).set(fileId, {
          fileId,
          fileName: file.name,
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed',
        }));

        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
  };

  const clearUploads = () => {
    setUploads(new Map());
  };

  return {
    uploads: Array.from(uploads.values()),
    uploadAndProcess,
    clearUploads,
  };
}
