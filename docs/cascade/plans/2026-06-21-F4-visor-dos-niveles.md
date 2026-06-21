# F4 — Visor de dos niveles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans. F4 es UI; se verifica con `tsc` + validación visual (no hay tests de render). Pasos con checkbox.

**Goal:** Que el visor distinga visualmente **edge vs cloud**: cajas coloreadas por `source` con leyenda, capas conmutables (Edge / Cloud / Ambos), y un badge de criba (H8) con contadores por nivel. Además, alinear las cajas en el componente de Revisión (`EditableBoundingBox`).

**Architecture:** Se enhebra `source` (y los metadatos de cascada de la imagen) desde `Uploads.loadImages` hasta el visor (`InferenceResults`), que ya recibe las detecciones. El coloreado y el filtrado por capa son lógica de presentación en `InferenceResults`. El arreglo de aspect ratio en `EditableBoundingBox` replica el patrón ya aplicado al modal.

**Tech Stack:** React/TS, shadcn/ui (Badge, Button), Supabase (datos ya cargados).

## Estado de partida (ya hecho en iteraciones previas, NO repetir)
- ✅ Modal con aspect ratio real (cajas alineadas) y carga de imagen original (URL firmada).
- ✅ Zoom/pan (`react-zoom-pan-pinch`): rueda, doble click, pan, botones, teclado.

## Global Constraints
- No remote ops. GPG: `git -c commit.gpgsign=false`. El hook bloquea el nombre del asistente de IA (no escribirlo).
- Convención coords: fracciones 0–1 en datos; el render usa % (×100, ya aplicado en `loadImages`).
- Colores por nivel: **edge = `#EC4899` (rosa)**, **cloud = `#06B6D4` (cian)** — alto contraste sobre arena/vegetación. Constantes reutilizables.
- `source` en `detections` y `edge_count`/`cloud_count`/`screening_would_escalate` en `images` ya existen (F1) y se pueblan (F3).

---

### Task 1: Enhebrar `source` y metadatos de cascada hasta el visor

**Files:** Modify `src/components/InferenceResults.tsx` (interfaces), `src/pages/app/Uploads.tsx` (`loadImages`).

- [ ] **Step 1:** En `InferenceResults.tsx`, añade `source` a la interfaz `Detection`:
```ts
export interface Detection {
  id: string;
  class: string;
  confidence: number;
  source?: 'edge' | 'cloud';
  bbox: { x: number; y: number; width: number; height: number };
}
```
- [ ] **Step 2:** En `InferenceResults.tsx`, añade a `ProcessedImage` (tras `detections`):
```ts
  edgeCount?: number;
  cloudCount?: number;
  screeningWouldEscalate?: boolean | null;
```
- [ ] **Step 3:** En `Uploads.tsx` `loadImages`, en el `.map` de `detections` añade `source: d.source,`. Y en el objeto `ProcessedImage` devuelto, añade:
```ts
            edgeCount: img.edge_count ?? undefined,
            cloudCount: img.cloud_count ?? undefined,
            screeningWouldEscalate: img.screening_would_escalate,
```
- [ ] **Step 4:** `npx tsc --noEmit -p tsconfig.app.json` → sin errores. Commit:
```bash
git add src/components/InferenceResults.tsx src/pages/app/Uploads.tsx
git -c commit.gpgsign=false commit -m "feat(F4): enhebrar source y metadatos de cascada hasta el visor"
```

---

### Task 2: Colorear por nivel + leyenda + capas conmutables

**Files:** Modify `src/components/InferenceResults.tsx`.

- [ ] **Step 1:** Cerca de `getDetectionClassColors`, añade constantes y helper:
```ts
const SOURCE_COLORS: Record<'edge' | 'cloud', string> = { edge: '#EC4899', cloud: '#06B6D4' };
const sourceColor = (source?: 'edge' | 'cloud') => (source ? SOURCE_COLORS[source] : '#3B82F6');
const sourceLabel = (source?: 'edge' | 'cloud') => (source === 'edge' ? 'Edge (FOMO)' : source === 'cloud' ? 'Cloud (RF-DETR)' : '—');
```
- [ ] **Step 2:** Estado de capa en el componente (junto a los otros `useState`):
```ts
const [layer, setLayer] = useState<'both' | 'edge' | 'cloud'>('both');
```
- [ ] **Step 3:** En el modal, deriva las detecciones visibles según la capa (justo antes del overlay):
```tsx
const visibleDetections = selectedImage.detections.filter(
  (d) => layer === 'both' || d.source === layer,
);
```
y en el overlay sustituye `selectedImage.detections.map(...)` por `visibleDetections.map(...)`, coloreando cada caja con `sourceColor(detection.source)` (en `borderColor` y en el fondo de la etiqueta), y la etiqueta mostrando `{detection.class} {conf}%`.
- [ ] **Step 4:** Sobre la imagen (encima del `TransformWrapper`), añade el control de capas + leyenda:
```tsx
<div className="absolute top-2 left-2 z-10 flex items-center gap-2">
  <div className="flex rounded-md overflow-hidden border bg-background/80 backdrop-blur">
    {(['both', 'edge', 'cloud'] as const).map((l) => (
      <button
        key={l}
        onClick={() => setLayer(l)}
        className={`px-2 py-1 text-xs ${layer === l ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
      >
        {l === 'both' ? 'Ambos' : l === 'edge' ? 'Edge' : 'Cloud'}
      </button>
    ))}
  </div>
  <div className="flex items-center gap-2 text-xs bg-background/80 backdrop-blur rounded-md px-2 py-1">
    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: SOURCE_COLORS.edge }} />Edge</span>
    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: SOURCE_COLORS.cloud }} />Cloud</span>
  </div>
</div>
```
- [ ] **Step 5:** `tsc` limpio. Commit:
```bash
git add src/components/InferenceResults.tsx
git -c commit.gpgsign=false commit -m "feat(F4): cajas coloreadas por nivel, leyenda y capas conmutables"
```

---

### Task 3: Badge de criba (H8) + contadores por nivel

**Files:** Modify `src/components/InferenceResults.tsx` (sección "Image Details" del modal).

- [ ] **Step 1:** En la rejilla de detalles del modal, añade contadores y el badge de criba:
```tsx
<div>
  <span className="text-muted-foreground">Niveles:</span>{' '}
  <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.edge, color: SOURCE_COLORS.edge }}>
    {selectedImage.edgeCount ?? 0} edge
  </Badge>{' '}
  <Badge variant="outline" style={{ borderColor: SOURCE_COLORS.cloud, color: SOURCE_COLORS.cloud }}>
    {selectedImage.cloudCount ?? 0} cloud
  </Badge>
</div>
{selectedImage.screeningWouldEscalate != null && (
  <div>
    <span className="text-muted-foreground">Criba (H8):</span>{' '}
    <Badge variant={selectedImage.screeningWouldEscalate ? 'default' : 'secondary'}>
      {selectedImage.screeningWouldEscalate
        ? 'El edge la habría escalado'
        : 'El edge no vió nada (se habría ahorrado / posible falso negativo)'}
    </Badge>
  </div>
)}
```
- [ ] **Step 2:** `tsc` limpio. Commit:
```bash
git add src/components/InferenceResults.tsx
git -c commit.gpgsign=false commit -m "feat(F4): badge de criba H8 y contadores por nivel en el modal"
```

---

### Task 4: Alinear cajas en `EditableBoundingBox` (Revisión)

**Files:** Modify `src/components/EditableBoundingBox.tsx`.

- [ ] **Step 1:** En el bloque `showDirectly` (contenedor `aspect-video` con `object-cover`), cambia a aspecto natural sin recorte: usa `object-contain` y deja que el contenedor adopte el ratio de la imagen. Como aquí no se conoce la resolución por prop, envuelve la imagen en un `inline-block` natural:
```tsx
<div className="relative rounded-lg overflow-hidden bg-muted w-full">
  <img src={imageUrl} alt="Detection" className="block w-full h-auto" />
  {/* overlay de cajas en % — sin cambios de posicionamiento */}
  ...
</div>
```
(Sustituye el `aspect-video` + `object-cover` por `w-full` + `object-contain`/`h-auto`; el overlay en % ya coincidirá con la imagen.)
- [ ] **Step 2:** Repite el mismo cambio en el segundo render (el editable, contenedor con `height: '400px'` + `object-contain`): cambia a `w-full h-auto` para que el overlay en % coincida con la imagen renderizada (en vez de un alto fijo que deja bandas).
- [ ] **Step 3:** `tsc` limpio. Commit:
```bash
git add src/components/EditableBoundingBox.tsx
git -c commit.gpgsign=false commit -m "feat(F4): alinear cajas en EditableBoundingBox (Revision)"
```

---

## Self-Review (F4)
- Cobertura (diseño maestro §7 F4): colores por nivel + leyenda (Task 2), capas conmutables (Task 2), badge de criba + contadores (Task 3), aspect ratio en Revisión (Task 4); `source`/meta enhebrados (Task 1). El visor con aspect ratio/full-res/zoom ya estaba hecho. ✓
- Sin placeholders; cada paso con código y verificación `tsc`. ✓
- Consistencia: `SOURCE_COLORS`/`sourceColor` definidos una vez y reutilizados; `Detection.source` y `ProcessedImage.edgeCount/cloudCount/screeningWouldEscalate` enhebrados desde `loadImages`. ✓
- Límite de fase: el mapa/dashboard reales (filtros por `source`) son F5; la cola de jobs es F6. ✓
