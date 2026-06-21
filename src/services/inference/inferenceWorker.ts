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

// Drena la cola: procesa secuencialmente las imágenes 'queued' (una a una; WASM no es paralelo).
export async function drainQueue(): Promise<void> {
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
