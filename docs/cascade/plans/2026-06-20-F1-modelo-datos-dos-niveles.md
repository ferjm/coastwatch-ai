# F1 — Modelo de datos de dos niveles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar la base de datos y la capa de persistencia para detecciones de **dos niveles**: cada detección queda etiquetada con `source` ('edge'|'cloud') y `model`, y cada imagen puede registrar la decisión analítica de criba (`screening_would_escalate`). El camino *edge* sigue funcionando, ahora etiquetado `source='edge'`.

**Architecture:** (1) Se añade el runner de tests **vitest** (no existía) para poder hacer TDD de aquí en adelante. (2) Una migración SQL añade columnas a `detections` e `images`. (3) Se extrae una función **pura** `buildDetectionRows` (testeable) que construye las filas de `detections`, y `saveDetections` pasa a usarla etiquetando el origen. La **normalización de coordenadas a fracciones 0–1 se difiere a F3** (cuando existan ambos proveedores); en F1 las coordenadas se guardan tal cual las produce hoy el edge (espacio del modelo).

**Tech Stack:** Supabase (Postgres + tipos generados TS), TypeScript, vitest.

## Global Constraints

- El agente **no** ejecuta operaciones remotas (`git push`, PRs, `gh`). Solo local.
- Gestor de paquetes: **npm**. Puerto dev: **8080**.
- Migraciones: se aplican vía **SQL editor de Lovable Cloud** (no hay Supabase CLI local). El fichero en `supabase/migrations/` documenta el cambio.
- Modelo cloud por defecto (referencia, se usa en fases posteriores): `coastal-plastic-5m` v6 (RF-DETR-medium @1024).
- **Defaults seguros en la migración:** `source` con `DEFAULT 'edge'` para no romper filas existentes ni inserts antiguos.

---

### Task 1: Añadir el runner de tests (vitest)

**Files:**
- Modify: `package.json` (devDependency + script `test`)
- Create: `vitest.config.ts`
- Create: `src/services/__tests__/sanity.test.ts` (test de humo, se borra en Task 3)

**Interfaces:**
- Consumes: nada.
- Produces: comando `npm test` que ejecuta vitest. Las tareas siguientes escriben tests bajo `src/**/__tests__/*.test.ts`.

- [ ] **Step 1: Instalar vitest como devDependency**

Run: `npm install -D vitest@^2`
Expected: `added` vitest sin errores.

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Añadir el script `test` en `package.json`**

En el bloque `"scripts"`, añadir la línea `"test": "vitest run",` (junto a `"dev": "vite",`). Resultado del bloque scripts:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Crear un test de humo**

Create `src/services/__tests__/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Ejecutar los tests**

Run: `npm test`
Expected: vitest corre y reporta `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/services/__tests__/sanity.test.ts
git commit -m "test(F1): añadir vitest como runner de tests"
```

---

### Task 2: Migración SQL + tipos generados

**Files:**
- Create: `supabase/migrations/<timestamp>_cascade_two_tier.sql` (timestamp `YYYYMMDDHHMMSS`, p.ej. `20260620120000`)
- Modify: `src/integrations/supabase/types.ts:17-123` (bloques `detections` e `images`)

**Interfaces:**
- Consumes: nada.
- Produces: columnas `detections.source` (NOT NULL, 'edge'|'cloud'), `detections.model` (nullable), `images.screening_would_escalate` (nullable bool), `images.edge_count`/`images.cloud_count` (nullable int). Los tipos TS reflejan estas columnas para que `buildDetectionRows` (Task 3) y `saveDetections` (Task 4) compilen.

- [ ] **Step 1: Crear el fichero de migración**

Create `supabase/migrations/20260620120000_cascade_two_tier.sql` (ajustar el timestamp a la fecha/hora real):

```sql
-- Cascade two-tier: etiquetar detecciones por nivel/modelo + flag de criba a nivel imagen.

ALTER TABLE public.detections
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'edge'
    CHECK (source IN ('edge','cloud')),
  ADD COLUMN IF NOT EXISTS model TEXT;

CREATE INDEX IF NOT EXISTS idx_detections_source ON public.detections(source);

ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS screening_would_escalate BOOLEAN,
  ADD COLUMN IF NOT EXISTS edge_count INTEGER,
  ADD COLUMN IF NOT EXISTS cloud_count INTEGER;

COMMENT ON COLUMN public.detections.source IS 'Nivel de inferencia que produjo la detección: edge (FOMO/WASM) o cloud (Roboflow)';
COMMENT ON COLUMN public.detections.model IS 'Identificador del modelo, p.ej. fomo-320 o rfdetr-medium-v6';
COMMENT ON COLUMN public.images.screening_would_escalate IS 'Analítico H8: ¿la criba edge habría escalado esta imagen a cloud? (la cascada corre ambos niveles igualmente)';
```

- [ ] **Step 2: Aplicar la migración en Lovable Cloud**

Abrir el SQL editor del backend en Lovable Cloud (o el dashboard de Supabase del proyecto) y ejecutar el SQL del Step 1. Expected: `Success. No rows returned`.

- [ ] **Step 3: Verificar que las columnas existen**

En el SQL editor, ejecutar:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='detections' AND column_name IN ('source','model');
```

Expected: dos filas (`source`, `model`). Repetir mentalmente para `images` con `screening_would_escalate`, `edge_count`, `cloud_count`.

- [ ] **Step 4: Actualizar el tipo `detections` en `types.ts`**

En `src/integrations/supabase/types.ts`, en el bloque `detections` (líneas 17–60), añadir `source` y `model` a `Row`, `Insert` y `Update`. Resultado:

```ts
      detections: {
        Row: {
          confidence: number
          created_at: string
          height: number
          id: string
          image_id: string
          label: string
          model: string | null
          source: string
          width: number
          x: number
          y: number
        }
        Insert: {
          confidence: number
          created_at?: string
          height: number
          id?: string
          image_id: string
          label: string
          model?: string | null
          source?: string
          width: number
          x: number
          y: number
        }
        Update: {
          confidence?: number
          created_at?: string
          height?: number
          id?: string
          image_id?: string
          label?: string
          model?: string | null
          source?: string
          width?: number
          x?: number
          y?: number
        }
```

(El bloque `Relationships` de `detections` queda igual.)

- [ ] **Step 5: Actualizar el tipo `images` en `types.ts`**

En el bloque `images` (líneas 61–123), añadir `cloud_count`, `edge_count`, `screening_would_escalate` a `Row`, `Insert` y `Update`. En `Row` (valores presentes pero nullable):

```ts
          cloud_count: number | null
          edge_count: number | null
          screening_would_escalate: boolean | null
```

(insertar en orden alfabético, p.ej. `cloud_count` tras `captured_at`/`created_at`; `edge_count` antes de `error_message`; `screening_would_escalate` antes de `status`.) En `Insert` y `Update`, las mismas tres como opcionales:

```ts
          cloud_count?: number | null
          edge_count?: number | null
          screening_would_escalate?: boolean | null
```

- [ ] **Step 6: Verificar compilación TypeScript**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores (o los mismos errores preexistentes ajenos a estos cambios; no errores nuevos sobre `detections`/`images`).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260620120000_cascade_two_tier.sql src/integrations/supabase/types.ts
git commit -m "feat(F1): migración y tipos para detecciones de dos niveles (source/model + criba)"
```

---

### Task 3: Función pura `buildDetectionRows` (TDD)

**Files:**
- Create: `src/services/detectionMapper.ts`
- Create: `src/services/__tests__/detectionMapper.test.ts`
- Delete: `src/services/__tests__/sanity.test.ts` (ya no hace falta)

**Interfaces:**
- Consumes: nada (función pura).
- Produces:
  - `interface TieredDetection { label: string; confidence: number; x: number; y: number; width: number; height: number; source: 'edge' | 'cloud'; model?: string }`
  - `interface DetectionRow { image_id: string; label: string; confidence: number; x: number; y: number; width: number; height: number; source: 'edge' | 'cloud'; model: string | null }`
  - `buildDetectionRows(imageId: string, detections: TieredDetection[]): DetectionRow[]`
  - `toEdgeDetections(detections: { label: string; confidence: number; x: number; y: number; width: number; height: number }[]): TieredDetection[]` — etiqueta como `source: 'edge'`, `model: EDGE_MODEL_ID`.
  - `const EDGE_MODEL_ID = 'fomo-320'` (constante; en F3 se refinará leyéndolo de `classifier.getProperties().input_width`).

- [ ] **Step 1: Escribir el test que falla**

Create `src/services/__tests__/detectionMapper.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildDetectionRows, toEdgeDetections, EDGE_MODEL_ID } from '../detectionMapper';

describe('buildDetectionRows', () => {
  it('mapea detecciones a filas con source y model', () => {
    const rows = buildDetectionRows('img-1', [
      { label: 'plastic', confidence: 0.9, x: 0.1, y: 0.2, width: 0.3, height: 0.4, source: 'edge', model: 'fomo-320' },
    ]);
    expect(rows).toEqual([
      { image_id: 'img-1', label: 'plastic', confidence: 0.9, x: 0.1, y: 0.2, width: 0.3, height: 0.4, source: 'edge', model: 'fomo-320' },
    ]);
  });

  it('devuelve array vacío sin detecciones', () => {
    expect(buildDetectionRows('img-1', [])).toEqual([]);
  });

  it('pone model a null cuando falta', () => {
    const rows = buildDetectionRows('img-1', [
      { label: 'plastic', confidence: 0.5, x: 0, y: 0, width: 1, height: 1, source: 'cloud' },
    ]);
    expect(rows[0].model).toBeNull();
  });
});

describe('toEdgeDetections', () => {
  it('etiqueta como edge con el modelo por defecto', () => {
    const out = toEdgeDetections([
      { label: 'plastic', confidence: 0.7, x: 10, y: 20, width: 30, height: 40 },
    ]);
    expect(out).toEqual([
      { label: 'plastic', confidence: 0.7, x: 10, y: 20, width: 30, height: 40, source: 'edge', model: EDGE_MODEL_ID },
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FALLA con "Cannot find module '../detectionMapper'" (o similar).

- [ ] **Step 3: Implementar `detectionMapper.ts`**

Create `src/services/detectionMapper.ts`:

```ts
// Mapeo de detecciones de dos niveles (edge/cloud) a filas de la tabla `detections`.
// Nota: la normalización de coordenadas a fracciones 0–1 se implementa en F3.
// En F1 las coordenadas se guardan tal cual las produce cada nivel.

export const EDGE_MODEL_ID = 'fomo-320';

export interface TieredDetection {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'edge' | 'cloud';
  model?: string;
}

export interface DetectionRow {
  image_id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'edge' | 'cloud';
  model: string | null;
}

export function buildDetectionRows(imageId: string, detections: TieredDetection[]): DetectionRow[] {
  return detections.map((d) => ({
    image_id: imageId,
    label: d.label,
    confidence: d.confidence,
    x: d.x,
    y: d.y,
    width: d.width,
    height: d.height,
    source: d.source,
    model: d.model ?? null,
  }));
}

export function toEdgeDetections(
  detections: { label: string; confidence: number; x: number; y: number; width: number; height: number }[],
): TieredDetection[] {
  return detections.map((d) => ({ ...d, source: 'edge' as const, model: EDGE_MODEL_ID }));
}
```

- [ ] **Step 4: Ejecutar y ver que pasa; borrar el test de humo**

Run: `npm test`
Expected: todos los tests de `detectionMapper.test.ts` en `passed`.
Luego borrar el test de humo: `rm src/services/__tests__/sanity.test.ts` y volver a `npm test` (Expected: sigue todo en verde).

- [ ] **Step 5: Commit**

```bash
git add src/services/detectionMapper.ts src/services/__tests__/detectionMapper.test.ts
git rm src/services/__tests__/sanity.test.ts
git commit -m "feat(F1): mapper puro de detecciones de dos niveles con tests"
```

---

### Task 4: Cablear `saveDetections` para etiquetar el origen edge

**Files:**
- Modify: `src/services/imageService.ts:239-259` (función `saveDetections`)
- Modify: `src/hooks/useImageUpload.ts:65` (llamada a `saveDetections`)
- Modify: `src/pages/app/Uploads.tsx` (alrededor de la línea 199–210, donde se llama a `saveDetections`)

**Interfaces:**
- Consumes: `buildDetectionRows`, `toEdgeDetections`, `TieredDetection` de `src/services/detectionMapper.ts` (Task 3); columnas `source`/`model` de Task 2.
- Produces: `saveDetections(imageId: string, detections: TieredDetection[]): Promise<void>` — inserta filas con `source`/`model`. Los callers pasan detecciones ya etiquetadas (edge vía `toEdgeDetections`).

- [ ] **Step 1: Refactorizar `saveDetections` para usar el mapper**

En `src/services/imageService.ts`, sustituir la función `saveDetections` (líneas 239–259) por:

```ts
import { buildDetectionRows, type TieredDetection } from './detectionMapper';

/**
 * Guarda detecciones de dos niveles en la base de datos.
 * Las detecciones llegan ya etiquetadas con source/model (ver detectionMapper).
 */
export async function saveDetections(imageId: string, detections: TieredDetection[]) {
  if (detections.length === 0) return;

  const detectionsToInsert = buildDetectionRows(imageId, detections);

  const { error } = await supabase
    .from('detections')
    .insert(detectionsToInsert);

  if (error) {
    throw new Error(`Failed to save detections: ${error.message}`);
  }
}
```

(Mover el `import` de `detectionMapper` junto al resto de imports al principio del fichero, no en medio.)

- [ ] **Step 2: Etiquetar las detecciones edge en `useImageUpload.ts`**

En `src/hooks/useImageUpload.ts`, donde hoy está (línea ~55–65):

```ts
        // Run ML inference
        const detections = await mlService.processImage(file);
        ...
        // Save detections
        await saveDetections(uploadedImage.id, detections);
```

cambiar la línea de guardado para etiquetar como edge. Añadir el import al principio:

```ts
import { toEdgeDetections } from '@/services/detectionMapper';
```

y sustituir la llamada por:

```ts
        // Save detections (Nivel 1 = edge)
        await saveDetections(uploadedImage.id, toEdgeDetections(detections));
```

- [ ] **Step 3: Etiquetar las detecciones edge en `Uploads.tsx`**

En `src/pages/app/Uploads.tsx`, localizar la llamada a `saveDetections` (cerca de la línea 199–210, tras `mlService.processImage`). Añadir el import:

```ts
import { toEdgeDetections } from '@/services/detectionMapper';
```

y envolver las detecciones igual que en el hook:

```ts
      await saveDetections(uploadedImage.id, toEdgeDetections(detections));
```

(Si `Uploads.tsx` no llama directamente a `saveDetections` sino que reusa `useImageUpload`, omitir este step y dejar constancia en el commit.)

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores nuevos. Si `saveDetections` se usa en algún otro punto con la firma vieja, actualizarlo para pasar `TieredDetection[]`.

- [ ] **Step 5: Smoke test manual end-to-end**

Run: `npm run dev` y subir una imagen en Uploads. Luego, en el SQL editor de Lovable Cloud:

```sql
SELECT source, model, count(*) FROM public.detections GROUP BY source, model ORDER BY source;
```

Expected: aparece al menos una fila con `source = 'edge'` y `model = 'fomo-320'` correspondiente a la imagen subida.

- [ ] **Step 6: Commit**

```bash
git add src/services/imageService.ts src/hooks/useImageUpload.ts src/pages/app/Uploads.tsx
git commit -m "feat(F1): persistir detecciones edge etiquetadas con source/model"
```

---

## Self-Review (F1)

- **Cobertura del spec (§6 modelo de datos):** columnas `source`/`model` en `detections` ✓ (Task 2); `screening_would_escalate`/`edge_count`/`cloud_count` en `images` ✓ (Task 2); tipos actualizados ✓ (Task 2); `saveDetections` etiqueta source ✓ (Task 4). La **normalización de coordenadas a fracciones** del spec §6 se **difiere explícitamente a F3** (anotado en Architecture); F1 conserva las coordenadas tal cual para no dejar semántica a medias. ✓
- **Criterio de aceptación (spec §7 F1):** migración aplicada (Task 2), subida guarda `source='edge'` + `model` (Task 4 Step 5), tipos compilan (Task 2 Step 6 / Task 4 Step 4). ✓
- **Sin placeholders:** todos los steps con código/comandos/salida esperada. ✓
- **Consistencia de tipos:** `TieredDetection`/`DetectionRow`/`buildDetectionRows`/`toEdgeDetections`/`EDGE_MODEL_ID` definidos en Task 3 y usados con la misma firma en Task 4. `saveDetections(imageId, TieredDetection[])` consistente entre definición (Task 4 Step 1) y llamadas (Steps 2–3). ✓
- **Nota de coherencia con el diseño maestro:** actualizar §6 del doc maestro para indicar que la convención de fracciones 0–1 se realiza en F3 (no en F1). Pendiente de hacer al cerrar F1.
