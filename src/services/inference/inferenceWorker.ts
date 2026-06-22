import { supabase } from '@/integrations/supabase/client';
import { runCascade } from './cascadeService';
import { saveDetections, saveCascadeMeta, updateImageStatus } from '../imageService';

// Procesa una imagen 'queued': la reclama atómicamente, descarga, corre la cascada y persiste.
// Idempotente: borra detecciones previas. Best-effort: marca 'failed' si algo falla.
export async function processQueuedImage(image: { id: string; file_name: string; storage_path: string }): Promise<void> {
  const { data: claimed, error: claimErr } = await supabase
    .from('images')
    .update({ status: 'processing' })
    .eq('id', image.id)
    .eq('status', 'queued')
    .select('id');
  if (claimErr || !claimed || claimed.length === 0) return; // ya reclamada o cambió de estado

  try {
    const { data: blob, error: dlErr } = await supabase.storage.from('images').download(image.storage_path);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? 'No se pudo descargar la imagen');
    const file = new File([blob], image.file_name, { type: blob.type });

    await supabase.from('detections').delete().eq('image_id', image.id);

    const cascade = await runCascade(file);
    await saveDetections(image.id, cascade.detections);
    await saveCascadeMeta(image.id, cascade);
    await updateImageStatus(image.id, 'processed');
  } catch (e) {
    await updateImageStatus(image.id, 'failed', e instanceof Error ? e.message : String(e));
  }
}

// Tiempo tras el cual una imagen en 'processing' se considera huérfana. Debe superar
// holgadamente la duración real de una cascada (~25 s observados) para NO re-encolar trabajo
// en curso de OTRA pestaña. El trigger `update_images_updated_at` refresca `updated_at` en cada
// UPDATE, así que sirve de heartbeat del lease sin necesidad de columna nueva.
export const STALE_PROCESSING_MS = 3 * 60 * 1000;

// Recupera imágenes huérfanas: quedaron en 'processing' por un proceso interrumpido
// (refresco/cierre de pestaña, cuelgue). Solo re-encola las que llevan MÁS de STALE_PROCESSING_MS
// sin tocarse: una imagen que otra pestaña está cascando ahora mismo tiene `updated_at` reciente
// (la reclamó hace segundos) y NO se re-encola → evita el doble procesado/doble inserción.
async function recoverOrphans(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  await supabase
    .from('images')
    .update({ status: 'queued' })
    .eq('status', 'processing')
    .lt('updated_at', staleBefore);
}

// Drena la cola: procesa secuencialmente las imágenes 'queued' (una a una; WASM no es paralelo).
export async function drainQueue(): Promise<void> {
  await recoverOrphans();
  const { data, error } = await supabase
    .from('images')
    .select('id, file_name, storage_path')
    .eq('status', 'queued')
    .order('uploaded_at', { ascending: true })
    .limit(20);
  if (error || !data) return;
  for (const img of data as { id: string; file_name: string; storage_path: string }[]) {
    await processQueuedImage(img);
  }
}
