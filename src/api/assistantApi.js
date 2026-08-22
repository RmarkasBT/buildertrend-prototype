// Thin wrapper around the AI assistant (agent/server.py, a separate
// Python/ADK process). Vite proxies /agent to it in dev (see vite.config.js).
// /chat streams Server-Sent Events (tool_call/tool_result/final/error), so
// this can't use a plain fetch().json() round trip - it reads the response
// body as it arrives and calls onEvent for each parsed frame.
export async function streamChat(jobId, sessionId, message, onEvent) {
  const res = await fetch('/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, session_id: sessionId, message }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.detail || `Request failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      if (frame.startsWith('data: ')) {
        onEvent(JSON.parse(frame.slice(6)))
      }
    }
  }
}
