import { useState } from 'react'
import type { ChatMessage, Invoice } from './types'
import { chat } from './api'
import { ChatPanel } from './components/ChatPanel'
import { InvoicePreview } from './components/InvoicePreview'

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (text: string) => {
    setError(null)
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setSending(true)
    try {
      const res = await chat(next)
      setMessages([...next, { role: 'assistant', content: res.reply }])
      if (res.invoice) setInvoice(res.invoice)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <span className="text-violet-600">⚡</span> Field-to-Invoice
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Talk or type a job summary — a local AI builds the invoice. Nothing leaves your machine.
          </p>
        </header>

        <main className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-5">
          <section className="min-h-[26rem] md:col-span-3 md:min-h-0">
            <ChatPanel messages={messages} sending={sending} error={error} onSend={handleSend} />
          </section>
          <section className="min-h-[20rem] md:col-span-2 md:min-h-0">
            <InvoicePreview invoice={invoice} />
          </section>
        </main>
      </div>
    </div>
  )
}
