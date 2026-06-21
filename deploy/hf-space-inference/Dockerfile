# Self-host del servidor de inferencia de Roboflow en Hugging Face Spaces (Docker SDK).
# Sirve modelos del workspace vía API key por petición; la inferencia del propio modelo
# NO consume créditos serverless. Verificado en local con coastal-plastic-5m/6 (RF-DETR).
FROM roboflow/roboflow-inference-server-cpu:latest

# El servidor escucha en 9001 por defecto. Lo declaramos explícito y damos un cache
# escribible (en HF Spaces /tmp es escribible; el home puede no serlo).
ENV PORT=9001
ENV MODEL_CACHE_DIR=/tmp/model_cache

EXPOSE 9001

# La imagen base ya tiene el ENTRYPOINT que arranca el servidor en $PORT.
# (No se sobreescribe CMD: `docker run -p 9001:9001 roboflow/roboflow-inference-server-cpu`
#  arranca el server tal cual, como se comprobó en local.)
