# Desarrollo local de CoastWatch AI

## Requisitos
- Node 22+, npm 10+ (sin bun).
- Fichero `.env` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
  (desde Lovable Cloud → Settings → API).

## Arrancar

    npm install
    npm run dev   # http://localhost:8080

## Flujo de sincronización (fuente de verdad = local/GitHub)
1. Se desarrolla y prueba en local.
2. Fernando hace commit y push a GitHub cuando quiere publicar (el agente nunca hace push).
3. Lovable recoge los cambios de GitHub y republica.
4. NO editar en paralelo en el editor web de Lovable (evita conflictos de merge).

## Backend
- El backend (Postgres, Auth, Storage, Edge Functions) es Supabase gestionado por Lovable Cloud.
- Las migraciones SQL viven en `supabase/migrations/` y se aplican vía el SQL editor de Lovable Cloud
  (no hay Supabase CLI local configurado).

## Inferencia
- Nivel 1 (edge): Edge Impulse FOMO en WASM, en el navegador (`public/edge-impulse-standalone.*`).
- Nivel 2 (cloud): se añade en fases posteriores (Edge Function `infer-cloud` → Roboflow). Ver
  `docs/cascade/2026-06-20-cascade-inference-design.md`.

## Tests
- Runner: vitest (se añade en F1). Ejecutar con `npm test`.

## Verificación de arranque (F0, 2026-06-20)
- `npm install` → 714 paquetes, sin errores.
- `npm run dev` → Vite v5.4.19, sirve `http://localhost:8080/` (HTTP 200, título "PlasticWatch by ECOS").
- Smoke test de login + subida (inferencia edge) → **a verificar en navegador por Fernando**.
