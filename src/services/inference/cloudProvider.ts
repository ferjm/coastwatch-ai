// Nivel 2 (cloud): redimensiona la imagen (~1024 px, sweet-spot de RF-DETR) y la envía
// como base64 a la Edge Function `infer-cloud`, que devuelve detecciones ya normalizadas.
import { supabase } from '@/integrations/supabase/client';
import type { TieredDetection } from '../detectionMapper';

export function imageToBase64Resized(file: File, maxEdge = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl.split(',')[1] ?? dataUrl);
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = URL.createObjectURL(file);
  });
}

export async function runCloudInference(file: File): Promise<TieredDetection[]> {
  const image = await imageToBase64Resized(file);
  const { data, error } = await supabase.functions.invoke('infer-cloud', {
    body: { image },
  });
  if (error) {
    throw new Error(`infer-cloud error: ${error.message}`);
  }
  return (data?.detections ?? []) as TieredDetection[];
}
