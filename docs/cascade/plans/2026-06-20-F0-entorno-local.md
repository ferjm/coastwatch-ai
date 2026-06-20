# F0 — Entorno local — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la app CoastWatch corriendo en **local** contra el backend de Lovable Cloud (Supabase), verificada de punta a punta, y documentar el flujo de trabajo local ↔ GitHub ↔ Lovable. **Sin cambios de feature.**

**Architecture:** No se modifica código de la app. Se verifica que `npm install && npm run dev` levanta el SPA de Vite (puerto 8080), que la autenticación y el backend de Lovable Cloud responden, y que la inferencia *edge* (Edge Impulse FOMO en WASM) sigue funcionando como hasta ahora. Se añade un documento de workflow.

**Tech Stack:** Vite + React 18 + TypeScript, Supabase JS, Edge Impulse WASM. Node 22, npm 10.

## Global Constraints

- El agente **no** ejecuta operaciones remotas: nada de `git push`, PRs ni `gh`. Solo trabajo local; la sincronización con GitHub/Lovable la lanza Fernando.
- Gestor de paquetes: **npm** (no hay bun instalado). README oficial: `npm i` + `npm run dev`.
- Puerto del dev server: **8080** (`vite.config.ts`).
- No editar en paralelo en el editor web de Lovable: a partir de ahora **local/GitHub es la fuente de verdad**.
- Mantener la integración de Lovable (`@lovable.dev/cloud-auth-js`, `lovable-tagger`): son compatibles con dev local y deploy en Lovable.

---

### Task 1: Verificar arranque local end-to-end y documentar el workflow

**Files:**
- Verify: `.env` (claves `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)
- Verify: `package.json` (script `dev`), `vite.config.ts:8-11` (puerto 8080)
- Create: `docs/cascade/DEV.md` (guía de desarrollo local)

**Interfaces:**
- Consumes: nada (fase inicial).
- Produces: entorno local funcionando + `docs/cascade/DEV.md` que las fases siguientes asumen como "cómo arrancar y probar".

- [ ] **Step 1: Confirmar que el `.env` tiene las tres variables con valor**

Run: `grep -c '=' .env && grep -oE '^VITE_[A-Z_]+' .env`
Expected: imprime `3` y las tres claves `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`. Si alguna falta, copiarla desde el panel de Lovable Cloud (Settings → API) antes de seguir.

- [ ] **Step 2: Instalar dependencias**

Run: `npm install`
Expected: termina sin errores (`added N packages`). Genera/usa `package-lock.json`. Ignorar warnings de peer-deps.

- [ ] **Step 3: Arrancar el dev server**

Run: `npm run dev`
Expected: Vite imprime `Local: http://localhost:8080/`. El servidor queda escuchando. (En otra terminal o tras parar con Ctrl-C se continúa.)

- [ ] **Step 4: Verificar carga de la SPA y de la auth**

Abrir `http://localhost:8080/` en el navegador. Expected: carga la pantalla de login/landing sin errores rojos en consola. Iniciar sesión con un usuario válido de Lovable Cloud. Expected: entra al área `/app` (dashboard/sidebar visibles). Esto confirma que el Supabase de Lovable Cloud responde desde local.

> Nota: en dev, MSW arranca e intercepta `/api/*` (mock) porque no hay `VITE_API_URL`. El camino real de subida/inferencia NO pasa por `/api/*`, así que no le afecta.

- [ ] **Step 5: Verificar inferencia edge (WASM) end-to-end**

En la app, ir a Uploads y subir una imagen de prueba (idealmente una con plástico). Expected en consola del navegador: logs de `Loading Edge Impulse scripts...` → `Edge Impulse scripts loaded successfully` → `Found N detections`. Expected en UI: la imagen pasa a estado `processed` y se guardan detecciones. Esto confirma que `public/edge-impulse-standalone.wasm` (47 MB) se sirve y el clasificador corre.

- [ ] **Step 6: Escribir la guía de desarrollo local**

Crear `docs/cascade/DEV.md` con este contenido:

```markdown
# Desarrollo local de CoastWatch AI

## Requisitos
- Node 22+, npm 10+ (sin bun).
- Fichero `.env` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
  (desde Lovable Cloud → Settings → API).

## Arrancar
```sh
npm install
npm run dev   # http://localhost:8080
```

## Flujo de sincronización (fuente de verdad = local/GitHub)
1. Se desarrolla y prueba en local.
2. Fernando hace commit y push a GitHub cuando quiere publicar.
3. Lovable recoge los cambios de GitHub y republica.
4. NO editar en paralelo en el editor web de Lovable (evita conflictos de merge).

## Backend
- El backend (Postgres, Auth, Storage, Edge Functions) es Supabase gestionado por Lovable Cloud.
- Las migraciones SQL viven en `supabase/migrations/` y se aplican vía el SQL editor de Lovable Cloud
  (no hay Supabase CLI local configurado).

## Inferencia
- Nivel 1 (edge): Edge Impulse FOMO en WASM, en el navegador (`public/edge-impulse-standalone.*`).
- Nivel 2 (cloud): se añade en fases posteriores (Edge Function `infer-cloud` → Roboflow).
```

- [ ] **Step 7: Commit**

```bash
git add docs/cascade/DEV.md
git commit -m "docs(F0): guía de desarrollo local y verificación de arranque"
```

---

## Self-Review (F0)

- **Cobertura del spec:** F0 cubre el objetivo 1 del diseño maestro (§1) — dev local sin abandonar Lovable. ✓
- **Sin placeholders:** todos los pasos tienen comando y salida esperada. ✓
- **Criterio de aceptación (spec §7):** `npm install && npm run dev` levanta la app, login funciona, WASM carga, una imagen produce detecciones edge. Cubierto por Steps 2–5. ✓
