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
