# ThimmanaThale

<!-- Quick edit: change sections below as the system grows. Diagrams use Mermaid (GitHub & many editors render them live). -->

## Environment

- Python 3.10+ (project was created with Anaconda)
- Activate: `conda activate ./env`
- Install deps: `pip install -r requirements.txt`
- **Playwright browsers** (once): `playwright install chromium`
- **Qdrant** running (default `http://localhost:6333`)
- **Ollama** optional for `/chat`: `ollama run qwen3:8b`

---

## System design

High-level flow from HTTP to vector storage.

```mermaid
flowchart LR
  subgraph api [Flask app.py]
    R["POST /ingest-webpage"]
  end

  subgraph capture [readWebpage.py]
    P[Playwright Chromium]
    T[Body text]
    S[PNG screenshot]
    P --> T
    P --> S
  end

  subgraph text_path [Text branch]
    TE[Sentence Transformers\nall-MiniLM-L6-v2]
    QT[(Qdrant: text collection)]
    T --> TE --> QT
  end

  subgraph image_path [Image branch]
    OE[OpenCLIP ViT-B-32]
    QI[(Qdrant: image collection)]
    S --> OE --> QI
  end

  R --> capture
  capture --> text_path
  capture --> image_path
```

### Responsibilities

| Piece | Role |
|--------|------|
| `app.py` | HTTP routes: streaming `/chat` (Ollama), `/ingest-webpage` (URL → vectors). |
| `readWebpage.py` | Headless browser: load URL, `body` text, full-page PNG. |
| `embeddings_service.py` | Lazy-loaded **text** encoder and **OpenCLIP** image encoder. |
| `qdrant_webpage.py` | Two Qdrant **targets** (separate URLs optional); creates collections if missing; upserts points with payload (`url`, `text` or `kind`, optional `title`). |
| `qDrant.py` | Standalone sample script (sentence search demo), not used by the ingest route. |
| `langIntegration.py` | Alternate LangGraph + Flask chat experiment. |

### Data split: two Qdrant stores

By default **both** collections live on the same Qdrant server but as **different collections** (two logical databases). Point IDs are UUIDs per ingest.

| Collection env | Default name | Vector dim | Source |
|----------------|--------------|------------|--------|
| `QDRANT_TEXT_COLLECTION` | `webpage_text` | 384 | Sentence Transformers |
| `QDRANT_IMAGE_COLLECTION` | `webpage_image` | 512 | OpenCLIP ViT-B-32 |

Optional: point **text** and **image** collections at different servers:

- `QDRANT_TEXT_URL` (default `http://localhost:6333`)
- `QDRANT_IMAGE_URL` (default `http://localhost:6333`)

---

## API examples

**Ingest a webpage**

```bash
curl -s -X POST http://127.0.0.1:5000/ingest-webpage \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Chat (streaming)** — Postman may not show SSE well; use `curl -N`:

```bash
curl -N -X POST http://127.0.0.1:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"hello"}'
```

---

## Editing this document

- Keep **System design** in sync when you add routes, models, or Qdrant layouts.
- Adjust the Mermaid block when components move; it is plain text in the repo.
- Tables and env vars are the “contract” for operators—update when defaults change.
