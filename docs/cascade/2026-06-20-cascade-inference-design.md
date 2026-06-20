# Diseño maestro — Inferencia en cascada (edge + cloud) para CoastWatch AI

**Fecha:** 2026-06-20
**Autor:** Fernando Jiménez Moreno
**Contexto:** TFM UNIR — Detección de residuos plásticos en zonas costeras. Draft 3 reencuadra el
sistema como **dos niveles**: Nivel 1 *edge* (Edge Impulse FOMO, en el navegador vía WASM) y
Nivel 2 *cloud* (Roboflow RF-DETR alojado). Este documento es el **diseño maestro**; cada fase
(F0–F6) tendrá su propio plan de implementación.

---

## 1. Objetivos y motivación

1. **Desacoplar el desarrollo de Lovable** sin abandonar su hosting: el código se edita y ejecuta
   **en local** (Vite dev server) contra el mismo backend de Lovable Cloud (Supabase). Lovable se
   mantiene como plataforma de *deploy* y sincroniza por GitHub.
2. **Refactorizar la inferencia a una cascada de dos niveles**: hoy la app corre solo FOMO en WASM.
   El objetivo es ejecutar **siempre ambos niveles** (edge + cloud) por imagen y mostrarlos lado a
   lado, registrando además la decisión que una criba *habría* tomado (para conservar el argumento
   de ahorro de H8 como métrica analítica).

### No-objetivos (YAGNI)
- No se cambia de plataforma de hosting (sigue Lovable).
- No se elimina la integración de auth de Lovable (`@lovable.dev/cloud-auth-js`) ni `lovable-tagger`:
  son compatibles con el desarrollo local y el deploy en Lovable.
- No se implementa una criba real que *omita* el cloud (decisión de producto: "siempre ambos").
  La criba se calcula y se registra, pero no corta el flujo.

---

## 2. Restricciones

- **Sin operaciones remotas por parte del agente:** nada de `git push`, PRs, ni `gh`. El trabajo es
  local; la sincronización con GitHub/Lovable la lanza Fernando.
- **Idioma del TFM:** español (la app puede seguir en i18n EN/ES como está).
- **Fidelidad a la evidencia:** los números del TFM ya están en `Diario_Experimentos_EdgeImpulse.md`
  (§14). El modelo cloud por defecto es el ganador: `coastal-plastic-5m` **v6** (RF-DETR-medium
  @1024, mAP@50 0.820).
- **Coste:** todo en tiers gratuitos. Roboflow Hosted Inference tiene límite mensual de llamadas en
  el plan free, suficiente para demo/defensa.

---

## 3. Arquitectura actual (punto de partida)

- **Frontend:** Vite + React 18 + TypeScript + shadcn/ui + Tailwind. Scaffold de Lovable
  (`vite_react_shadcn_ts`).
- **Backend:** Supabase (Lovable Cloud). Postgres (`images`, `detections`, `profiles`, `user_roles`
  + RLS), Storage (`images`, `thumbnails`), Auth, Edge Functions Deno
  (`get-google-maps-key`, `get-users-with-roles`).
- **Inferencia:** 100% en cliente. `src/services/mlService.ts` carga
  `public/edge-impulse-standalone.{js,wasm}` (~47 MB) + `run-impulse.js`, construye un clasificador,
  convierte la imagen a features (enteros RGB empaquetados) y ejecuta `classify()`. Devuelve cajas en
  **espacio de píxeles del modelo** (p. ej. 320×320).
- **Camino real de datos:** `pages/app/Uploads.tsx` / `hooks/useImageUpload.ts` →
  `services/imageService.ts` (sube a Storage + inserta en `images`) → `mlService.processImage` →
  `saveDetections` (inserta en `detections`).
- **Camino mock:** `services/api.ts` + `src/mocks/handlers.ts` (MSW) simulan una API REST `/api/*`
  (jobs, heatmap, export) usada por páginas aún no conectadas a datos reales.

### Puntos de acoplamiento a Lovable (se conservan)
- `@lovable.dev/cloud-auth-js` + `src/integrations/lovable/index.ts` (wrapper de OAuth).
- `lovable-tagger` (plugin de Vite, solo dev).
- El proyecto Supabase está gestionado por Lovable Cloud.

---

## 4. Arquitectura objetivo

```
Navegador (SPA React, dev LOCAL, deploy Lovable)
  Uploads/useImageUpload
        │
        ▼
  cascadeService ──► edgeProvider  (FOMO WASM)            [Nivel 1, cliente]
        │         └► cloudProvider ──fetch──┐             [Nivel 2]
        ▼                                   │
  normaliza coords (0–1) + source + flag "se habría escalado"
        │ persiste                          │ POST imagen
        ▼                                   ▼
Supabase / Lovable Cloud                Edge Function 'infer-cloud'
  Postgres: images, detections(+source,+model)   │ secret ROBOFLOW_API_KEY
  Storage: images, thumbnails                     ▼
                                       Roboflow Hosted Inference API
                                       coastal-plastic-5m / v6 (RF-DETR)
```

### Componentes (límites e interfaces)

- **`edgeProvider`** — envuelve el WASM de Edge Impulse actual. Entrada: `File`/`ImageData`. Salida:
  `Detection[]` normalizadas. *Refactor de `mlService.ts`, misma lógica de carga del WASM.*
- **`cloudProvider`** — hace `POST` a la Edge Function `infer-cloud` con la imagen. Salida:
  `Detection[]` normalizadas. No conoce la API key.
- **`cascadeService`** — orquestador. Ejecuta edge y cloud, normaliza coordenadas a fracciones 0–1,
  etiqueta `source`/`model`, calcula `screeningWouldEscalate`, y devuelve un resultado unificado.
- **Edge Function `infer-cloud`** — Deno. Recibe imagen (base64/multipart), llama a Roboflow Hosted
  Inference con `ROBOFLOW_API_KEY`, traduce la respuesta de Roboflow a `Detection[]` normalizadas.

### Contrato de `Detection` (unificado, normalizado)

```ts
interface Detection {
  label: string;
  confidence: number;       // 0–1
  // Caja en FRACCIONES de la imagen original, esquina superior-izquierda:
  x: number;                // 0–1
  y: number;                // 0–1
  width: number;            // 0–1
  height: number;           // 0–1
  source: 'edge' | 'cloud';
  model: string;            // p.ej. 'fomo-320', 'rfdetr-medium-v6'
}
```

---

## 5. Decisiones de diseño clave

### 5.1 Normalización de coordenadas (riesgo nº1)
- **FOMO (edge)** devuelve `(x,y)` = esquina sup-izq en *espacio del modelo* (p. ej. 320×320).
  Conversión: dividir por `input_width`/`input_height` → fracciones 0–1.
- **Roboflow (cloud)** devuelve `(x,y)` = **centro** de la caja en píxeles de la imagen de inferencia,
  más `image.width`/`image.height`. Conversión:
  `x_frac = (x - width/2) / image.width`, `y_frac = (y - height/2) / image.height`,
  `w_frac = width / image.width`, `h_frac = height / image.height`.
- **Persistencia y render** usan SIEMPRE fracciones 0–1. El visor multiplica por el tamaño renderizado.
  *Esto elimina la dependencia actual del visor respecto al tamaño del modelo.*

### 5.2 Procedencia (`source`, `model`)
Cada detección guarda de qué nivel y modelo viene, para poder pintar y comparar edge vs cloud y para
las figuras del TFM.

### 5.3 Criba analítica (H8) sin cortar el flujo
A nivel imagen se registra `screening_would_escalate` (= ¿FOMO detectó ≥1 candidato?). Se ejecuta el
cloud igualmente, pero el panel puede mostrar "se habría escalado / se habría ahorrado", conservando
el argumento de ahorro de banda de H8 como overlay analítico.

### 5.4 Seguridad del secreto
`ROBOFLOW_API_KEY` vive solo como *secret* de la Edge Function. El navegador llama a la función, nunca
a Roboflow directamente. (Verificar pronto que el plan de Lovable Cloud permite añadir una Edge
Function nueva con secret; plan B: mover solo ese proxy a Cloudflare/Vercel Functions.)

---

## 6. Cambios de modelo de datos (F1)

`detections` (añadir, con defaults para no romper filas existentes):
- `source TEXT NOT NULL DEFAULT 'edge' CHECK (source IN ('edge','cloud'))`
- `model TEXT` (nullable; p. ej. `'fomo-320'`, `'rfdetr-medium-v6'`)
- **Coordenadas:** la convención pasa a **fracciones 0–1**, pero ese cambio se **implementa en F3**
  (cuando existen ambos proveedores y la normalización se aplica de forma consistente a edge y cloud),
  no en F1. En F1 las coordenadas se guardan tal cual las produce hoy el edge (espacio del modelo)
  para no dejar semántica a medias. Decisión acordada: reinterpretar `x,y,width,height` como
  fracciones de aquí en adelante (las filas viejas, datos de prueba, quedan en espacio-modelo y se
  documentan) en vez de añadir columnas `*_frac`.

`images` (añadir):
- `screening_would_escalate BOOLEAN` (nullable hasta procesar)
- opcional: `edge_count INT`, `cloud_count INT` para acelerar el dashboard.

Actualizar `src/integrations/supabase/types.ts`, `imageService.saveDetections` y los tipos en
`src/types/index.ts`.

---

## 7. Hoja de ruta por fases

Cada fase es independientemente desplegable (la app sigue funcionando al terminar). F1 y F2 son hojas
independientes; F3 las integra.

| Fase | Entrega | Depende | Criterio de aceptación |
|------|---------|---------|------------------------|
| **F0 — Entorno local** | App corriendo en local contra Lovable Cloud; workflow GitHub↔Lovable acordado. Sin cambios de feature. | — | `npm install && npm run dev` levanta la app, login funciona, WASM carga, una imagen produce detecciones edge como hoy. |
| **F1 — Modelo de datos 2 niveles** | Migración (`source`, `model`, criba) + tipos + `saveDetections`. Edge sigue, ahora `source='edge'`. | F0 | Migración aplicada; una subida guarda detecciones con `source='edge'` y `model` poblado; tipos compilan. |
| **F2 — Edge Function `infer-cloud`** | Proxy serverless a Roboflow Hosted API; devuelve `Detection[]` normalizadas. | F0 | `curl` a la función con una imagen de test devuelve cajas de RF-DETR v6 normalizadas 0–1; la key no se expone. |
| **F3 — Orquestador de cascada** | `cascadeService` + `edgeProvider`/`cloudProvider`; corre ambos, normaliza, calcula criba, persiste. Cableado en Uploads. | F1, F2 | Subir una imagen genera y guarda detecciones edge **y** cloud con su `source`; `screening_would_escalate` poblado. |
| **F4 — Visor de dos niveles** | `InferenceResults`/`DetectionImageViewer` muestran edge vs cloud (colores, capas conmutables), contadores y badge de criba. Página Models con ambos modelos. | F3 | En una imagen procesada se ven ambas capas, se pueden conmutar, y los recuadros caen sobre los objetos correctos. |
| **F5 — Mapa y Dashboard reales** | Heatmap + Dashboard leen detecciones reales (filtrables por `source`), dejan MSW. | F1, F3 | Mapa/dashboard reflejan las detecciones reales; filtro edge/cloud funciona. |
| **F6 — Cola de inferencia real (Jobs)** | Cola real en Supabase sustituye el mock `api.ts`/MSW; Jobs/Review leen de ella. | F1–F5 | Encolar una imagen crea un job real, se procesa por la cascada y aparece en Jobs/Review. |

---

## 8. Riesgos y asuntos abiertos

1. **Lovable Cloud + Edge Function/secret nueva:** verificar en F2 que se puede añadir `infer-cloud`
   con `ROBOFLOW_API_KEY`. Plan B: proxy en Cloudflare/Vercel Functions.
2. **Formato/limites de Roboflow Hosted Inference:** confirmar endpoint exacto para RF-DETR servido
   (`serverless.roboflow.com` vs `detect.roboflow.com`), formato de entrada (base64) y de salida
   (centro x/y). Confirmar límite mensual del plan free.
3. **Tamaño del WASM (47 MB)** en `public/`: aceptable en local y en el deploy de Lovable; vigilar
   tiempos de carga inicial.
4. **Coordenadas heredadas:** las filas `detections` actuales están en espacio-modelo; tras F1 la
   convención es fracciones. Documentar o limpiar datos de prueba.
5. **CORS / tamaño de imagen** en la Edge Function: imágenes de dron grandes → considerar redimensionar
   antes de enviar al cloud (Roboflow ya redimensiona, pero conviene limitar el payload).

---

## 9. Estado

- [x] Exploración del contexto
- [x] Decisiones de diseño acordadas (stay-Lovable + dev local; cascada "siempre ambos"; Hosted API;
  refactor completo decomposado)
- [x] Diseño maestro (este documento)
- [ ] Planes por fase (empezando por F0/F1)
- [ ] Implementación incremental F0 → F6
