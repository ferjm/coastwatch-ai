# F5 — Mapa y Dashboard con datos reales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans. La capa de datos lleva una función pura testeada (vitest); la UI se verifica con `tsc`/build + validación visual.

**Goal:** Que el Mapa y el Dashboard dejen de usar datos mock y lean **detecciones reales** de Supabase, con el eje **edge vs cloud** (filtro por `source`). Cada imagen con GPS = un punto en el mapa, ponderado por nº de detecciones del nivel seleccionado.

**Architecture:** Una capa de analítica (`src/services/analyticsService.ts`) consulta Supabase (`images` + `detections`) y expone `loadMapPoints()` y `loadDashboardStats()`. La agregación de stats se extrae a una función **pura** (`aggregateDashboardStats`) testeada con vitest. `MapView`, `PlasticDetectionMap` y `Dashboard` consumen esa capa. Se reusa el patrón edge=`#EC4899` / cloud=`#06B6D4` de F4.

**Tech Stack:** React/TS, Supabase JS, Google Maps (`@googlemaps/react-wrapper`), recharts, vitest.

## Global Constraints
- No remote ops. GPG: `git -c commit.gpgsign=false`. El hook bloquea el nombre del asistente de IA (no escribirlo).
- Colores por nivel: edge `#EC4899`, cloud `#06B6D4`, ambos `#3B82F6`.
- Las coords ya son fracciones; aquí trabajamos con GPS (`images.gps_latitude/longitude`).
- Dependencias externas (no las arregla F5): imágenes con GPS EXIF; secret `GOOGLE_MAPS_API_KEY` para el mapa. Si faltan, degradar con estado vacío/aviso, sin romper.

---

### Task 1: Capa de analítica (`analyticsService.ts`) — TDD para la agregación

**Files:**
- Create: `src/services/analyticsService.ts`
- Create: `src/services/__tests__/analyticsService.test.ts`

**Interfaces (produce):**
- `type SourceFilter = 'both' | 'edge' | 'cloud'`
- `interface MapPoint { id: string; lat: number; lng: number; fileName: string; edgeCount: number; cloudCount: number; capturedAt?: string; thumbnailPath: string | null }`
- `interface ImageAgg { status: string; capturedAt?: string; uploadedAt: string; edgeCount: number; cloudCount: number; screeningWouldEscalate: boolean | null }`
- `interface DashboardStats { totalImages: number; processedImages: number; edgeDetections: number; cloudDetections: number; imagesWithPlastic: number; escalationRate: number; bySource: { name: string; count: number; color: string }[]; timeline: { date: string; detections: number }[] }`
- `aggregateDashboardStats(images: ImageAgg[]): DashboardStats` (pura)
- `loadMapPoints(): Promise<MapPoint[]>` y `loadDashboardStats(): Promise<DashboardStats>` (async, Supabase)
- `pointCountForSource(p: MapPoint, source: SourceFilter): number`

- [ ] **Step 1: Test que falla** — Create `src/services/__tests__/analyticsService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { aggregateDashboardStats, pointCountForSource, type ImageAgg } from '../analyticsService';

const img = (o: Partial<ImageAgg>): ImageAgg => ({
  status: 'processed', uploadedAt: '2026-06-20T10:00:00Z', edgeCount: 0, cloudCount: 0,
  screeningWouldEscalate: null, ...o,
});

describe('aggregateDashboardStats', () => {
  it('cuenta imágenes, detecciones por nivel e imágenes con plástico', () => {
    const s = aggregateDashboardStats([
      img({ status: 'processed', edgeCount: 0, cloudCount: 5, screeningWouldEscalate: false, capturedAt: '2026-06-20T10:00:00Z' }),
      img({ status: 'processed', edgeCount: 2, cloudCount: 3, screeningWouldEscalate: true, capturedAt: '2026-06-20T12:00:00Z' }),
      img({ status: 'uploaded', edgeCount: 0, cloudCount: 0, screeningWouldEscalate: null }),
    ]);
    expect(s.totalImages).toBe(3);
    expect(s.processedImages).toBe(2);
    expect(s.edgeDetections).toBe(2);
    expect(s.cloudDetections).toBe(8);
    expect(s.imagesWithPlastic).toBe(2);        // dos imágenes con >0 detecciones
    expect(s.escalationRate).toBe(50);          // 1 de 2 con flag no-nulo escaló
    expect(s.bySource).toEqual([
      { name: 'Edge', count: 2, color: '#EC4899' },
      { name: 'Cloud', count: 8, color: '#06B6D4' },
    ]);
    expect(s.timeline).toEqual([{ date: '2026-06-20', detections: 10 }]); // 5+3+2 ese día
  });

  it('maneja lista vacía', () => {
    const s = aggregateDashboardStats([]);
    expect(s.totalImages).toBe(0);
    expect(s.escalationRate).toBe(0);
    expect(s.timeline).toEqual([]);
  });
});

describe('pointCountForSource', () => {
  const p = { id: '1', lat: 0, lng: 0, fileName: 'a', edgeCount: 2, cloudCount: 5, thumbnailPath: null };
  it('devuelve el conteo según el filtro', () => {
    expect(pointCountForSource(p, 'edge')).toBe(2);
    expect(pointCountForSource(p, 'cloud')).toBe(5);
    expect(pointCountForSource(p, 'both')).toBe(7);
  });
});
```

- [ ] **Step 2:** Run `npm test` → FALLA (módulo no existe).

- [ ] **Step 3: Implementar** — Create `src/services/analyticsService.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

export type SourceFilter = 'both' | 'edge' | 'cloud';

export const SOURCE_COLORS = { edge: '#EC4899', cloud: '#06B6D4', both: '#3B82F6' } as const;

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  fileName: string;
  edgeCount: number;
  cloudCount: number;
  capturedAt?: string;
  thumbnailPath: string | null;
}

export interface ImageAgg {
  status: string;
  capturedAt?: string;
  uploadedAt: string;
  edgeCount: number;
  cloudCount: number;
  screeningWouldEscalate: boolean | null;
}

export interface DashboardStats {
  totalImages: number;
  processedImages: number;
  edgeDetections: number;
  cloudDetections: number;
  imagesWithPlastic: number;
  escalationRate: number;
  bySource: { name: string; count: number; color: string }[];
  timeline: { date: string; detections: number }[];
}

export function pointCountForSource(p: { edgeCount: number; cloudCount: number }, source: SourceFilter): number {
  if (source === 'edge') return p.edgeCount;
  if (source === 'cloud') return p.cloudCount;
  return p.edgeCount + p.cloudCount;
}

export function aggregateDashboardStats(images: ImageAgg[]): DashboardStats {
  const totalImages = images.length;
  const processedImages = images.filter((i) => i.status === 'processed').length;
  const edgeDetections = images.reduce((a, i) => a + i.edgeCount, 0);
  const cloudDetections = images.reduce((a, i) => a + i.cloudCount, 0);
  const imagesWithPlastic = images.filter((i) => i.edgeCount + i.cloudCount > 0).length;
  const withFlag = images.filter((i) => i.screeningWouldEscalate != null);
  const escalated = withFlag.filter((i) => i.screeningWouldEscalate === true).length;
  const escalationRate = withFlag.length ? Math.round((escalated / withFlag.length) * 100) : 0;

  const byDay = new Map<string, number>();
  for (const i of images) {
    const iso = i.capturedAt ?? i.uploadedAt;
    const date = iso.slice(0, 10);
    const n = i.edgeCount + i.cloudCount;
    if (n > 0) byDay.set(date, (byDay.get(date) ?? 0) + n);
  }
  const timeline = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, detections]) => ({ date, detections }));

  return {
    totalImages, processedImages, edgeDetections, cloudDetections, imagesWithPlastic, escalationRate,
    bySource: [
      { name: 'Edge', count: edgeDetections, color: SOURCE_COLORS.edge },
      { name: 'Cloud', count: cloudDetections, color: SOURCE_COLORS.cloud },
    ],
    timeline,
  };
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from('images')
    .select('status, captured_at, uploaded_at, edge_count, cloud_count, screening_would_escalate');
  if (error) throw new Error(`loadDashboardStats: ${error.message}`);
  const images: ImageAgg[] = (data ?? []).map((i: any) => ({
    status: i.status,
    capturedAt: i.captured_at ?? undefined,
    uploadedAt: i.uploaded_at,
    edgeCount: i.edge_count ?? 0,
    cloudCount: i.cloud_count ?? 0,
    screeningWouldEscalate: i.screening_would_escalate,
  }));
  return aggregateDashboardStats(images);
}

export async function loadMapPoints(): Promise<MapPoint[]> {
  const { data, error } = await supabase
    .from('images')
    .select('id, file_name, gps_latitude, gps_longitude, captured_at, thumbnail_path, edge_count, cloud_count')
    .not('gps_latitude', 'is', null)
    .not('gps_longitude', 'is', null);
  if (error) throw new Error(`loadMapPoints: ${error.message}`);
  return (data ?? []).map((i: any) => ({
    id: i.id,
    lat: Number(i.gps_latitude),
    lng: Number(i.gps_longitude),
    fileName: i.file_name,
    edgeCount: i.edge_count ?? 0,
    cloudCount: i.cloud_count ?? 0,
    capturedAt: i.captured_at ?? undefined,
    thumbnailPath: i.thumbnail_path ?? null,
  }));
}
```

- [ ] **Step 4:** Run `npm test` → todos verdes. Commit:
```bash
git add src/services/analyticsService.ts src/services/__tests__/analyticsService.test.ts
git -c commit.gpgsign=false commit -m "feat(F5): capa de analitica (mapa + dashboard) con agregacion pura testeada"
```

---

### Task 2: `PlasticDetectionMap` por nivel (color/heatmap/peso) y arreglo del render

**Files:** Modify `src/components/PlasticDetectionMap.tsx`.

**Interfaces (consume/produce):** `MapDetection` se amplía con `count?: number` y `source?: 'edge' | 'cloud' | 'both'`.

- [ ] **Step 1:** Amplía la interfaz `MapDetection` con:
```ts
  count?: number;
  source?: 'edge' | 'cloud' | 'both';
```
- [ ] **Step 2:** Elimina el array `mockDetections` (líneas ~43–369) y su uso como default. `MapComponent` pasa a requerir `detections` (sin default mock); si llega vacío, el mapa simplemente no pinta marcadores.
- [ ] **Step 3:** Color del marcador por `source` (en vez de `verified`): define `const SRC = { edge: '#EC4899', cloud: '#06B6D4', both: '#3B82F6' }` y usa `fillColor: SRC[detection.source ?? 'both']`. Escala el marcador por `count`: `scale: Math.min(20, 6 + (detection.count ?? 1))`.
- [ ] **Step 4:** Heatmap: `weight: detection.count ?? 1` (en vez de `confidence`).
- [ ] **Step 5:** Sustituye el toggle "solo verificadas" por nada (quítalo) y el bloque "Detection Summary" (verificadas/pendientes) por un total: `{filteredDetections.length} imágenes con detecciones`. Quita `showVerifiedOnly`/`filteredDetections` basados en verified: usa directamente `detections`.
- [ ] **Step 6:** Arregla el doble render del `Wrapper`: cambia `render` para que SOLO maneje LOADING/FAILURE; en SUCCESS deja que se rendericen los children. Es decir, el `case Status.SUCCESS` del `render` debe devolver `<></>` (o quita SUCCESS del switch y añade `return <MapLoadingComponent/>` por defecto), porque `MapComponent` ya se pasa como children con sus props reales.
- [ ] **Step 7:** `tsc` limpio. Commit:
```bash
git add src/components/PlasticDetectionMap.tsx
git -c commit.gpgsign=false commit -m "feat(F5): mapa por nivel (color/peso por source) y fix del render del Wrapper"
```

---

### Task 3: `MapView` con datos reales + filtro por nivel

**Files:** Modify `src/pages/app/MapView.tsx`.

- [ ] **Step 1:** Elimina `mockDetectionsWithStatus` (líneas 17–313) y los imports de assets mock.
- [ ] **Step 2:** Carga real con estado:
```tsx
const [points, setPoints] = useState<MapPoint[]>([]);
const [source, setSource] = useState<SourceFilter>('both');
useEffect(() => { loadMapPoints().then(setPoints).catch((e) => toast({ title: 'Error cargando mapa', description: String(e), variant: 'destructive' })); }, []);
```
(imports: `loadMapPoints, pointCountForSource, type MapPoint, type SourceFilter` de `@/services/analyticsService`).
- [ ] **Step 3:** Deriva las `MapDetection[]` para el filtro activo:
```tsx
const detections: MapDetection[] = points
  .map((p) => ({ ...p, count: pointCountForSource(p, source) }))
  .filter((p) => p.count > 0)
  .map((p) => ({
    id: p.id, lat: p.lat, lng: p.lng, confidence: 1, imageUrl: '/placeholder.svg',
    detectedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
    description: `${p.fileName} — ${p.count} detección(es) ${source}`,
    count: p.count, source,
  }));
```
- [ ] **Step 4:** Sustituye las 3 tarjetas (verificadas/pendientes/tasa) por: **Imágenes con plástico** (`detections.length`), **Detecciones edge** (`points.reduce((a,p)=>a+p.edgeCount,0)`), **Detecciones cloud** (`...cloudCount`). Añade un control de filtro **Edge / Cloud / Ambos** (3 botones, como en F4) que set `source`.
- [ ] **Step 5:** `<PlasticDetectionMap detections={detections} onDetectionClick={...} />` (el handler puede hacer un toast con `detection.description`).
- [ ] **Step 6:** `tsc` limpio. Commit:
```bash
git add src/pages/app/MapView.tsx
git -c commit.gpgsign=false commit -m "feat(F5): MapView con datos reales y filtro por nivel edge/cloud"
```

---

### Task 4: `Dashboard` con estadísticas reales

**Files:** Modify `src/pages/app/Dashboard.tsx`.

- [ ] **Step 1:** Carga real:
```tsx
const [stats, setStats] = useState<DashboardStats | null>(null);
useEffect(() => { loadDashboardStats().then(setStats).catch(() => {}); }, []);
```
(import `loadDashboardStats, type DashboardStats, SOURCE_COLORS` de `@/services/analyticsService`).
- [ ] **Step 2:** KPIs reales (sustituye los 4 valores hardcodeados): **Total imágenes** = `stats?.totalImages`, **Detecciones** = `(stats?.edgeDetections ?? 0) + (stats?.cloudDetections ?? 0)`, **Imágenes con plástico** = `stats?.imagesWithPlastic`, **Tasa de escalado (criba)** = `stats?.escalationRate`%. Quita los "+12% lastMonth" inventados.
- [ ] **Step 3:** Gráfico "Detecciones por nivel" (sustituye "por clase"): `BarChart` con `data={stats?.bySource ?? []}`, `XAxis dataKey="name"`, `Bar dataKey="count"`. Colorea cada barra con su `color` (usa `<Cell>` por entrada).
- [ ] **Step 4:** Timeline real: `LineChart` con `data={stats?.timeline ?? []}` (`XAxis dataKey="date"`, `Line dataKey="detections"`).
- [ ] **Step 5:** Sustituye el Pie "review status" por un Pie de **Edge vs Cloud** usando `stats?.bySource` (dataKey `count`, `name`), con sus colores.
- [ ] **Step 6:** `tsc` limpio + `npm run build`. Commit:
```bash
git add src/pages/app/Dashboard.tsx
git -c commit.gpgsign=false commit -m "feat(F5): Dashboard con estadisticas reales (edge/cloud, criba, timeline)"
```

---

## Self-Review (F5)
- Cobertura (diseño maestro §7 F5): mapa y dashboard leen detecciones reales filtrables por `source` ✓ (Tasks 2–4); capa de datos con agregación pura testeada ✓ (Task 1). ✓
- Sin placeholders; cada paso con código/verificación. ✓
- Consistencia: `SourceFilter`, `MapPoint`, `DashboardStats`, `aggregateDashboardStats`, `pointCountForSource`, `loadMapPoints`, `loadDashboardStats` definidos en Task 1 y consumidos en 2–4; colores edge/cloud consistentes con F4. ✓
- Dependencias externas (GPS en EXIF, `GOOGLE_MAPS_API_KEY`) degradan a vacío/aviso sin romper. ✓
- Límite de fase: la cola de jobs real (Jobs/Review) es F6. ✓
