import { supabase } from '@/integrations/supabase/client';
import exifr from 'exifr';
import { buildDetectionRows, type TieredDetection } from './detectionMapper';

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

  // Extract EXIF data.
  // OJO: `latitude`/`longitude` son propiedades COMPUTADAS de exifr, no tags EXIF crudos;
  // incluirlas en `pick` impide que exifr las calcule. Por eso las fechas se obtienen con
  // `pick` y el GPS con el método dedicado `exifr.gps()`.
  try {
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate'],
    });
    if (exif) {
      metadata.capturedAt = exif.DateTimeOriginal || exif.CreateDate;
    }
  } catch (error) {
    console.warn('Failed to extract EXIF dates:', error);
  }

  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      metadata.latitude = gps.latitude;
      metadata.longitude = gps.longitude;
    }
  } catch (error) {
    console.warn('Failed to extract EXIF GPS:', error);
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
 * Guarda detecciones de dos niveles en la base de datos.
 * Las detecciones llegan ya etiquetadas con source/model (ver detectionMapper).
 */
export async function saveDetections(imageId: string, detections: TieredDetection[]) {
  if (detections.length === 0) return;

  const detectionsToInsert = buildDetectionRows(imageId, detections);

  // upsert + ignoreDuplicates: si la misma imagen se procesara dos veces (varias pestañas/worker),
  // las filas duplicadas chocan con el índice único `detections_unique_per_image` y se ignoran
  // en silencio en vez de duplicarse o reventar. Un procesado único normal no genera conflicto.
  const { error } = await supabase
    .from('detections')
    .upsert(detectionsToInsert, {
      onConflict: 'image_id,source,label,x,y,width,height',
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(`Failed to save detections: ${error.message}`);
  }
}

/**
 * Guarda los metadatos de la cascada a nivel imagen (contadores + criba analítica H8).
 */
export async function saveCascadeMeta(
  imageId: string,
  meta: { edgeCount: number; cloudCount: number; screeningWouldEscalate: boolean },
) {
  const { error } = await supabase
    .from('images')
    .update({
      edge_count: meta.edgeCount,
      cloud_count: meta.cloudCount,
      screening_would_escalate: meta.screeningWouldEscalate,
    })
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to save cascade meta: ${error.message}`);
  }
}
