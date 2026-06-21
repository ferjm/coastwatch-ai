# F2 — Edge Function `infer-cloud` (proxy a Roboflow) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una Supabase Edge Function `infer-cloud` que recibe una imagen del navegador, llama a la Hosted Inference API de Roboflow (modelo `coastal-plastic-5m/6`, RF-DETR-medium) usando un secret `ROBOFLOW_API_KEY`, y devuelve detecciones **normalizadas a fracciones 0–1** (esquina superior-izquierda), etiquetadas `source='cloud'`. La API key nunca llega al navegador.

**Architecture:** La función vive en `supabase/functions/infer-cloud/`. La lógica de **normalización de coordenadas** se extrae a un módulo **puro** (`normalize.ts`, sin APIs de Deno) que se testea con vitest (Node). El handler Deno (`index.ts`) importa ese módulo, hace el fetch a Roboflow y gestiona CORS/errores; se verifica con `deno check`. El despliegue y el secret son pasos manuales (no hay Supabase CLI local).

**Tech Stack:** Supabase Edge Functions (Deno 2.x), TypeScript, vitest. Roboflow Hosted Inference (serverless).

## Global Constraints

- El agente **no** ejecuta operaciones remotas (`git push`, PRs, `gh`). Solo local.
- **GPG roto en este entorno:** commitear siempre con `git -c commit.gpgsign=false commit -m "..."`.
- **Hook pre-commit bloquea menciones del nombre del asistente de IA** (el nombre exacto se indica en el prompt de despacho del subagente): no escribirlo en código, comentarios ni mensajes de commit.
- Modelo cloud: **`coastal-plastic-5m/6`** (RF-DETR-medium, mAP@50 81.98). Identificador de modelo en las detecciones: **`rfdetr-medium-v6`**.
- Host de inferencia: **`https://serverless.roboflow.com`** (fallback documentado: `https://detect.roboflow.com`).
- Secret: **`ROBOFLOW_API_KEY`**, solo en el entorno de la función. Nunca en el repo ni en el navegador.
- **Convención de coordenadas (debe coincidir con F1/F3):** fracciones 0–1, esquina **superior-izquierda**. Roboflow devuelve **centro** (x,y) + width/height en píxeles → hay que convertir.
- `package.json` ya tiene vitest (añadido en F1). Deno 2.7.4 está instalado localmente.

## Contrato de la respuesta de Roboflow (object-detection, estable y documentado)

```json
{
  "image": { "width": 640, "height": 640 },
  "predictions": [
    { "x": 320, "y": 320, "width": 64, "height": 128, "confidence": 0.91, "class": "plastic", "class_id": 0, "detection_id": "uuid" }
  ]
}
```
`x,y` = **centro** de la caja en píxeles de la imagen que Roboflow procesó; `width/height` en píxeles; `image.width/height` = dimensiones de esa imagen. (Confirmado el tipo del modelo vía `models_get`: object-detection, rfdetr-medium. El formato exacto se reconfirma con un `curl` real en la Task 3.)

---

### Task 1: Normalizador puro `normalize.ts` (TDD)

**Files:**
- Create: `supabase/functions/infer-cloud/normalize.ts`
- Create: `supabase/functions/infer-cloud/normalize.test.ts`
- Modify: `vitest.config.ts` (ampliar `include` para cubrir los tests de la función)

**Interfaces:**
- Consumes: nada (función pura).
- Produces:
  - `interface RoboflowPrediction { x: number; y: number; width: number; height: number; confidence: number; class: string }`
  - `interface RoboflowResponse { image: { width: number; height: number }; predictions: RoboflowPrediction[] }`
  - `interface CloudDetection { label: string; confidence: number; x: number; y: number; width: number; height: number; source: 'cloud'; model: string }`  (estructuralmente compatible con `TieredDetection` de F1)
  - `const CLOUD_MODEL_ID = 'rfdetr-medium-v6'`
  - `normalizeRoboflowResponse(resp: RoboflowResponse): CloudDetection[]`

- [ ] **Step 1: Ampliar `vitest.config.ts` para incluir los tests de la función**

Sustituir el array `include` en `vitest.config.ts`:

```ts
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
```

(El resto del fichero queda igual.)

- [ ] **Step 2: Escribir el test que falla**

Create `supabase/functions/infer-cloud/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeRoboflowResponse, CLOUD_MODEL_ID } from './normalize.ts';

describe('normalizeRoboflowResponse', () => {
  it('convierte centro-px a fracciones esquina-superior-izquierda', () => {
    const out = normalizeRoboflowResponse({
      image: { width: 640, height: 640 },
      predictions: [
        { x: 320, y: 320, width: 64, height: 128, confidence: 0.91, class: 'plastic' },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      label: 'plastic',
      confidence: 0.91,
      x: 0.45,        // (320 - 64/2) / 640
      y: 0.4,         // (320 - 128/2) / 640
      width: 0.1,     // 64 / 640
      height: 0.2,    // 128 / 640
      source: 'cloud',
      model: CLOUD_MODEL_ID,
    });
  });

  it('maneja varias predicciones y dimensiones no cuadradas', () => {
    const out = normalizeRoboflowResponse({
      image: { width: 1024, height: 512 },
      predictions: [
        { x: 512, y: 256, width: 100, height: 50, confidence: 0.6, class: 'plastic' },
        { x: 100, y: 100, width: 20, height: 20, confidence: 0.3, class: 'plastic' },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0].x).toBeCloseTo((512 - 50) / 1024, 6);
    expect(out[0].y).toBeCloseTo((256 - 25) / 512, 6);
    expect(out[0].width).toBeCloseTo(100 / 1024, 6);
    expect(out[0].height).toBeCloseTo(50 / 512, 6);
    expect(out[1].label).toBe('plastic');
  });

  it('devuelve [] sin predicciones', () => {
    expect(normalizeRoboflowResponse({ image: { width: 640, height: 640 }, predictions: [] })).toEqual([]);
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npm test`
Expected: FALLA con "Cannot find module './normalize.ts'" (o similar).

- [ ] **Step 4: Implementar `normalize.ts`**

Create `supabase/functions/infer-cloud/normalize.ts`:

```ts
// Normalización pura de la respuesta de Roboflow (object-detection) a detecciones
// en fracciones 0–1, esquina superior-izquierda. Sin APIs de Deno: testeable con vitest.

export const CLOUD_MODEL_ID = 'rfdetr-medium-v6';

export interface RoboflowPrediction {
  x: number;       // centro X en px
  y: number;       // centro Y en px
  width: number;   // px
  height: number;  // px
  confidence: number;
  class: string;
}

export interface RoboflowResponse {
  image: { width: number; height: number };
  predictions: RoboflowPrediction[];
}

export interface CloudDetection {
  label: string;
  confidence: number;
  x: number;      // fracción 0–1, esquina superior-izquierda
  y: number;
  width: number;  // fracción 0–1
  height: number; // fracción 0–1
  source: 'cloud';
  model: string;
}

export function normalizeRoboflowResponse(resp: RoboflowResponse): CloudDetection[] {
  const iw = resp.image.width;
  const ih = resp.image.height;
  return resp.predictions.map((p) => ({
    label: p.class,
    confidence: p.confidence,
    x: (p.x - p.width / 2) / iw,
    y: (p.y - p.height / 2) / ih,
    width: p.width / iw,
    height: p.height / ih,
    source: 'cloud' as const,
    model: CLOUD_MODEL_ID,
  }));
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npm test`
Expected: todos los tests de `normalize.test.ts` (y los de F1) en verde.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/infer-cloud/normalize.ts supabase/functions/infer-cloud/normalize.test.ts vitest.config.ts
git -c commit.gpgsign=false commit -m "feat(F2): normalizador puro de la respuesta de Roboflow con tests"
```

---

### Task 2: Handler Deno `index.ts` de la Edge Function

**Files:**
- Create: `supabase/functions/infer-cloud/index.ts`

**Interfaces:**
- Consumes: `normalizeRoboflowResponse`, `CloudDetection` de `./normalize.ts` (Task 1).
- Produces: endpoint HTTP. **Request** (POST JSON): `{ image: string /* base64 sin prefijo data: */, confidence?: number, overlap?: number }`. **Response** (JSON): `{ detections: CloudDetection[], image: { width: number; height: number }, count: number }`. Errores → status 400/500 con `{ error: string }`.

- [ ] **Step 1: Implementar el handler**

Create `supabase/functions/infer-cloud/index.ts` (sigue el patrón de `supabase/functions/get-google-maps-key/index.ts`):

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { normalizeRoboflowResponse, type RoboflowResponse } from './normalize.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROBOFLOW_HOST = 'https://serverless.roboflow.com'
const MODEL = 'coastal-plastic-5m/6'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
      })
    }

    const apiKey = Deno.env.get('ROBOFLOW_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ROBOFLOW_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      })
    }

    const body = await req.json()
    const image: string | undefined = body?.image
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "image" (base64 string) in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }
    const confidence = typeof body?.confidence === 'number' ? body.confidence : 0.4
    const overlap = typeof body?.overlap === 'number' ? body.overlap : 0.5

    const url = `${ROBOFLOW_HOST}/${MODEL}?api_key=${apiKey}&confidence=${confidence}&overlap=${overlap}`
    const rfResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: image,
    })

    if (!rfResp.ok) {
      const text = await rfResp.text()
      return new Response(JSON.stringify({ error: `Roboflow error ${rfResp.status}: ${text}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
      })
    }

    const rfJson = await rfResp.json() as RoboflowResponse
    const detections = normalizeRoboflowResponse(rfJson)

    return new Response(JSON.stringify({
      detections,
      image: rfJson.image,
      count: detections.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
```

- [ ] **Step 2: Type-check del handler con Deno**

Run: `deno check supabase/functions/infer-cloud/index.ts`
Expected: `Check ...index.ts` sin errores. (Deno descargará el módulo `std` la primera vez; necesita red.)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/infer-cloud/index.ts
git -c commit.gpgsign=false commit -m "feat(F2): handler Deno de la Edge Function infer-cloud"
```

---

### Task 3: Despliegue y verificación (pasos manuales de Fernando)

> Esta tarea NO la ejecuta un subagente: requiere el panel de Lovable Cloud / la API key real. Se documenta aquí como checklist y criterio de aceptación de F2.

**Files:**
- Create: `supabase/functions/infer-cloud/README.md` (instrucciones de deploy + verificación; el agente SÍ crea este fichero)

- [ ] **Step 1 (agente): crear el README de la función**

Create `supabase/functions/infer-cloud/README.md`:

```markdown
# infer-cloud — proxy a Roboflow Hosted Inference

Recibe `{ image: <base64> }` por POST y devuelve detecciones normalizadas (fracciones 0–1,
esquina superior-izquierda, `source='cloud'`, `model='rfdetr-medium-v6'`) del modelo
`coastal-plastic-5m/6` (RF-DETR-medium).

## Secret requerido
- `ROBOFLOW_API_KEY` — API key privada de Roboflow (workspace ecos-u7zcx). NO se versiona.

## Desplegar (elige una vía)
### A) Lovable Cloud (sin CLI)
1. Sincroniza el repo con GitHub → Lovable detecta `supabase/functions/infer-cloud`.
2. En el panel de backend de Lovable Cloud, añade el secret `ROBOFLOW_API_KEY`.
3. Despliega la función desde el panel.

### B) Supabase CLI
```sh
npm i -g supabase   # o brew install supabase/tap/supabase
supabase login
supabase functions deploy infer-cloud --project-ref <PROJECT_REF>
supabase secrets set ROBOFLOW_API_KEY=<tu_key> --project-ref <PROJECT_REF>
```

## Verificar con curl
La función exige JWT por defecto: usa la anon key como Bearer.
```sh
IMG_B64=$(base64 -i una_imagen.jpg | tr -d '\n')
curl -s -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/infer-cloud" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$IMG_B64\"}" | jq
```
Esperado: `{ "detections": [...], "image": {"width":..,"height":..}, "count": N }`, con cajas en 0–1.
```

- [ ] **Step 2 (agente): commit del README**

```bash
git add supabase/functions/infer-cloud/README.md
git -c commit.gpgsign=false commit -m "docs(F2): README de despliegue de la Edge Function infer-cloud"
```

- [ ] **Step 3 (Fernando): desplegar + secret + curl**

Seguir el README. **Criterio de aceptación de F2:** un `curl` a la función con una imagen de prueba (idealmente una con plástico del set de test) devuelve `detections` con cajas en fracciones 0–1 y `source='cloud'`; la `ROBOFLOW_API_KEY` no aparece en ninguna respuesta ni en el bundle del frontend. Confirmar de paso que los nombres de campo de Roboflow (`x,y,width,height,confidence,class`,`image.width/height`) coinciden con el contrato asumido; si difieren, ajustar `normalize.ts` y su test.

---

## Self-Review (F2)

- **Cobertura del spec (diseño maestro §4 componentes, §5.1 coordenadas, §5.4 secreto, §7 F2):** Edge Function que llama a Roboflow con secret ✓ (Task 2); normalización centro-px → fracción 0–1 esquina-sup-izq ✓ (Task 1); secret solo en la función, nunca en navegador ✓ (Task 2 lee `Deno.env`); criterio de aceptación "curl devuelve cajas 0–1, key no expuesta" ✓ (Task 3). ✓
- **Sin placeholders:** todo el código y comandos están completos; los valores (modelo, host, secret, fórmula de conversión) son exactos. ✓
- **Consistencia de tipos:** `normalizeRoboflowResponse`/`RoboflowResponse`/`CloudDetection`/`CLOUD_MODEL_ID` definidos en Task 1 y usados con la misma firma en Task 2. `CloudDetection` es estructuralmente un `TieredDetection` (F1) → F3 podrá persistirlo con `buildDetectionRows`. ✓
- **Riesgo asumido y mitigado:** el formato exacto de Roboflow se asume del contrato documentado de object-detection y se **reconfirma con un curl real** en Task 3; si difiere, el único punto a tocar es `normalize.ts` (función pura con test). ✓
- **Límite de fase:** F2 termina en "la función desplegada devuelve detecciones cloud normalizadas". El cliente del navegador que la invoca (`cloudProvider`) y la orquestación edge+cloud son F3. ✓
```
