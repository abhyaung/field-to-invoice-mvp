"""Tests for the invoice extraction API.

The Ollama HTTP call is stubbed so these run offline (no model required).
"""
import json

import httpx
from fastapi.testclient import TestClient

import main


def _stub_ollama(monkeypatch, *, response_json: dict):
    """Patch httpx.AsyncClient.post to return a canned Ollama response."""

    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return {"response": json.dumps(response_json)}

    async def _post(self, url, **kwargs):  # noqa: ANN001
        return _Resp()

    monkeypatch.setattr(httpx.AsyncClient, "post", _post)


client = TestClient(main.app)


def test_extract_returns_validated_invoice(monkeypatch):
    _stub_ollama(
        monkeypatch,
        response_json={
            "parts_used": [{"description": "copper valve", "cost": 45}],
            "labor_hours": 2,
            "total_parts_cost": 45,
            "total_labor_cost": 240,
            "grand_total": 285,
        },
    )
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
