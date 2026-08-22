// Thin fetch wrappers around the estimate API (server/estimateRoutes.js).
// Vite proxies /api to the server in dev (see vite.config.js).
async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export function getEstimate(jobId) {
  return request(`/api/estimate?jobId=${encodeURIComponent(jobId)}`)
}

export function createGroup(jobId, name) {
  return request('/api/estimate/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, name }),
  })
}

export function deleteGroup(id) {
  return request(`/api/estimate/groups/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function createItem(jobId, form) {
  return request('/api/estimate/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, jobId }),
  })
}

export function updateItem(id, form) {
  return request(`/api/estimate/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
}

export function deleteItem(id) {
  return request(`/api/estimate/items/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function duplicateItem(id) {
  return request(`/api/estimate/items/${encodeURIComponent(id)}/duplicate`, { method: 'POST' })
}
