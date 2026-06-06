# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A two-piece MVP that turns a tradesperson's free-text job summary (e.g. "replaced a copper valve, 45 in parts, 2 hours labor at 120/hr") into a structured invoice JSON, using a **local** LLM via Ollama. No cloud LLM is involved.

## Architecture

- `backend/main.py` — FastAPI service exposing `POST /api/extract`. It wraps the user text in a fixed extraction system prompt and calls Ollama's `/api/generate` at `http://localhost:11434` with `format: "json"` and low temperature, then validates the response against the Pydantic `Invoice` schema (`parts_used`, `labor_hours`, totals, `grand_total`). The model is `gemma` (see `MODEL_NAME`).
- `client/cli.ts` — a Node/TypeScript interactive REPL that reads a summary from stdin and POSTs it to the backend at `http://localhost:8000/api/extract`, pretty-printing the returned invoice with latency.

Data flow: `cli.ts` → FastAPI (`:8000`) → Ollama (`:11434`) → validated JSON back up the chain.

## Running

Three things must be up, in order:

1. **Ollama** with the `gemma` model pulled (`ollama pull gemma`), serving on `:11434`.
2. **Backend**: from `backend/`, `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`, then `uvicorn main:app --reload` (serves `:8000`).
3. **Client**: from `client/`, `npm install` then `npm start` (runs `tsx cli.ts`).

The two hardcoded URLs/ports and the model name are the contract between the pieces — change them in lockstep.
