"""Tests for the invoice extraction API.

The Ollama HTTP calls and the Whisper model are stubbed so these run offline
(no model server required).
"""
import json

import httpx
from fastapi.testclient import TestClient

import main

VALID_INVOICE = {
    "parts_used": [{"description": "copper valve", "cost": 45}],
    "labor_hours": 2,
    "total_parts_cost": 45,
    "total_labor_cost": 240,
    "grand_total": 285,
}


def _stub_ollama(monkeypatch, *, response_json: dict):
    """Patch httpx.AsyncClient.post to return a canned Ollama response.

    Branches on the URL so both /api/generate (extraction, returns a JSON
    string under "response") and /api/chat (returns natural text under
    "message.content") are covered.
    """

    class _Resp:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    async def _post(self, url, **kwargs):  # noqa: ANN001
        if url.endswith("/api/chat"):
            return _Resp({"message": {"content": "Got it. What's your hourly labor rate?"}})
        return _Resp({"response": json.dumps(response_json)})

    monkeypatch.setattr(httpx.AsyncClient, "post", _post)


client = TestClient(main.app)


def test_extract_returns_validated_invoice(monkeypatch):
    _stub_ollama(monkeypatch, response_json=VALID_INVOICE)
    resp = client.post("/api/extract", json={"text": "replaced a valve, 45 in parts, 2h labor"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["grand_total"] == 285
    assert body["parts_used"][0]["description"] == "copper valve"


def test_extract_rejects_malformed_llm_output(monkeypatch):
    # Missing required fields -> Pydantic validation should surface a 500.
    _stub_ollama(monkeypatch, response_json={"parts_used": []})
    resp = client.post("/api/extract", json={"text": "nonsense"})
    assert resp.status_code == 500


def test_chat_returns_reply_and_invoice(monkeypatch):
    _stub_ollama(monkeypatch, response_json=VALID_INVOICE)
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "replaced a valve, 45 parts, 2h at 120/hr"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"]
    assert body["invoice"]["grand_total"] == 285


def test_chat_returns_null_invoice_when_extraction_fails(monkeypatch):
    # Malformed extraction output -> reply still comes back, invoice is null.
    _stub_ollama(monkeypatch, response_json={"parts_used": []})
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"]
    assert body["invoice"] is None


def test_chat_rejects_empty_messages():
    resp = client.post("/api/chat", json={"messages": []})
    assert resp.status_code == 400


def test_transcribe_returns_text(monkeypatch):
    class _Segment:
        def __init__(self, text):
            self.text = text

    class _FakeModel:
        def transcribe(self, path):  # noqa: ANN001
            return [_Segment("replaced a copper valve")], {}

    monkeypatch.setattr(main, "_get_whisper_model", lambda: _FakeModel())

    resp = client.post(
        "/api/transcribe",
        files={"audio": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
    )
    assert resp.status_code == 200
    assert resp.json()["text"] == "replaced a copper valve"
