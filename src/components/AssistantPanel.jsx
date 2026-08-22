import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAssistant } from '../hooks/useAssistant'

// A right-docked slide-over, same visual language as Modal.jsx (fixed
// overlay, border-gray-15, rounded-md, bg-white, ✕ close) but anchored to
// the right edge instead of centered, since this stays open alongside the
// page rather than blocking it.
export default function AssistantPanel({ jobId, onClose, onChanged }) {
  const { messages, sending, status, error, send } = useAssistant(jobId)
  const [draft, setDraft] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    send(text).then(() => onChanged?.())
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-15 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-90">✨ AI Assistant</h2>
          <button onClick={onClose} className="text-gray-40 hover:text-gray-70" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="text-sm text-gray-50">
              Ask about this job's schedule or estimate, request a look-ahead, or ask it to add/update items.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  m.role === 'user' ? 'whitespace-pre-wrap bg-brand-blue text-white' : 'bg-gray-5 text-gray-90'
                }`}
              >
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <div className="prose prose-sm max-w-none overflow-x-auto prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-table:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && <div className="text-sm text-gray-50">{status ?? 'Thinking…'}</div>}
          {error && (
            <div className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              Couldn't reach the assistant: {error}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-gray-15 px-5 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the assistant…"
            className="flex-1 rounded-sm border border-gray-20 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-sm bg-brand-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
