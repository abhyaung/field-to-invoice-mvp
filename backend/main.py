import json

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Field-to-Invoice AI Extractor")

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

# --- Configuration ---
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma"

# --- System Prompt ---
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

@app.post("/api/extract", response_model=Invoice)
async def extract_invoice(job: JobSummary):
    prompt = f"{SYSTEM_PROMPT}\n\nJob Summary: {job.text}"

    payload = {
            "model": MODEL_NAME,
            "prompt":prompt,
            "format":"json",
            "stream": False,
            "options":{
                "temperature": 0.1 
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()

            # Parse the LLM's JSON string response
            llm_output = json.loads(data.get("response", "{}"))

            #Validate through Pydantic
            validated_invoice = Invoice(**llm_output)
            return validated_invoice

        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Ollama connection failed: {str(e)}") from e
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail="LLM failed to return valid JSON.") from e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
