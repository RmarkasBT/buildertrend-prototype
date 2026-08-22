// Thin fetch wrappers around the daily logs API (server/dailyLogRoutes.js,
// mounted in server/index.js). Vite proxies /api to the server in dev.
async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// `filters` mirrors the live filter drawer: sharedWith, keywords, createdBy,
// dateRange and tags. Empty/`all` values are dropped so they don't show up
// as no-op query params.
export function listLogs(jobId, filters = {}) {
  const params = new URLSearchParams({ jobId })
  for (const key of ['sharedWith', 'keywords', 'createdBy', 'dateRange', 'startDate', 'endDate', 'status']) {
    const value = filters[key]
    if (value && value !== 'all') params.set(key, value)
  }
  for (const tag of filters.tags ?? []) params.append('tag', tag)
  return request(`/api/daily-logs?${params}`)
}

export const getLog = (id) => request(`/api/daily-logs/${encodeURIComponent(id)}`)
export const createLog = (jobId, form) => request('/api/daily-logs', json('POST', { ...form, jobId }))
export const updateLog = (id, form) => request(`/api/daily-logs/${encodeURIComponent(id)}`, json('PUT', form))
export const deleteLog = (id) => request(`/api/daily-logs/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const toggleLike = (id) => request(`/api/daily-logs/${encodeURIComponent(id)}/like`, { method: 'POST' })
export const addComment = (id, body) => request(`/api/daily-logs/${encodeURIComponent(id)}/comments`, json('POST', { body }))
export const deleteComment = (commentId) => request(`/api/daily-logs/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
export const listTags = (jobId) => request(`/api/daily-logs/tags?jobId=${encodeURIComponent(jobId)}`)
export const getWeather = (jobId, date) =>
  request(`/api/daily-logs/weather?jobId=${encodeURIComponent(jobId)}&date=${encodeURIComponent(date)}`)
export const getSettings = () => request('/api/daily-log-settings')
export const updateSettings = (body) => request('/api/daily-log-settings', json('PUT', body))
