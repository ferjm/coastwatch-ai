# Arquitectura de PlasticWatch (diagramas)

Fuente de verdad de los diagramas de arquitectura. Las versiones TikZ equivalentes están en
`anexoB_plasticwatch.tex` del TFM (Mermaid no compila en LaTeX sin pre-render). Estos se ven al
instante en GitHub / VS Code / mermaid.live.

## 1. Arquitectura de dos niveles

```mermaid
flowchart LR
  subgraph Browser["Navegador (React/Vite · Lovable)"]
    UP[Subida / Visor / Mapa]
    EDGE["Nivel 1 — edge<br/>FOMO (Edge Impulse) en WASM<br/>umbral de criba bajo"]
    ORCH[cascadeService]
  end
  FN["Edge Function infer-cloud<br/>(Supabase) — custodia API key"]
  HF["Nivel 2 — cloud<br/>RF-DETR<br/>Space de Hugging Face"]
  DB[("Supabase<br/>PostgreSQL + Storage")]
  UP --> ORCH
  ORCH --> EDGE
  ORCH -->|POST imagen| FN
  FN -->|api_key| HF
  HF -->|cajas| FN
  EDGE --> DB
  ORCH --> DB
```

## 2. Flujo de inferencia en cascada (emulador comparativo)

Ambos niveles corren por imagen; la decisión de criba se registra, no corta el flujo.

```mermaid
flowchart LR
  IMG[Imagen del dron] --> N1["Nivel 1: FOMO (WASM)<br/>umbral bajo → alto recall"]
  IMG --> N2["Nivel 2: RF-DETR (nube)<br/>alta precisión"]
  N1 --> M["Resultado unificado<br/>source=edge/cloud<br/>+ screening_would_escalate (H8)"]
  N2 --> M
```

## 3. Cola de inferencia con el navegador como worker (F6)

```mermaid
sequenceDiagram
  participant U as Usuario
  participant UP as Subida
  participant DB as Supabase
  participant W as Worker (navegador)
  U->>UP: sube imagen
  UP->>DB: guarda imagen, status=queued
  W->>DB: reclama (status: queued→processing)
  W->>DB: descarga imagen del Storage
  W->>W: runCascade (edge WASM + cloud)
  W->>DB: guarda detecciones + meta, status=processed
```
