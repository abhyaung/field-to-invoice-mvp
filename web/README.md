# Field-to-Invoice — Web App

The primary UI for **Field-to-Invoice**: turn a tradesperson's free-text (or spoken) job
summary into a structured invoice using a **local** LLM. Talk or type a description like
_"replaced a copper valve, $45 in parts, 2 hours labor at $120/hr"_ and watch a line-item
invoice build up in real time.

React + Vite + TypeScript + Tailwind v4. Speech-to-text and LLM extraction both run on the
backend against local models (Ollama + Whisper) — no cloud, no API keys.

## What it does

- **Conversational invoice building** — a chat panel on the left. Each turn is sent to the
  backend, which replies in natural language (asking for any missing details) and returns a
  best-effort invoice.
- **Voice input** — a mic button records audio via `MediaRecorder`, uploads it to the
  backend for local Whisper transcription, and drops the transcript into the input.
- **Live invoice preview** — a card on the right (`InvoicePreview`) updates after every turn
  with parts, labor, and totals, mirroring the backend's `Invoice` schema.

## Prerequisites

This app is a frontend only. It needs the **Field-to-Invoice backend** running and reachable
(default `http://localhost:8000`), which in turn needs **Ollama** (with the `gemma` model) and
**faster-whisper**. See the backend setup in the repo root [`CLAUDE.md`](../CLAUDE.md).

You also need **Node.js 18+**.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

The Vite dev origin (`:5173`) is already allow-listed in the backend's CORS config.

### Scripts

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR        |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`|
| `npm run preview` | Serve the production build locally        |
| `npm run lint`    | Run ESLint                                |

## Configuration

The backend base URL is the only configuration. It defaults to `http://localhost:8000` and is
overridable at build/dev time via an environment variable:

```bash
# .env.local
VITE_API_BASE=https://your-backend-host
```

Read in [`src/api.ts`](src/api.ts):

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
```

> **Note on deployments:** the static frontend can be hosted anywhere (e.g. Vercel), but it
> still needs to reach a running backend with local Ollama + Whisper. Set `VITE_API_BASE` to a
> reachable backend URL — `localhost` will only work when the backend runs on the same machine
> as the browser.

## Project structure

```
web/
├── index.html
├── src/
│   ├── api.ts                  # Typed chat() / transcribe() calls to the backend
│   ├── App.tsx                 # Holds messages + invoice state
│   ├── types.ts                # Mirrors the backend Pydantic models
│   ├── hooks/
│   │   └── useRecorder.ts       # MediaRecorder wrapper for mic input
│   └── components/
│       ├── ChatPanel.tsx
│       ├── MessageBubble.tsx
│       ├── MicButton.tsx
│       └── InvoicePreview.tsx   # Live invoice card
└── vite.config.ts
```

## Backend contract

Two endpoints are consumed (see `src/api.ts`):

- `POST /api/chat` — send the full `messages` history; receive `{ reply, invoice }`. State
  lives client-side; the backend is stateless per request.
- `POST /api/transcribe` — multipart audio upload; receive `{ text }` from local Whisper.

The TypeScript interfaces in `src/types.ts` mirror the backend's Pydantic `Invoice` /
`ChatResponse` models — keep them in sync if the schema changes.
