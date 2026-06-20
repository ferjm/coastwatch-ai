import { useState } from 'react';
import { uploadImage, updateImageStatus, saveDetections } from '@/services/imageService';
import { toEdgeDetections } from '@/services/detectionMapper';
import { mlService } from '@/services/mlService';
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
        // Upload image
        const uploadedImage = await uploadImage(file);
        
        setUploads(prev => new Map(prev).set(fileId, {
          fileId,
          fileName: file.name,
          status: 'uploading',
          progress: 50,
        }));

        // Update status to queued
        await updateImageStatus(uploadedImage.id, 'queued');

        // Start processing
        setUploads(prev => new Map(prev).set(fileId, {
          fileId,
          fileName: file.name,
          status: 'processing',
          progress: 60,
        }));

        await updateImageStatus(uploadedImage.id, 'processing');

        // Run ML inference
        const detections = await mlService.processImage(file);

        setUploads(prev => new Map(prev).set(fileId, {
          fileId,
          fileName: file.name,
          status: 'processing',
          progress: 90,
        }));

        // Save detections (Nivel 1 = edge)
        await saveDetections(uploadedImage.id, toEdgeDetections(detections));
        
        // Update status to processed
        await updateImageStatus(uploadedImage.id, 'processed');

        setUploads(prev => new Map(prev).set(fileId, {
          fileId,
          fileName: file.name,
          status: 'completed',
          progress: 100,
        }));

        toast({
          title: 'Upload Successful',
          description: `${file.name} processed. Found ${detections.length} detection(s).`,
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
