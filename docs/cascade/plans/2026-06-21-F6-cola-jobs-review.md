# F6 — Cola de inferencia real (worker) + Jobs + Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans. Worker/UI se verifican con `tsc`/build + validación visual; la migración la aplica Fernando.

**Goal:** Convertir el camino mock de Jobs/Review en algo real, con el **navegador como worker**: subir una imagen la **encola** (`status='queued'`); un worker app-wide drena la cola corriendo la cascada y actualiza estado. **Jobs** muestra la cola real; **Review** permite aceptar/rechazar imágenes (persistido en `images.review_status`).

**Architecture:** `inferenceWorker.ts` (servicio) reclama y procesa imágenes `queued` (descarga de Storage → `runCascade` → persiste, idempotente). `useInferenceWorker` (hook montado en `AppLayout`) drena al montar, por realtime y por poll de respaldo. `useImageUpload` pasa a solo-encolar. `Jobs`/`Review` leen Supabase real.

**Tech Stack:** React/TS, Supabase JS (Storage download, realtime, update), la cascada de F3.

## Global Constraints
- No remote ops. GPG: `git -c commit.gpgsign=false`. El hook bloquea el nombre del asistente de IA (no escribirlo en ficheros/mensajes).
- La inferencia edge es WASM en navegador → el worker corre en el cliente (no hay worker de servidor). Solo procesa con la app abierta.
- Reclamo atómico de cada job: `update status='processing' where id=X and status='queued'` (evita doble proceso entre pestañas).
- Reproceso idempotente: borrar detecciones previas de la imagen antes de guardar.
- Reusar la cascada de F3 (`runCascade`, `saveDetections`, `saveCascadeMeta`, `updateImageStatus`).

---

### Task 1: Migración `images.review_status` + tipos

**Files:** Create `supabase/migrations/20260621120000_review_status.sql`; Modify `src/integrations/supabase/types.ts` (bloque `images`).

- [ ] **Step 1:** Create migration:
```sql
ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','accepted','rejected'));
CREATE INDEX IF NOT EXISTS idx_images_review_status ON public.images(review_status);
COMMENT ON COLUMN public.images.review_status IS 'Revisión humana: pending | accepted | rejected';
```
- [ ] **Step 2 (Fernando):** Aplicar el SQL en el editor de Lovable Cloud/Supabase. (El agente no puede aplicarlo.)
- [ ] **Step 3:** En `types.ts`, añade `review_status` a `images` Row (`review_status: string`), Insert (`review_status?: string`) y Update (`review_status?: string`), en orden alfabético.
- [ ] **Step 4:** `npx tsc --noEmit -p tsconfig.app.json` → sin errores. Commit:
```bash
git add supabase/migrations/20260621120000_review_status.sql src/integrations/supabase/types.ts
git -c commit.gpgsign=false commit -m "feat(F6): migracion y tipos para review_status en images"
```

---

### Task 2: Worker de inferencia + montaje + upload solo-encola

**Files:** Create `src/services/inference/inferenceWorker.ts`, `src/hooks/useInferenceWorker.ts`; Modify `src/components/AppLayout.tsx`, `src/hooks/useImageUpload.ts`.

**Interfaces (produce):**
- `processQueuedImage(image: { id: string; file_name: string; storage_path: string }): Promise<void>`
- `drainQueue(): Promise<void>`
- `useInferenceWorker(): void`

- [ ] **Step 1:** Create `src/services/inference/inferenceWorker.ts`:
```ts
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
```

- [ ] **Step 2:** Create `src/hooks/useInferenceWorker.ts`:
```ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { drainQueue } from '@/services/inference/inferenceWorker';

// El navegador actúa como worker: drena la cola al montar, por realtime y por poll de respaldo.
export function useInferenceWorker() {
  const running = useRef(false);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (running.current || !active) return;
      running.current = true;
      try {
        await drainQueue();
      } finally {
        running.current = false;
      }
    };

    tick();

    const channel = supabase
      .channel('inference-worker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'images' }, () => { tick(); })
      .subscribe();

    const interval = setInterval(tick, 15000);

    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);
}
```

- [ ] **Step 3:** En `AppLayout.tsx`, importa y monta el worker dentro del componente:
```ts
import { useInferenceWorker } from '@/hooks/useInferenceWorker';
```
y al inicio del cuerpo de `AppLayout` (tras los otros hooks):
```ts
  useInferenceWorker();
```

- [ ] **Step 4:** Cambia `useImageUpload.ts` a **solo-encolar**: sustituye el bloque de inferencia+guardado (desde `// Run cascade inference` hasta el `saveCascadeMeta`) y el `updateImageStatus(...,'processing')` por simplemente dejar la imagen en `queued`. Resultado del cuerpo del `try` tras `uploadImage`:
```ts
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
```
Elimina los imports de `runCascade`/`saveDetections`/`saveCascadeMeta` que queden sin usar en `useImageUpload.ts` (deja `uploadImage`, `updateImageStatus`).

- [ ] **Step 5:** `npx tsc --noEmit -p tsconfig.app.json` → sin errores. Commit:
```bash
git add src/services/inference/inferenceWorker.ts src/hooks/useInferenceWorker.ts src/components/AppLayout.tsx src/hooks/useImageUpload.ts
git -c commit.gpgsign=false commit -m "feat(F6): worker de inferencia en navegador + upload solo-encola"
```

---

### Task 3: `Jobs` con la cola real

**Files:** Modify `src/pages/app/Jobs.tsx`.

- [ ] **Step 1:** Elimina `mockJobs` (líneas 10–53). Carga real con realtime:
```tsx
const [jobs, setJobs] = useState<ImageItem[]>([]);
const load = async () => {
  const { data } = await supabase
    .from('images')
    .select('id, file_name, width_px, height_px, status, uploaded_at, processed_at, thumbnail_path')
    .order('uploaded_at', { ascending: false })
    .limit(100);
  setJobs((data ?? []).map((i: any) => ({
    id: i.id, fileName: i.file_name, widthPx: i.width_px, heightPx: i.height_px,
    status: i.status, hash: '', uploadedAt: i.uploaded_at, processedAt: i.processed_at ?? undefined,
    thumbUrl: i.thumbnail_path
      ? supabase.storage.from('thumbnails').getPublicUrl(i.thumbnail_path).data.publicUrl
      : '/placeholder.svg',
  })));
};
useEffect(() => {
  load();
  const ch = supabase.channel('jobs').on('postgres_changes', { event: '*', schema: 'public', table: 'images' }, () => load()).subscribe();
  return () => { supabase.removeChannel(ch); };
}, []);
```
(imports: `supabase` de `@/integrations/supabase/client`.)
- [ ] **Step 2:** `handleRefresh` llama a `load()` en vez del setTimeout simulado. `handleRetry(id)` pasa a re-encolar de verdad:
```tsx
const handleRetry = async (id: string) => {
  await supabase.from('images').update({ status: 'queued' }).eq('id', id);
};
```
(el worker la recogerá; el realtime refrescará la lista). Quita el `Math.random()` del Progress de 'processing' (déjalo indeterminado: `<Progress value={undefined} className="w-24" />` o quítalo).
- [ ] **Step 3:** `tsc` limpio. Commit:
```bash
git add src/pages/app/Jobs.tsx
git -c commit.gpgsign=false commit -m "feat(F6): Jobs con la cola de imagenes real + retry y realtime"
```

---

### Task 4: `Review` con verificación humana real

**Files:** Modify `src/pages/app/Review.tsx`.

- [ ] **Step 1:** Elimina `unverifiedDetections` (líneas 44–195) y los imports de assets mock. Define el tipo local `ReviewItem` reutilizando la interfaz `Detection` existente del fichero (id, lat, lng, confidence, imageUrl, detectedAt, description, verified, boundingBoxes).
- [ ] **Step 2:** Carga real: imágenes `processed` con `review_status='pending'` + sus detecciones; firma la URL original; convierte cajas a porcentaje:
```tsx
const load = async () => {
  const { data } = await supabase
    .from('images')
    .select('id, file_name, storage_path, gps_latitude, gps_longitude, uploaded_at, detections(id,label,confidence,x,y,width,height,source)')
    .eq('status', 'processed')
    .eq('review_status', 'pending')
    .order('uploaded_at', { ascending: false })
    .limit(50);
  const items: Detection[] = await Promise.all((data ?? []).map(async (img: any) => {
    const { data: signed } = await supabase.storage.from('images').createSignedUrl(img.storage_path, 3600);
    return {
      id: img.id,
      lat: Number(img.gps_latitude ?? 0),
      lng: Number(img.gps_longitude ?? 0),
      confidence: (img.detections ?? []).reduce((m: number, d: any) => Math.max(m, Number(d.confidence)), 0),
      imageUrl: signed?.signedUrl ?? '/placeholder.svg',
      detectedAt: new Date(img.uploaded_at),
      description: `${img.file_name} — ${(img.detections ?? []).length} detección(es)`,
      verified: false,
      boundingBoxes: (img.detections ?? []).map((d: any) => ({
        id: d.id, x: Number(d.x) * 100, y: Number(d.y) * 100,
        width: Number(d.width) * 100, height: Number(d.height) * 100,
        confidence: Number(d.confidence), label: d.label,
      })),
    };
  }));
  setDetections(items);
  setCurrentIndex(0);
};
useEffect(() => { load(); }, []);
```
(import `supabase`.)
- [ ] **Step 3:** `handleVerify`/`handleReject` persisten el estado y quitan el ítem de la cola:
```tsx
const handleVerify = async (id: string) => {
  await supabase.from('images').update({ review_status: 'accepted' }).eq('id', id);
  setDetections(prev => prev.filter(d => d.id !== id));
  if (currentIndex >= detections.length - 1 && currentIndex > 0) setCurrentIndex(p => p - 1);
  toast({ title: t('detectionVerified'), description: t('verificationSuccess') });
};
const handleReject = async (id: string) => {
  await supabase.from('images').update({ review_status: 'rejected' }).eq('id', id);
  setDetections(prev => prev.filter(d => d.id !== id));
  if (currentIndex >= detections.length - 1 && currentIndex > 0) setCurrentIndex(p => p - 1);
  toast({ title: t('detectionRejected'), description: t('rejectionSuccess') });
};
```
`handleDelete` puede quedarse quitando solo de la lista local (o borrar la imagen; mantenlo simple: quitar de la lista). `resetQueue` pasa a `load()` (recargar pendientes) en vez de restaurar el mock.
- [ ] **Step 4:** `tsc` limpio + `npm run build`. Commit:
```bash
git add src/pages/app/Review.tsx
git -c commit.gpgsign=false commit -m "feat(F6): Review con verificacion humana real (accept/reject en review_status)"
```

---

## Self-Review (F6)
- Cobertura (diseño maestro §7 F6): cola real (worker) sustituye el mock de Jobs ✓ (Tasks 2–3); Review real con aceptar/rechazar ✓ (Tasks 1,4); upload encola y el worker procesa ✓ (Task 2). ✓
- Honestidad arquitectónica: worker en cliente (no servidor) — documentado en Constraints. ✓
- Idempotencia/concurrencia: reclamo atómico + borrado de detecciones previas. ✓
- Sin placeholders; cada paso con código/verificación. ✓
- Consistencia: `processQueuedImage`/`drainQueue`/`useInferenceWorker` definidos en Task 2 y montados/consumidos correctamente; reusa F3 (`runCascade`, `saveDetections`, `saveCascadeMeta`, `updateImageStatus`). ✓
- Dependencia: migración `review_status` (Task 1 Step 2, Fernando) necesaria para Review; sin ella, Review da error de columna.
