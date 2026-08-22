import { useCallback, useEffect, useRef, useState } from 'react'
import * as assistantApi from '../api/assistantApi'

// Per-job browser-only cache (no server DB yet) so closing the panel, or
// the whole browser, doesn't lose the conversation. Reusing the same
// session_id also means the ADK agent's own InMemorySessionService still
// remembers the exchange, not just the UI - as long as the Python agent
// process itself hasn't restarted; if it has, run_async's
// auto_create_session just starts that session_id fresh server-side, so
// the visible history and the model's actual memory can drift apart. A
// real fix needs server-side storage - out of scope until there's a DB.
function storageKey(jobId) {
  return `bt-assistant:${jobId}`
}

function loadCached(jobId) {
  try {
    const raw = localStorage.getItem(storageKey(jobId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Plain, construction-facing wording for what's running right now - not
// tool names or arguments. Split as {verb, article, thing} rather than a
// flat string so joinLabels can merge "Reviewing your schedule" +
// "Reviewing your estimate" into "Reviewing your schedule and estimate"
// instead of repeating the verb per tool.
const TOOL_LABELS = {
  get_estimate: { verb: 'Reviewing', article: 'your', thing: 'estimate' },
  list_schedule_items: { verb: 'Reviewing', article: 'your', thing: 'schedule' },
  get_schedule_look_ahead: { verb: 'Checking', article: '', thing: 'upcoming work' },
  create_schedule_item: { verb: 'Adding to', article: 'your', thing: 'schedule' },
  update_schedule_item: { verb: 'Updating', article: 'your', thing: 'schedule' },
  delete_schedule_item: { verb: 'Removing', article: 'a', thing: 'schedule item' },
  create_estimate_group: { verb: 'Updating', article: 'your', thing: 'estimate' },
  create_estimate_item: { verb: 'Adding to', article: 'your', thing: 'estimate' },
  update_estimate_item: { verb: 'Updating', article: 'your', thing: 'estimate' },
  delete_estimate_item: { verb: 'Removing', article: 'an', thing: 'estimate item' },
  delete_estimate_group: { verb: 'Removing', article: 'an', thing: 'estimate group' },
  duplicate_estimate_item: { verb: 'Duplicating', article: 'a', thing: 'line item' },
}
const FALLBACK_LABEL = { verb: 'Working on', article: '', thing: 'it' }

function labelFor(name) {
  return TOOL_LABELS[name] || FALLBACK_LABEL
}

// Groups labels that share a verb + article so they read as one phrase
// ("Reviewing your schedule and estimate") instead of stitching full
// per-tool phrases together ("Reviewing your schedule and Reviewing your
// estimate").
function joinLabels(labels) {
  const groups = []
  for (const { verb, article, thing } of labels) {
    let group = groups.find((g) => g.verb === verb && g.article === article)
    if (!group) {
      group = { verb, article, things: [] }
      groups.push(group)
    }
    if (!group.things.includes(thing)) group.things.push(thing)
  }
  return groups.map((g) => [g.verb, g.article, g.things.join(' and ')].filter(Boolean).join(' ')).join(' and ')
}

export function useAssistant(jobId) {
  const [sessionId] = useState(() => loadCached(jobId)?.sessionId ?? crypto.randomUUID())
  const [messages, setMessages] = useState(() => loadCached(jobId)?.messages ?? [])
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const runningRef = useRef(new Map())
  const doneRef = useRef([])

  useEffect(() => {
    localStorage.setItem(storageKey(jobId), JSON.stringify({ sessionId, messages }))
  }, [jobId, sessionId, messages])

  const send = useCallback(
    (text) => {
      setMessages((m) => [...m, { role: 'user', content: text }])
      setSending(true)
      setStatus(null)
      setError(null)
      runningRef.current.clear()
      doneRef.current = []

      // Tool calls resolve almost instantly (local HTTP to the Node API) -
      // the model then spends several more seconds writing the answer
      // *after* they finish. Clearing the status back to a bare "Thinking…"
      // the moment tools complete (as an earlier version of this did)
      // blanks out the message for nearly the whole wait, right when it's
      // most useful - so a finished tool becomes "reviewed/updated…,
      // writing your answer…" instead of disappearing.
      const describe = () => {
        const running = [...runningRef.current.values()]
        if (running.length) return joinLabels(running)
        const done = doneRef.current
        return done.length ? `${joinLabels(done)} — writing your answer…` : null
      }

      return assistantApi
        .streamChat(jobId, sessionId, text, (evt) => {
          if (evt.type === 'tool_call') {
            runningRef.current.set(evt.id, labelFor(evt.name))
            setStatus(describe())
          } else if (evt.type === 'tool_result') {
            const label = runningRef.current.get(evt.id)
            runningRef.current.delete(evt.id)
            if (label) doneRef.current.push(label)
            setStatus(describe())
          } else if (evt.type === 'final') {
            setMessages((m) => [...m, { role: 'assistant', content: evt.text }])
          } else if (evt.type === 'error') {
            setError(evt.message)
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => {
          setSending(false)
          setStatus(null)
        })
    },
    [jobId, sessionId],
  )

  return { messages, sending, status, error, send }
}
