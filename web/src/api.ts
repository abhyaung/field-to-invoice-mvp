import type { ChatMessage, ChatResponse } from './types'

// The backend contract (see backend/CLAUDE.md). Override via VITE_API_BASE if needed.
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

async function asError(res: Response): Promise<never> {
  let detail = res.statusText
  try {
    const body = await res.json()
    if (body?.detail) detail = body.detail
  } catch {
    // non-JSON error body — keep statusText
  }
  throw new Error(detail)
}

/** Send the full conversation; get back the assistant reply + best-effort invoice. */
export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) await asError(res)
  return res.json()
}

/** Upload a recorded audio clip; get back locally-transcribed text. */
export async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData()
  const ext = audio.type.includes('mp4') ? 'mp4' : 'webm'
  form.append('audio', audio, `clip.${ext}`)

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) await asError(res)
  const data: { text: string } = await res.json()
  return data.text
}
