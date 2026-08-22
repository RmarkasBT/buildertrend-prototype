import {
  db, rowToGroup, rowToEstimateItem, estimateItemToRow,
  nextEstimateGroupId, nextEstimateItemId,
} from './db.js'

const selectGroupsByJob = db.prepare('SELECT * FROM estimate_groups WHERE job_id = ? ORDER BY sort_order, id')
const selectGroupById = db.prepare('SELECT * FROM estimate_groups WHERE id = ?')
const insertGroupStmt = db.prepare(`
  INSERT INTO estimate_groups (id, job_id, name, sort_order, created_at)
  VALUES (@id, @job_id, @name, @sort_order, @created_at)
`)
const deleteGroupStmt = db.prepare('DELETE FROM estimate_groups WHERE id = ?')
const countGroupsByJob = db.prepare('SELECT COUNT(*) AS n FROM estimate_groups WHERE job_id = ?')

const selectItemsByJob = db.prepare('SELECT * FROM estimate_items WHERE job_id = ? ORDER BY sort_order, id')
const selectItemsByGroup = db.prepare('SELECT * FROM estimate_items WHERE group_id = ? ORDER BY sort_order, id')
const selectItemById = db.prepare('SELECT * FROM estimate_items WHERE id = ?')
const deleteItemStmt = db.prepare('DELETE FROM estimate_items WHERE id = ?')
const insertItemStmt = db.prepare(`
  INSERT INTO estimate_items (
    id, job_id, group_id, name, cost_code, description, internal_notes,
    quantity, unit, unit_cost, cost_type, markup_percent, taxable, sort_order,
    created_by, created_at, updated_at
  ) VALUES (
    @id, @job_id, @group_id, @name, @cost_code, @description, @internal_notes,
    @quantity, @unit, @unit_cost, @cost_type, @markup_percent, @taxable, @sort_order,
    @created_by, @created_at, @updated_at
  )
`)
const updateItemStmt = db.prepare(`
  UPDATE estimate_items SET
    group_id = @group_id, name = @name, cost_code = @cost_code,
    description = @description, internal_notes = @internal_notes,
    quantity = @quantity, unit = @unit,
    unit_cost = @unit_cost, cost_type = @cost_type, markup_percent = @markup_percent,
    taxable = @taxable, sort_order = @sort_order, updated_at = @updated_at
  WHERE id = @id
`)

// Builder Cost / Unit Price / Client Price / Margin / Profit are derived
// live from quantity/unit cost/markup, matching the real worksheet's
// recalculation on every edit rather than persisted columns that could
// drift out of sync. Confirmed against the live session's single sample
// row: $100 unit cost, 25% markup, qty 1 -> $125 unit price, 20% margin.
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function withFinancials(item) {
  const builderCost = item.quantity * item.unitCost
  const unitPrice = item.unitCost * (1 + item.markupPercent / 100)
  const clientPrice = item.quantity * unitPrice
  const profit = clientPrice - builderCost
  const margin = clientPrice > 0 ? profit / clientPrice : 0
  return {
    ...item,
    builderCost: round2(builderCost),
    unitPrice: Math.round(unitPrice * 10000) / 10000,
    clientPrice: round2(clientPrice),
    profit: round2(profit),
    margin,
  }
}

function sumTotals(items) {
  const builderCost = round2(items.reduce((s, it) => s + it.builderCost, 0))
  const clientPrice = round2(items.reduce((s, it) => s + it.clientPrice, 0))
  const profit = round2(clientPrice - builderCost)
  const margin = clientPrice > 0 ? profit / clientPrice : 0
  // No per-job/company tax rate exists in this prototype's scope — every
  // sample item observed live was "Non-taxable" with Tax showing $0.00, so
  // tax is always $0 here rather than guessing at a rate. Flagged as a gap
  // in CAPTURE_LOG.md.
  return { builderCost, clientPrice, profit, margin, tax: 0, totalPrice: clientPrice }
}

export function getEstimate(jobId) {
  const groupRows = selectGroupsByJob.all(jobId).map(rowToGroup)
  const groups = groupRows.length > 0 ? groupRows : [{ id: 'unassigned', jobId, name: 'Unassigned', sortOrder: 0, virtual: true }]

  const groupsWithItems = groups.map((group) => {
    const itemRows = group.virtual ? [] : selectItemsByGroup.all(group.id).map(rowToEstimateItem)
    const items = itemRows.map(withFinancials)
    return { ...group, items, totals: sumTotals(items) }
  })

  const allItems = groupsWithItems.flatMap((g) => g.items)
  return { groups: groupsWithItems, totals: sumTotals(allItems) }
}

// The real screen always has at least one group ("Unassigned") to drop
// items into. Rather than pre-creating it for every job, a job with zero
// groups is shown a synthetic virtual one client-side (see getEstimate
// above); the first real "+ Item"/"+ Allowance"/"+ Add Group" action
// materializes it as a real row here — this is what "creating an estimate"
// actually means in this prototype, since the real product has no separate
// blank-estimate creation step observed.
function materializeGroup(jobId, groupId, fallbackName) {
  if (groupId && groupId !== 'unassigned') {
    const existing = selectGroupById.get(groupId)
    if (existing) return existing.id
  }
  if (countGroupsByJob.get(jobId).n === 0) {
    const id = nextEstimateGroupId()
    insertGroupStmt.run({ id, job_id: jobId, name: fallbackName ?? 'Unassigned', sort_order: 0, created_at: new Date().toISOString() })
    return id
  }
  // Virtual "unassigned" requested but the job already has real groups —
  // fall back to the first one rather than silently dropping the item.
  return selectGroupsByJob.all(jobId)[0].id
}

export function createGroup(jobId, name) {
  const id = nextEstimateGroupId()
  const sortOrder = countGroupsByJob.get(jobId).n
  insertGroupStmt.run({ id, job_id: jobId, name, sort_order: sortOrder, created_at: new Date().toISOString() })
  return rowToGroup(selectGroupById.get(id))
}

export function deleteGroup(id) {
  const existing = selectGroupById.get(id)
  if (!existing) return false
  for (const item of selectItemsByGroup.all(id)) deleteItemStmt.run(item.id)
  deleteGroupStmt.run(id)
  return true
}

export function createItem(jobId, body) {
  const groupId = materializeGroup(jobId, body.groupId, 'Unassigned')
  const now = new Date().toISOString()
  const id = nextEstimateItemId()
  const row = {
    id,
    ...estimateItemToRow({ ...body, jobId, groupId }),
    created_by: 'Ruhaab Markas',
    created_at: now,
    updated_at: now,
  }
  insertItemStmt.run(row)
  return withFinancials(rowToEstimateItem(selectItemById.get(id)))
}

export function updateItem(id, body) {
  const existing = selectItemById.get(id)
  if (!existing) return null
  const groupId = body.groupId ? materializeGroup(existing.job_id, body.groupId) : existing.group_id
  // node:sqlite's DatabaseSync throws on named params a prepared statement
  // doesn't declare (unlike better-sqlite3, which ignores extras) — strip
  // job_id since updateItemStmt's UPDATE never touches it.
  const { job_id: _job_id, ...rest } = estimateItemToRow({ ...body, jobId: existing.job_id, groupId })
  const row = { id, ...rest, updated_at: new Date().toISOString() }
  updateItemStmt.run(row)
  return withFinancials(rowToEstimateItem(selectItemById.get(id)))
}

export function deleteItem(id) {
  const existing = selectItemById.get(id)
  if (!existing) return false
  deleteItemStmt.run(id)
  return true
}

export function duplicateItem(id) {
  const existing = selectItemById.get(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const newId = nextEstimateItemId()
  const row = {
    ...existing,
    id: newId,
    name: `${existing.name} (Copy)`,
    created_at: now,
    updated_at: now,
  }
  insertItemStmt.run(row)
  return withFinancials(rowToEstimateItem(selectItemById.get(newId)))
}

export function itemsByJob(jobId) {
  return selectItemsByJob.all(jobId).map(rowToEstimateItem)
}
