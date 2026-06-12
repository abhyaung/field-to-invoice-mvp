import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { useRecorder } from '../hooks/useRecorder'
import { transcribe } from '../api'
import { MessageBubble } from './MessageBubble'
import { MicButton } from './MicButton'

interface Props {
  messages: ChatMessage[]
  sending: boolean
  error: string | null
  onSend: (text: string) => void
}

export function ChatPanel({ messages, sending, error, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const { state: recorderState, start, stop } = useRecorder()

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const submit = () => {
    const text = draft.trim()
    if (!text || sending) return
    onSend(text)
    setDraft('')
  }

  const toggleMic = async () => {
    setVoiceError(null)
    if (recorderState === 'recording') {
      const blob = await stop()
      if (!blob) return
      setTranscribing(true)
      try {
        const text = await transcribe(blob)
        setDraft((d) => (d ? `${d} ${text}` : text))
      } catch (e) {
        setVoiceError(e instanceof Error ? e.message : 'Transcription failed')
      } finally {
        setTranscribing(false)
      }
    } else {
      await start()
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-slate-50 ring-1 ring-slate-200">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-400">
            Try: “Replaced a copper valve, 45 in parts, 2 hours at 120 an hour.”
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-slate-200">
              <span className="flex gap-1">
                <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
              </span>
            </div>
          </div>
        )}
      </div>

      {(error || voiceError) && (
        <p className="px-4 pb-1 text-xs text-red-500">{error ?? voiceError}</p>
      )}

      <div className="flex items-end gap-2 border-t border-slate-200 p-3">
        <MicButton
          recorderState={recorderState}
          transcribing={transcribing}
          disabled={sending}
          onClick={toggleMic}
        />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder={
            recorderState === 'recording' ? 'Listening… tap the mic to stop' : 'Describe the job…'
          }
          className="max-h-32 flex-1 resize-none rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400"
        />
        <button
          onClick={submit}
          disabled={sending || !draft.trim()}
          className="h-11 shrink-0 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-300"
      style={{ animationDelay: delay }}
    />
  )
}
