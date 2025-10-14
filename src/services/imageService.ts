import { supabase } from '@/integrations/supabase/client';
import exifr from 'exifr';

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  tags?: string[];
}

export interface UploadedImage {
  id: string;
  storagePath: string;
  thumbnailPath: string;
  metadata: ImageMetadata;
}

/**
 * Extract metadata from image file including GPS coordinates
 */
export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  const metadata: ImageMetadata = {
    fileName: file.name,
    fileSize: file.size,
    width: 0,
    height: 0,
  };

  // Extract EXIF data
  try {
    const exif = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });

    if (exif) {
      metadata.latitude = exif.latitude;
      metadata.longitude = exif.longitude;
      metadata.capturedAt = exif.DateTimeOriginal || exif.CreateDate;
    }
  } catch (error) {
    console.warn('Failed to extract EXIF data:', error);
  }

  // Get image dimensions
  try {
    const dimensions = await getImageDimensions(file);
    metadata.width = dimensions.width;
    metadata.height = dimensions.height;
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
  }

  return metadata;
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 300
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload image to Supabase storage
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  // Extract metadata
  const metadata = await extractImageMetadata(file);

  // Generate unique file path
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${timestamp}-${safeFileName}`;
  const thumbnailPath = `${timestamp}-thumb-${safeFileName}`;

  // Upload original image
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Generate and upload thumbnail
  try {
    const thumbnail = await generateThumbnail(file);
    await supabase.storage
      .from('thumbnails')
      .upload(thumbnailPath, thumbnail, {
        cacheControl: '3600',
        upsert: false,
      });
  } catch (error) {
    console.error('Failed to upload thumbnail:', error);
  }

  // Create database record
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data: imageRecord, error: dbError } = await supabase
    .from('images')
    .insert({
      user_id: user.user.id,
      file_name: metadata.fileName,
      file_size: metadata.fileSize,
      width_px: metadata.width,
      height_px: metadata.height,
      gps_latitude: metadata.latitude,
      gps_longitude: metadata.longitude,
      captured_at: metadata.capturedAt,
      tags: metadata.tags,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      status: 'uploaded',
    })
    .select()
    .single();

  if (dbError || !imageRecord) {
    throw new Error(`Failed to create image record: ${dbError?.message}`);
  }

  return {
    id: imageRecord.id,
    storagePath,
    thumbnailPath,
    metadata,
  };
}

/**
 * Update image status
 */
export async function updateImageStatus(
  imageId: string,
  status: 'uploaded' | 'queued' | 'processing' | 'processed' | 'failed',
  errorMessage?: string
) {
  const updates: any = { status };
  
  if (status === 'processed') {
    updates.processed_at = new Date().toISOString();
  }
  
  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { error } = await supabase
    .from('images')
    .update(updates)
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to update image status: ${error.message}`);
  }
}

/**
 * Save detection results to database
 * Detections are stored in model pixel space (e.g., 160x160)
 */
export async function saveDetections(imageId: string, detections: any[]) {
  if (detections.length === 0) return;

  const detectionsToInsert = detections.map(d => ({
    image_id: imageId,
    label: d.label,
    confidence: d.confidence,
    x: d.x,        // pixels in model space (e.g., 0-160)
    y: d.y,        // pixels in model space (e.g., 0-160)
    width: d.width,    // pixels in model space
    height: d.height,  // pixels in model space
  }));

  const { error } = await supabase
    .from('detections')
    .insert(detectionsToInsert);

  if (error) {
    throw new Error(`Failed to save detections: ${error.message}`);
  }
}
