# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MVP that turns a tradesperson's free-text job summary (e.g. "replaced a copper valve, 45 in parts, 2 hours labor at 120/hr") into a structured invoice JSON, using a **local** LLM via Ollama. No cloud is involved — including speech-to-text, which runs locally via Whisper. There are two clients: a web app (primary) and a CLI.

## Architecture

- `backend/main.py` — FastAPI service. Endpoints:
  - `POST /api/extract` — one-shot extraction. Wraps the user text in `SYSTEM_PROMPT` and calls Ollama's `/api/generate` at `http://localhost:11434` with `format: "json"` and low temperature, then validates against the Pydantic `Invoice` schema (`parts_used`, `labor_hours`, totals, `grand_total`). The shared helper `extract_invoice_from_text()` does this work.
  - `POST /api/chat` — multi-turn conversational invoice building. Takes the full `messages` history (state lives client-side). Per turn it makes **two** Ollama calls: a natural-language reply via `/api/chat` (using `CHAT_SYSTEM_PROMPT`, no JSON mode) that asks for missing details, plus a best-effort `extract_invoice_from_text()` over the concatenated user transcript for a live preview (returns `invoice: null` when there isn't enough info yet).
  - `POST /api/transcribe` — local speech-to-text. Accepts a multipart audio upload and transcribes it with **faster-whisper** (`WHISPER_MODEL`, lazy-loaded on first use). Returns `{ "text": ... }`.
  - `CORSMiddleware` allows the Vite dev origin (`:5173`). The model is `gemma` (see `MODEL_NAME`).
- `web/` — React + Vite + TypeScript + Tailwind v4 web app (primary UI). Left = conversation panel with a mic button (record → `/api/transcribe` → text into the input); right = live `InvoicePreview` card fed by each `/api/chat` turn. Key files: `src/api.ts` (typed `chat()`/`transcribe()`), `src/hooks/useRecorder.ts` (MediaRecorder wrapper), `src/components/*`, `src/App.tsx` (holds `messages`/`invoice` state). API base overridable via `VITE_API_BASE`.
- `client/cli.ts` — a Node/TypeScript REPL that POSTs a summary to `POST /api/extract` and pretty-prints the invoice with latency. Still works, uses the original one-shot path.

Data flow (web): `web` → FastAPI (`:8000`) → Ollama (`:11434`) + local Whisper → validated JSON / transcript back up the chain.

## Running

1. **Ollama** with the `gemma` model pulled (`ollama pull gemma`), serving on `:11434`.
2. **Backend**: from `backend/`, `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`, then `uvicorn main:app --reload` (serves `:8000`). First `/api/transcribe` call downloads/loads the Whisper model. Tests: `pytest` (Ollama + Whisper are mocked, runs offline).
3. **Web app**: from `web/`, `npm install` then `npm run dev` → `http://localhost:5173`.
4. **CLI** (optional): from `client/`, `npm install` then `npm start` (runs `tsx cli.ts`).

The hardcoded URLs/ports and the model name are the contract between the pieces — change them in lockstep (`OLLAMA_*`/`MODEL_NAME` in the backend, `VITE_API_BASE` / CORS origins for the web app).
