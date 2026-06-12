import json

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Field-to-Invoice AI Extractor")

# Allow the Vite dev server (and a couple of common local origins) to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

#-- Data Models --
class JobSummary(BaseModel):
    text: str = Field(
        ...,
        json_schema_extra={
            "example": (
                "Replaced a 3/4-inch copper valve, fixed the thermostat wiring. "
                "Parts cost 45, labor is 120 an hour for 2 hours."
            )
        },
    )

class InvoiceItem(BaseModel):
    description: str
    cost: float

class Invoice(BaseModel):
    parts_used: list[InvoiceItem]
    labor_hours: float
    total_parts_cost: float
    total_labor_cost: float
    grand_total: float

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
    invoice: Invoice | None = None

class TranscriptionResponse(BaseModel):
    text: str

# --- Configuration ---
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gemma"
WHISPER_MODEL = "base"  # faster-whisper model size (tiny/base/small/medium/large-v3)

# --- System Prompts ---
SYSTEM_PROMPT = """
You are an expert extraction AI for trades professionals. Extract the invoice details from the provided job summary.
Calculate the totals if necessary. Return ONLY a valid JSON object matching this exact schema:
{
    "parts_used": [{"description": "string", "cost": number}],
    "labor_hours": number,
    "total_parts_cost": number,
    "total_labor_cost": number,
    "grand_total": number
}
Do not include markdown blocks, explanations, or any text outside the JSON object.
"""

CHAT_SYSTEM_PROMPT = """
You are a friendly invoicing assistant for trades professionals (plumbers, electricians, HVAC techs).
Your job is to help the user build an invoice through conversation.

Gather these details, asking short follow-up questions for anything missing:
- Parts used and the cost of each part.
- Number of labor hours.
- The labor rate (cost per hour).

Guidelines:
- Keep replies brief and conversational (1-3 sentences). Ask for only the most important missing detail at a time.
- When you have parts, labor hours, and a labor rate, confirm the total back to the user in plain language.
- Do NOT output JSON or code blocks. Just talk to the user naturally.
"""

# --- Whisper (lazy-loaded so the import cost is only paid when voice is used) ---
_whisper_model = None


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _whisper_model


async def extract_invoice_from_text(text: str) -> Invoice:
    """Call Ollama to extract a validated Invoice from free-text. Shared by
    /api/extract and the best-effort preview in /api/chat."""
    prompt = f"{SYSTEM_PROMPT}\n\nJob Summary: {text}"

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1},
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_GENERATE_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()

            # Parse the LLM's JSON string response
            llm_output = json.loads(data.get("response", "{}"))

            # Validate through Pydantic
            return Invoice(**llm_output)

        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Ollama connection failed: {str(e)}") from e
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail="LLM failed to return valid JSON.") from e


@app.post("/api/extract", response_model=Invoice)
async def extract_invoice(job: JobSummary):
    try:
        return await extract_invoice_from_text(job.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Multi-turn conversational invoice building.

    Per turn we make two local calls:
      1. A natural-language reply (Ollama /api/chat) that asks for missing info.
      2. A best-effort invoice extraction over the running user transcript, so
         the UI can show a live preview. If there isn't enough info yet the
         invoice comes back as null instead of erroring.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    # 1. Conversational reply.
    ollama_messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
    ollama_messages += [{"role": m.role, "content": m.content} for m in req.messages]

    payload = {
        "model": MODEL_NAME,
        "messages": ollama_messages,
        "stream": False,
        "options": {"temperature": 0.3},
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_CHAT_URL, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            reply = data.get("message", {}).get("content", "").strip()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Ollama connection failed: {str(e)}") from e

    # 2. Best-effort invoice over the whole labeled conversation so far. We keep
    # both roles (and one line per turn) so the extractor sees the Q&A structure
    # — e.g. "assistant: what's your rate? / user: 100/hr" — rather than a mashed
    # run of numbers that merges "60" and "100" into "60100".
    transcript = "\n".join(f"{m.role}: {m.content}" for m in req.messages)
    invoice: Invoice | None = None
    try:
        invoice = await extract_invoice_from_text(transcript)
    except Exception:
        # Not enough info yet (or the model couldn't produce valid JSON) -> no preview.
        invoice = None

    return ChatResponse(reply=reply, invoice=invoice)


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...)):  # noqa: B008  (FastAPI dependency idiom)
    """Transcribe an uploaded audio clip locally with faster-whisper."""
    import tempfile

    suffix = ""
    if audio.filename and "." in audio.filename:
        suffix = "." + audio.filename.rsplit(".", 1)[1]

    raw = await audio.read()
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix or ".webm") as tmp:
            tmp.write(raw)
            tmp.flush()
            model = _get_whisper_model()
            segments, _info = model.transcribe(tmp.name)
            text = " ".join(seg.text for seg in segments).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}") from e

    return TranscriptionResponse(text=text)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
