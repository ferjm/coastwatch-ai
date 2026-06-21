---
title: Coastal Plastic Inference
emoji: 🌊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 9001
pinned: false
---

# Coastal Plastic Inference Server

Servidor de inferencia auto-hospedado (`roboflow-inference-server-cpu`) para el TFM de detección de
residuos plásticos en costa. Sirve el modelo `coastal-plastic-5m/6` (RF-DETR-medium) del workspace
Roboflow `ecos-u7zcx`.

La inferencia se invoca con la misma ruta que la Hosted API:

```
POST https://<usuario>-<space>.hf.space/coastal-plastic-5m/6?api_key=<KEY>&confidence=0.4
Content-Type: application/x-www-form-urlencoded
body: <imagen en base64>
```

Devuelve `{ image:{width,height}, predictions:[{x,y,width,height,confidence,class,...}] }`
(x,y = centro en px). La Edge Function `infer-cloud` del proyecto apunta aquí mediante la variable
`ROBOFLOW_INFERENCE_HOST` y normaliza la respuesta a fracciones 0–1.

> Nota: en el tier gratuito el Space **duerme tras inactividad** (cold start de ~30-60s, y la primera
> inferencia descarga los pesos del modelo). Para una demo en vivo, pre-caliéntalo con una petición.
