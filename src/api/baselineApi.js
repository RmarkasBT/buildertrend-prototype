// Baseline snapshots and the live comparison against them
// (server/baselineRoutes.js).
async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

/** The active baseline plus a comparison. `baseline` is null if none is set. */
export function getBaseline(jobId) {
  return request(`/api/baselines?jobId=${encodeURIComponent(jobId)}`)
}

/** Every baseline ever set for the job, newest first. */
export function listBaselines(jobId) {
  return request(`/api/baselines/history?jobId=${encodeURIComponent(jobId)}`)
}

/** Freeze the schedule as it stands now. Additive — never overwrites. */
export function setBaseline(jobId, name) {
  return request('/api/baselines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, name }),
  })
}

export function clearBaseline(id) {
  return request(`/api/baselines/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
