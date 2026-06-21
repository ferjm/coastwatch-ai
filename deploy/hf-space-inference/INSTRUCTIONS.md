# Desplegar el inference-server en Hugging Face Spaces

Pasos manuales (los hace Fernando; requieren cuenta de Hugging Face).

## 1. Crear el Space
1. https://huggingface.co/new-space
2. Owner: tu usuario. Space name: p.ej. `coastal-plastic-inference`.
3. **SDK: Docker** (Blank). Hardware: **CPU basic (free)** — 16 GB RAM, suficiente para RF-DETR.
4. Visibilidad: Public (los Spaces privados gratuitos no sirven; un private requiere plan de pago).

## 2. Subir los ficheros del Space
Copia a la raíz del repo del Space **estos dos ficheros** de `deploy/hf-space-inference/`:
- `Dockerfile`
- `README.md`  (su cabecera YAML define `sdk: docker` y `app_port: 9001`)

```sh
# clona el repo del Space y copia los ficheros
git clone https://huggingface.co/spaces/<usuario>/coastal-plastic-inference
cp deploy/hf-space-inference/Dockerfile deploy/hf-space-inference/README.md coastal-plastic-inference/
cd coastal-plastic-inference && git add . && git commit -m "inference server" && git push
```
El Space construirá la imagen y arrancará (tarda unos minutos la primera vez).

## 3. Probar el Space
```sh
export RF_KEY=<tu_key_de_roboflow>
base64 -i imagen_con_plastico.jpg | tr -d '\n' > /tmp/img.b64
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  "https://<usuario>-coastal-plastic-inference.hf.space/coastal-plastic-5m/6?api_key=$RF_KEY&confidence=0.4" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-binary @/tmp/img.b64
```
Esperado: `HTTP 200` + `predictions` (igual que en local). Si da cold start, repite tras unos segundos.

## 4. Apuntar la Edge Function al Space
En Supabase/Lovable Cloud, añade el secret de la función `infer-cloud`:
```
ROBOFLOW_INFERENCE_HOST = https://<usuario>-coastal-plastic-inference.hf.space
```
Re-despliega la función. A partir de ahí, `infer-cloud` usa tu self-host (sin créditos serverless)
en vez de `serverless.roboflow.com`. La `ROBOFLOW_API_KEY` sigue siendo necesaria (se pasa por
petición para que el server cargue/autorice el modelo).

## Notas
- El Space es público: cualquiera podría enviarle imágenes, pero necesitaría su propia API key de
  Roboflow para inferir un modelo (y el coste se imputa a SU workspace, no al tuyo). Riesgo bajo.
- Cold start: para la defensa, pre-calienta el Space con una petición antes de la demo, o combina con
  el cacheo de detecciones en la BD para que la demo no dependa de una llamada en vivo.
