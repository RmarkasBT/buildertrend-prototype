// Thin fetch wrappers around the schedule API (server/index.js). Vite
// proxies /api to the server in dev (see vite.config.js).
async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export function listItems(jobId) {
  return request(`/api/schedule?jobId=${encodeURIComponent(jobId)}`)
}

export function createItem(jobId, form) {
  return request('/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, jobId }),
  })
}

export function updateItem(id, form) {
  return request(`/api/schedule/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
}

export function deleteItem(id) {
  return request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// No dedicated copy endpoint — clone the item client-side (drop id, tweak
// title) and create it as new, same as the old local-state handleCopy did.
export function copyItem(item) {
  const { id, jobId, createdAt, updatedAt, createdBy, ...rest } = item
  return createItem(jobId, { ...rest, title: `${item.title} (Copy)` })
}
