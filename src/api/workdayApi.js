// Workday Exceptions + the job's working calendar (server/workdayRoutes.js).
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

/** Exceptions affecting this job — its own plus company-wide ones. */
export function listExceptions(jobId) {
  return request(`/api/workday-exceptions?jobId=${encodeURIComponent(jobId)}`)
}

/**
 * The job's work week plus its exceptions, so the browser can derive dates the
 * same way the server does. Without this the Gantt would shade a hardcoded
 * Mon-Fri while the API cascaded around real holidays.
 */
export function getCalendar(jobId) {
  return request(`/api/workday-exceptions/calendar?jobId=${encodeURIComponent(jobId)}`)
}

export function createException(form) {
  return request('/api/workday-exceptions', json('POST', form))
}

export function updateException(id, form) {
  return request(`/api/workday-exceptions/${encodeURIComponent(id)}`, json('PATCH', form))
}

export function deleteException(id) {
  return request(`/api/workday-exceptions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
