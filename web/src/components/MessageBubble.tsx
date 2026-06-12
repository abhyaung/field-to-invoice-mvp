import type { ChatMessage } from '../types'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-br-sm bg-violet-600 text-white'
            : 'rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200',
        ].join(' ')}
      >
        {message.content}
      </div>
    </div>
  )
}
