# infer-cloud — proxy a Roboflow Hosted Inference

Recibe `{ image: <base64> }` por POST y devuelve detecciones normalizadas (fracciones 0–1,
esquina superior-izquierda, `source='cloud'`, `model='rfdetr-medium-v6'`) del modelo
`coastal-plastic-5m/6` (RF-DETR-medium).

## Secrets / config
- `ROBOFLOW_API_KEY` (requerido) — API key privada de Roboflow (workspace ecos-u7zcx). NO se versiona.
- `ROBOFLOW_INFERENCE_HOST` (opcional) — host del servidor de inferencia. Por defecto
  `https://serverless.roboflow.com` (Hosted, consume créditos). Apúntalo a un self-host
  (p.ej. un Space de Hugging Face con `roboflow-inference-server`) para inferencia **sin créditos**:
  `ROBOFLOW_INFERENCE_HOST=https://<tu-usuario>-<tu-space>.hf.space`. La ruta y el formato son
  idénticos, así que solo cambia esta variable. Ver `deploy/hf-space-inference/`.

**Fallback:** si `ROBOFLOW_INFERENCE_HOST` apunta a un self-host y este falla (error de red, timeout de 25 s, 5xx o 429), la función reintenta una vez contra `serverless.roboflow.com`. Un 4xx no se reintenta. El workflow `.github/workflows/keep-hf-space-alive.yml` hace ping al Space cada 6 h para que no se pause.

> Nota: la inferencia *serverless* consume créditos (puede dar `402 credit_cap_exceeded`).
> La inferencia *self-hosted* del propio modelo NO consume créditos serverless (verificado 2026-06-21).

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
