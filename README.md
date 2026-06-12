# Field-to-Invoice AI Extractor 🛠️⚡

A Minimum Viable Product (MVP) that automates the invoicing pipeline for trades
professionals (plumbers, HVAC technicians, electricians).

Speak or type a raw, unstructured job summary — _"replaced a copper valve, $45 in parts,
2 hours labor at $120/hr"_ — and the service deterministically extracts it into a strictly
typed, calculable JSON invoice using local open-weight Large Language Models (LLMs). No
cloud, no API keys: even speech-to-text runs locally.

## 🚀 Live Demo

**[🎥 Click here to watch the end-to-end extraction pipeline in action](https://github.com/abhyaung/field-to-invoice-mvp/blob/main/video%26photo/recordingOfWorkingProject.mov)**

### Example Output

[![Terminal Extraction Output](https://github.com/abhyaung/field-to-invoice-mvp/raw/main/video%26photo/Snapshot.png)](https://github.com/abhyaung/field-to-invoice-mvp/blob/main/video%26photo/recordingOfWorkingProject.mov)
*(Click the screenshot above to view the live screen recording)*

## 🏗️ Architecture & Tech Stack

A strictly decoupled, API-first architecture: a stateless FastAPI extraction engine fronted
by two interchangeable clients (a web app and a CLI).

| Layer            | Tech                                                            |
| ---------------- | -------------------------------------------------------------- |
| **Backend**      | Python 3.13, FastAPI, Pydantic, HTTPX                          |
| **AI Inference** | Ollama (`gemma`), running 100% locally                         |
| **Speech-to-Text** | faster-whisper, running 100% locally                         |
| **Web App** (primary) | React 19, Vite, TypeScript, Tailwind v4                   |
| **CLI** (optional) | TypeScript, Node.js (`tsx`)                                  |

```
Web / CLI  ──▶  FastAPI (:8000)  ──▶  Ollama (:11434)   ← invoice extraction
                       └──────────▶  Whisper (local)    ← voice transcription
```

## ✨ Core Features

* **Zero-Cost, Privacy-First AI:** Local inference via Ollama means no external API keys
  (e.g. OpenAI) and complete data privacy for sensitive customer addresses and financial data.
  Speech never leaves the machine either — transcription runs locally via Whisper.
* **Deterministic Structured Output:** LLMs hallucinate. The backend uses strict temperature
  controls (`T=0.1`), JSON mode, and Pydantic schema validation as a gatekeeper to force messy
  natural language into reliable, downstream-ready JSON.
* **Conversational Invoice Building:** A multi-turn chat endpoint replies in natural language,
  asking for missing details, while live-previewing the invoice as it takes shape.
* **Voice Input:** Dictate the job from the field — the web app records audio and transcribes
  it locally before extraction.
* **Event-Driven Ready:** An isolated microservice, trivial to pipe the output JSON into a
  message broker (like Kafka) for asynchronous consumption by billing and inventory systems.

## 📡 API

| Endpoint             | Purpose                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `POST /api/extract`  | One-shot: free text → validated `Invoice` JSON.                     |
| `POST /api/chat`     | Multi-turn: full `messages` history → `{ reply, invoice }`. Stateless. |
| `POST /api/transcribe` | Multipart audio upload → `{ text }` via local Whisper.            |

## 💻 Local Spin-Up Guide

You'll need a few terminal panes.

### 1. Start the Local LLM
Ensure [Ollama](https://ollama.com) is installed, then pull and serve the model (`:11434`):
```bash
ollama pull gemma
ollama run gemma
```

### 2. Start the Backend
From `backend/` (serves `:8000`):
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
The first `/api/transcribe` call downloads and loads the Whisper model. Run the offline tests
(Ollama and Whisper are mocked) with `pytest`.

### 3. Start the Web App
From `web/` (serves `:5173`):
```bash
npm install
npm run dev
```
Open <http://localhost:5173>. See [`web/README.md`](web/README.md) for details and the
`VITE_API_BASE` override.

### 4. (Optional) Use the CLI
From `client/`:
```bash
npm install
npm start
```

## 🗂️ Project Structure

```
field-to-invoice-mvp/
├── backend/        FastAPI service (extract / chat / transcribe)
├── web/            React + Vite web app (primary UI, with voice + live preview)
├── client/         TypeScript CLI (one-shot extraction)
└── video&photo/    Demo recording and screenshot
```

> The hardcoded URLs/ports and the model name are the contract between the pieces — change
> them in lockstep (`OLLAMA_*` / `MODEL_NAME` in the backend, `VITE_API_BASE` / CORS origins
> for the web app).
