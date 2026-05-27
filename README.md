# Field-to-Invoice AI Extractor 🛠️⚡

A rapid Minimum Viable Product (MVP) designed to automate the invoicing pipeline for trades professionals (plumbers, HVAC technicians, electricians). 

This microservice takes raw, unstructured natural language dictation and deterministically extracts it into a strictly typed, calculable JSON invoice using local open-weight Large Language Models (LLMs).

## 🚀 Live Demo

**[🎥 Click here to watch the end-to-end extraction pipeline in action](https://github.com/abhyaung/field-to-invoice-mvp/blob/main/video%26photo/recordingOfWorkingProject.mov)**

### Example Output

[![Terminal Extraction Output](https://github.com/abhyaung/field-to-invoice-mvp/raw/main/video%26photo/Snapshot.png)](https://github.com/abhyaung/field-to-invoice-mvp/blob/main/video%26photo/recordingOfWorkingProject.mov)
*(Click the screenshot above to view the live screen recording)*

## 🏗️ Architecture & Tech Stack

This project is built with a strictly decoupled, API-first architecture, allowing the extraction engine to be plugged into any mobile app, SMS bot, or web dashboard.

* **Backend:** Python 3.13, FastAPI, Pydantic, HTTPX
* **AI Inference:** Ollama (Gemma/Qwen), running 100% locally
* **Client Interface:** TypeScript, Node.js (`tsx`)

## ✨ Core Features

* **Zero-Cost, Privacy-First AI:** By utilizing local inference via Ollama, this service requires no external API keys (e.g., OpenAI) and guarantees complete data privacy for sensitive customer addresses and financial data.
* **Deterministic Structured Output:** LLMs hallucinate. This backend uses strict temperature controls (`T=0.1`) and Pydantic schema validation as a gatekeeper to force messy natural language into reliable, downstream-ready JSON arrays.
* **Event-Driven Ready:** Designed as an isolated microservice, making it trivial to pipe the output JSON into a message broker (like Kafka) for asynchronous consumption by billing and inventory systems.

## 💻 Local Spin-Up Guide

To run this MVP locally, you will need three terminal panes.

### 1. Start the Local LLM
Ensure Ollama is installed and running the model in the background.
```bash
ollama run gemma
