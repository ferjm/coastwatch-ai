# F3 — Orquestador de cascada (edge + cloud) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar los dos niveles de inferencia en una cascada que, por cada imagen, corre **edge (FOMO/WASM)** y **cloud (Roboflow vía `infer-cloud`)**, normaliza todo a **fracciones 0–1**, etiqueta `source`/`model`, calcula la criba analítica (`screening_would_escalate`) y persiste edge+cloud con el `buildDetectionRows` de F1.

**Architecture:** Tres módulos en `src/services/inference/`: `edgeProvider` (envuelve `mlService`, normaliza px-modelo→fracción), `cloudProvider` (redimensiona la imagen, la manda base64 a la Edge Function `infer-cloud`), y `cascadeService` (orquesta ambos; el cloud es *best-effort* para no tumbar la subida si falla; ensambla contadores y criba). La lógica con riesgo (normalización edge, ensamblado de la cascada) vive en **funciones puras testeadas con vitest**. El wiring toca `useImageUpload`, `Uploads` (incluida la corrección del render de fracciones) e `imageService`.

**Tech Stack:** React/TS, Supabase JS (`functions.invoke`, `from('images').update`), vitest. Edge Impulse WASM (`mlService`).

## Global Constraints

- El agente **no** ejecuta operaciones remotas (`git push`, PRs, `gh`). Solo local.
- **GPG roto:** commitear con `git -c commit.gpgsign=false commit -m "..."`.
- **Hook pre-commit bloquea el nombre del asistente de IA** (ver nombre exacto en el prompt de despacho): no escribirlo en ficheros ni mensajes.
- **Convención de coordenadas canónica = fracciones 0–1, esquina superior-izquierda** (en persistencia). El render convierte a porcentaje (×100).
- Cascada = **siempre ambos niveles**. La criba NO corta el flujo: se ejecuta cloud igualmente y solo se **registra** `screening_would_escalate = (nº detecciones edge > 0)`.
- El cloud es **best-effort**: si `infer-cloud` falla (cold start, créditos, red), se persiste el edge y `cloud_count = 0`; la subida NO falla por ello.
- `TieredDetection`/`buildDetectionRows` ya existen en `src/services/detectionMapper.ts` (F1). La Edge Function `infer-cloud` ya devuelve detecciones cloud normalizadas (F2).
- Tras F3 la app sigue funcionando: el visor enriquecido por nivel (colores/toggles) es F4; F3 solo deja el render de fracciones correcto.

---

### Task 1: Provider edge + normalización (TDD)

**Files:**
- Modify: `src/services/mlService.ts` (que `processImage` devuelva también las dimensiones de entrada del modelo)
- Create: `src/services/inference/edgeProvider.ts`
- Create: `src/services/inference/__tests__/edgeProvider.test.ts`

**Interfaces:**
- Consumes: `mlService` (WASM), `TieredDetection` de `../detectionMapper`.
- Produces:
  - `mlService.processImage(file): Promise<{ detections: DetectionResult[]; inputWidth: number; inputHeight: number }>`
  - `normalizeEdgeDetections(raw: DetectionResult[], inputWidth: number, inputHeight: number): TieredDetection[]` (pura; fracciones 0–1, `source:'edge'`, `model:`fomo-${inputWidth}``)
  - `runEdgeInference(file: File): Promise<TieredDetection[]>`

- [ ] **Step 1: Cambiar `mlService.processImage` para exponer las dimensiones del modelo**

En `src/services/mlService.ts`:
1. Añade el tipo de salida y cambia la firma pública. Sustituye la firma y cuerpo de `processImage` (líneas ~126–132) por:

```ts
  async processImage(imageFile: File): Promise<EdgeInferenceOutput> {
    if (this.config.type === 'wasm') {
      return this.processWithWASM(imageFile);
    } else {
      return this.processWithServer(imageFile);
    }
  }
```

2. Justo encima de `export class MLService` (tras la interfaz `MLProcessorConfig`), añade:

```ts
export interface EdgeInferenceOutput {
  detections: DetectionResult[];
  inputWidth: number;
  inputHeight: number;
}
```

3. En `processWithWASM`, cambia el tipo de retorno a `Promise<EdgeInferenceOutput>` y al final (donde hoy hace `return detections;`, línea ~240) devuelve:

```ts
    return { detections, inputWidth, inputHeight };
```

4. En `processWithServer`, cambia el retorno a `Promise<EdgeInferenceOutput>` y su `return result.detections || [];` por:

```ts
    return { detections: result.detections || [], inputWidth: 0, inputHeight: 0 };
```

- [ ] **Step 2: Escribir el test que falla (normalización edge)**

Create `src/services/inference/__tests__/edgeProvider.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeEdgeDetections } from '../edgeProvider';

describe('normalizeEdgeDetections', () => {
  it('normaliza px de espacio-modelo a fracciones 0–1 y etiqueta source/model', () => {
    const out = normalizeEdgeDetections(
      [{ label: 'plastic', confidence: 0.7, x: 160, y: 80, width: 32, height: 64 }],
      320,
      320,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      label: 'plastic',
      confidence: 0.7,
      x: 0.5,        // 160/320
      y: 0.25,       // 80/320
      width: 0.1,    // 32/320
      height: 0.2,   // 64/320
      source: 'edge',
      model: 'fomo-320',
    });
  });

  it('recorta valores fuera de [0,1]', () => {
    const out = normalizeEdgeDetections(
      [{ label: 'plastic', confidence: 0.9, x: 330, y: -10, width: 32, height: 32 }],
      320,
      320,
    );
    expect(out[0].x).toBe(1);
    expect(out[0].y).toBe(0);
  });

  it('devuelve [] sin detecciones', () => {
    expect(normalizeEdgeDetections([], 320, 320)).toEqual([]);
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npm test`
Expected: FALLA con "Cannot find module '../edgeProvider'".

- [ ] **Step 4: Implementar `edgeProvider.ts`**

Create `src/services/inference/edgeProvider.ts`:

```ts
// Nivel 1 (edge): envuelve el WASM de Edge Impulse (mlService) y normaliza las
// detecciones de espacio-modelo (px) a fracciones 0–1 de la imagen original.
import { mlService, type DetectionResult } from '../mlService';
import type { TieredDetection } from '../detectionMapper';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function normalizeEdgeDetections(
  raw: DetectionResult[],
  inputWidth: number,
  inputHeight: number,
): TieredDetection[] {
  const w = inputWidth || 1;
  const h = inputHeight || 1;
  return raw.map((d) => ({
    label: d.label,
    confidence: d.confidence,
    x: clamp01(d.x / w),
    y: clamp01(d.y / h),
    width: clamp01(d.width / w),
    height: clamp01(d.height / h),
    source: 'edge' as const,
    model: `fomo-${inputWidth}`,
  }));
}

export async function runEdgeInference(file: File): Promise<TieredDetection[]> {
  const { detections, inputWidth, inputHeight } = await mlService.processImage(file);
  return normalizeEdgeDetections(detections, inputWidth, inputHeight);
}
```

> Nota: `DetectionResult` debe estar exportado en `mlService.ts` (ya lo está: `export interface DetectionResult`).

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npm test`
Expected: los 3 tests de `edgeProvider.test.ts` en verde (y el resto de la suite sigue verde).

- [ ] **Step 6: Verificar compilación**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores nuevos. (Si `tsc` se queja en `useImageUpload.ts`/`Uploads.tsx` porque `processImage` ahora devuelve un objeto, es esperado: se arregla en la Task 4. Para que esta tarea compile aislada, esos dos ficheros se actualizan en la Task 4; si el gate de esta tarea falla solo por esos dos usos, anótalo y continúa — se resuelve en Task 4.)

- [ ] **Step 7: Commit**

```bash
git add src/services/mlService.ts src/services/inference/edgeProvider.ts src/services/inference/__tests__/edgeProvider.test.ts
git -c commit.gpgsign=false commit -m "feat(F3): provider edge con normalizacion a fracciones (TDD)"
```

---

### Task 2: Provider cloud

**Files:**
- Create: `src/services/inference/cloudProvider.ts`

**Interfaces:**
- Consumes: `supabase` de `@/integrations/supabase/client`, `TieredDetection` de `../detectionMapper`.
- Produces:
  - `imageToBase64Resized(file: File, maxEdge?: number): Promise<string>` (base64 sin prefijo `data:`)
  - `runCloudInference(file: File): Promise<TieredDetection[]>`

- [ ] **Step 1: Implementar `cloudProvider.ts`**

Create `src/services/inference/cloudProvider.ts`:

```ts
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
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores nuevos en `cloudProvider.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/inference/cloudProvider.ts
git -c commit.gpgsign=false commit -m "feat(F3): provider cloud (invoca infer-cloud con imagen redimensionada)"
```

---

### Task 3: Servicio de cascada (TDD) + persistencia de metadatos

**Files:**
- Create: `src/services/inference/cascadeService.ts`
- Create: `src/services/inference/__tests__/cascadeService.test.ts`
- Modify: `src/services/imageService.ts` (añadir `saveCascadeMeta`)

**Interfaces:**
- Consumes: `runEdgeInference`, `runCloudInference`, `TieredDetection`.
- Produces:
  - `interface CascadeResult { detections: TieredDetection[]; edgeCount: number; cloudCount: number; screeningWouldEscalate: boolean }`
  - `buildCascadeResult(edge: TieredDetection[], cloud: TieredDetection[]): CascadeResult` (pura)
  - `runCascade(file: File): Promise<CascadeResult>`
  - `saveCascadeMeta(imageId: string, meta: { edgeCount: number; cloudCount: number; screeningWouldEscalate: boolean }): Promise<void>`

- [ ] **Step 1: Escribir el test que falla (ensamblado de cascada)**

Create `src/services/inference/__tests__/cascadeService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCascadeResult } from '../cascadeService';
import type { TieredDetection } from '../../detectionMapper';

const edgeDet = (n: number): TieredDetection[] =>
  Array.from({ length: n }, (_, i) => ({
    label: 'plastic', confidence: 0.6, x: 0.1 * i, y: 0.1, width: 0.05, height: 0.05,
    source: 'edge' as const, model: 'fomo-320',
  }));
const cloudDet = (n: number): TieredDetection[] =>
  Array.from({ length: n }, (_, i) => ({
    label: 'plastic-waste', confidence: 0.8, x: 0.2 * i, y: 0.2, width: 0.05, height: 0.05,
    source: 'cloud' as const, model: 'rfdetr-medium-v6',
  }));

describe('buildCascadeResult', () => {
  it('concatena edge+cloud y cuenta cada nivel', () => {
    const r = buildCascadeResult(edgeDet(2), cloudDet(3));
    expect(r.detections).toHaveLength(5);
    expect(r.edgeCount).toBe(2);
    expect(r.cloudCount).toBe(3);
  });

  it('screeningWouldEscalate = true si el edge detectó algo', () => {
    expect(buildCascadeResult(edgeDet(1), cloudDet(0)).screeningWouldEscalate).toBe(true);
  });

  it('screeningWouldEscalate = false si el edge no detectó nada', () => {
    expect(buildCascadeResult(edgeDet(0), cloudDet(4)).screeningWouldEscalate).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FALLA con "Cannot find module '../cascadeService'".

- [ ] **Step 3: Implementar `cascadeService.ts`**

Create `src/services/inference/cascadeService.ts`:

```ts
// Orquestador de la cascada: corre ambos niveles por imagen. El cloud es best-effort
// (si falla, se conserva el edge). Registra contadores y la criba analítica (H8).
import { runEdgeInference } from './edgeProvider';
import { runCloudInference } from './cloudProvider';
import type { TieredDetection } from '../detectionMapper';

export interface CascadeResult {
  detections: TieredDetection[];
  edgeCount: number;
  cloudCount: number;
  screeningWouldEscalate: boolean;
}

export function buildCascadeResult(
  edge: TieredDetection[],
  cloud: TieredDetection[],
): CascadeResult {
  return {
    detections: [...edge, ...cloud],
    edgeCount: edge.length,
    cloudCount: cloud.length,
    // Criba H8: ¿la criba edge habría escalado esta imagen? (la cascada corre ambos igualmente)
    screeningWouldEscalate: edge.length > 0,
  };
}

export async function runCascade(file: File): Promise<CascadeResult> {
  // Nivel 1 (edge) es el núcleo: si falla, propaga el error (la subida falla).
  const edge = await runEdgeInference(file);

  // Nivel 2 (cloud) es best-effort: no tumba la subida si falla (cold start, créditos, red).
  let cloud: TieredDetection[] = [];
  try {
    cloud = await runCloudInference(file);
  } catch (e) {
    console.error('Cloud inference falló (best-effort, se conserva el edge):', e);
  }

  return buildCascadeResult(edge, cloud);
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: los 3 tests de `cascadeService.test.ts` en verde (y el resto verde).

- [ ] **Step 5: Añadir `saveCascadeMeta` en `imageService.ts`**

En `src/services/imageService.ts`, añade al final del fichero:

```ts
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
```

- [ ] **Step 6: Commit**

```bash
git add src/services/inference/cascadeService.ts src/services/inference/__tests__/cascadeService.test.ts src/services/imageService.ts
git -c commit.gpgsign=false commit -m "feat(F3): servicio de cascada (TDD) + persistencia de metadatos de criba"
```

---

### Task 4: Cablear la cascada en el flujo de subida y arreglar el render de fracciones

**Files:**
- Modify: `src/hooks/useImageUpload.ts`
- Modify: `src/pages/app/Uploads.tsx`

**Interfaces:**
- Consumes: `runCascade`, `CascadeResult` de `@/services/inference/cascadeService`; `saveDetections`, `saveCascadeMeta` de `@/services/imageService`.
- Produces: el flujo de subida y el de reprocesado persisten edge+cloud + metadatos; `loadImages` interpreta las coords como fracciones (×100 para el render).

- [ ] **Step 1: Actualizar `useImageUpload.ts`**

En `src/hooks/useImageUpload.ts`:
1. Sustituye los imports (líneas 2–3):

```ts
import { uploadImage, updateImageStatus, saveDetections, saveCascadeMeta } from '@/services/imageService';
import { runCascade } from '@/services/inference/cascadeService';
```
(elimina el import de `mlService`).

2. Sustituye el bloque de inferencia+guardado (líneas ~54–65, desde `// Run ML inference` hasta el `await saveDetections(...)`) por:

```ts
        // Run cascade inference (edge + cloud)
        const cascade = await runCascade(file);

        setUploads(prev => new Map(prev).set(fileId, {
          fileId,
          fileName: file.name,
          status: 'processing',
          progress: 90,
        }));

        // Save detections (edge + cloud) and cascade metadata
        await saveDetections(uploadedImage.id, cascade.detections);
        await saveCascadeMeta(uploadedImage.id, cascade);
```

3. Sustituye el toast de éxito (el `description` que decía `Found ${detections.length} detection(s)`) por:

```ts
        toast({
          title: 'Upload Successful',
          description: `${file.name}: ${cascade.edgeCount} edge + ${cascade.cloudCount} cloud detección(es).`,
        });
```

- [ ] **Step 2: Actualizar el reprocesado en `Uploads.tsx`**

En `src/pages/app/Uploads.tsx`:
1. Sustituye los imports (líneas 8–10):

```ts
import { updateImageStatus, saveDetections, saveCascadeMeta } from '@/services/imageService';
import { runCascade } from '@/services/inference/cascadeService';
```
(elimina los imports de `mlService` y `toEdgeDetections`).

2. En `handleReprocess`, sustituye el bloque (líneas ~199–211, desde `// Run ML inference again` hasta el `toast({...})` de "Reprocessing Complete") por:

```ts
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
```
(Asegúrate de no dejar duplicado el `await updateImageStatus(imageId, 'processed');` que ya había justo después.)

- [ ] **Step 3: Arreglar el render de coordenadas en `loadImages`**

En `src/pages/app/Uploads.tsx`, dentro de `loadImages`, sustituye el bloque que convertía de espacio-modelo a porcentaje (líneas ~59–83, desde `// Model input size` hasta el cierre del `.map`) por esta versión que interpreta las coords como **fracciones 0–1**:

```ts
          // Las coords se persisten como fracciones 0–1 (edge y cloud). El visor usa %.
          const detections: Detection[] = (img.detections || []).map((d: any) => ({
            id: d.id,
            class: d.label,
            confidence: parseFloat(d.confidence),
            bbox: {
              x: d.x * 100,
              y: d.y * 100,
              width: d.width * 100,
              height: d.height * 100,
            },
          }));
```

> Nota: las filas antiguas (datos de prueba en espacio-modelo) se renderizarán mal; es esperado y aceptado (se documentó en el diseño). Las nuevas (fracciones) se ven bien. El coloreado por nivel (`source`) llega en F4.

- [ ] **Step 4: Verificar compilación y tests**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: **sin errores** (ahora que los consumidores de `mlService.processImage` están actualizados).
Run: `npm test`
Expected: toda la suite en verde (edgeProvider + cascadeService + F1 + F2).

- [ ] **Step 5: Smoke test manual (Fernando, en el navegador)**

`npm run dev` → subir una imagen con plástico. Esperado: toast "N edge + M cloud". En el SQL editor:

```sql
SELECT source, model, count(*) FROM public.detections GROUP BY source, model ORDER BY source;
SELECT file_name, edge_count, cloud_count, screening_would_escalate
FROM public.images ORDER BY created_at DESC LIMIT 3;
```
Esperado: filas `edge/fomo-320` **y** `cloud/rfdetr-medium-v6`; la imagen con `edge_count`/`cloud_count`/`screening_would_escalate` poblados. (Requiere la migración de F1 aplicada y `infer-cloud` desplegada apuntando al HF Space.)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useImageUpload.ts src/pages/app/Uploads.tsx
git -c commit.gpgsign=false commit -m "feat(F3): cablear cascada en subida/reprocesado y render de fracciones"
```

---

## Self-Review (F3)

- **Cobertura del spec (diseño maestro §4 componentes, §5 decisiones, §7 F3):** `edgeProvider`/`cloudProvider`/`cascadeService` ✓ (Tasks 1–3); normalización edge px→fracción ✓ (Task 1, pura+TDD); cloud ya normalizado lo consume `cloudProvider` ✓ (Task 2); corre **ambos niveles** ✓ y cloud best-effort ✓ (Task 3); `screening_would_escalate` calculado y persistido ✓ (Tasks 3–4); persistencia con `buildDetectionRows`/`source` de F1 ✓ (usa `saveDetections`); criterio de aceptación (subida guarda edge **y** cloud + criba) ✓ (Task 4 Step 5). ✓
- **Convención de coordenadas:** edge y cloud terminan en fracciones 0–1; el render (`loadImages`) convierte ×100 — corrige además el bug del `MODEL_WIDTH=160`. ✓
- **Sin placeholders:** todo el código, comandos y salidas esperadas están completos. ✓
- **Consistencia de tipos:** `TieredDetection` (F1) es el tipo común de edge y cloud; `EdgeInferenceOutput`, `CascadeResult`, `normalizeEdgeDetections`, `buildCascadeResult`, `runCascade`, `runEdgeInference`, `runCloudInference`, `saveCascadeMeta` definidos en Tasks 1–3 y usados con la misma firma en Task 4. ✓
- **Límite de fase:** F3 deja datos + persistencia + render básico de fracciones. El visor de dos niveles (colores por `source`, capas conmutables, badge de criba) es F4; el mapa/dashboard reales son F5. ✓
- **Riesgo conocido:** payload del cloud — se mitiga redimensionando a 1024 px (Task 2). Filas antiguas en espacio-modelo se ven mal tras el cambio de render (aceptado, datos de prueba).
