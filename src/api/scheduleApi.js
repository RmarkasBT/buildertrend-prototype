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

/**
 * Apply date changes atomically, cascading through dependencies, and record a
 * change set so the whole thing can be undone in one action.
 *
 * Use this for any date move, not updateItem — a bar that moves usually pushes
 * its successors, and doing that as N separate PUTs can fail halfway and leave
 * the schedule violating its own dependencies with no record of what happened.
 */
export function batchUpdate(jobId, changes, opts = {}) {
  return request('/api/schedule/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, changes, ...opts }),
  })
}

/** Read-only: what would move, and does the job finish later. Writes nothing. */
export function cascadePreview(jobId, changes, opts = {}) {
  return request('/api/schedule/cascade-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, changes, ...opts }),
  })
}

export function undoChangeSet(changeSetId, opts = {}) {
  return request(`/api/change-sets/${encodeURIComponent(changeSetId)}/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
}

export function listChangeSets(jobId, limit = 20) {
  return request(`/api/change-sets?jobId=${encodeURIComponent(jobId)}&limit=${limit}`)
}

// No dedicated copy endpoint — clone the item client-side (drop id, tweak
// title) and create it as new, same as the old local-state handleCopy did.
export function copyItem(item) {
  const { id, jobId, createdAt, updatedAt, createdBy, ...rest } = item
  return createItem(jobId, { ...rest, title: `${item.title} (Copy)` })
}
