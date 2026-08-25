// Transactional multi-item schedule writes, and undo.
//
// Every multi-item mutation in the app goes through applyBatch: a Gantt drag,
// an inline edit, a predecessor link, and later an approved impact. One code
// path means one atomicity guarantee and one undo implementation.
//
// TWO RULES THAT LOOK LIKE STYLE BUT ARE CORRECTNESS:
//
// 1. Reserve ids BEFORE `BEGIN`. Every `next*Id()` in db.js opens its own
//    transaction, and SQLite has no nested transactions — calling one inside
//    our BEGIN throws, or (worse) its COMMIT commits our transaction early and
//    silently destroys the rollback. Hence db.js's `reserveIds`, which
//    deliberately does not open a transaction.
//
// 2. NEVER `await` between `BEGIN` and `COMMIT`. node:sqlite is synchronous, so
//    a fully-synchronous transaction body is atomic even with concurrent
//    requests. One `await` in the middle hands control back to the event loop
//    with the transaction open, and another request can interleave.
//
// So the shape is always: read and validate (async ok) -> compute the plan ->
// reserve ids -> BEGIN, synchronous writes only, COMMIT.

import { db, rowToItem, rowToChangeSet, rowToChangeItem, reserveIds } from './db.js'
import { listItems, patchDates } from './routes.js'
import { cascade } from '../src/lib/cascade.js'
import { calendarFor } from './workdayRoutes.js'
import { todayIso } from '../src/lib/dates.js'

const CURRENT_USER = 'Ruhaab Markas'

const insertSet = db.prepare(`
  INSERT INTO schedule_change_sets (
    id, job_id, origin, origin_ref, reason, shift_notes,
    notify_assignees, notify_linked, request_confirmation,
    direct_count, cascade_count,
    project_end_before, project_end_after, undone_by, created_by, created_at
  ) VALUES (
    @id, @job_id, @origin, @origin_ref, @reason, @shift_notes,
    @notify_assignees, @notify_linked, @request_confirmation,
    @direct_count, @cascade_count,
    @project_end_before, @project_end_after, '', @created_by, @created_at
  )
`)

const insertSetItem = db.prepare(`
  INSERT INTO schedule_change_items (change_set_id, item_id, role, prior, next)
  VALUES (@change_set_id, @item_id, @role, @prior, @next)
`)

const selectSet = db.prepare('SELECT * FROM schedule_change_sets WHERE id = ?')
const selectSetItems = db.prepare('SELECT * FROM schedule_change_items WHERE change_set_id = ?')
const selectSetsByJob = db.prepare(
  'SELECT * FROM schedule_change_sets WHERE job_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
)
const markUndoneBy = db.prepare('UPDATE schedule_change_sets SET undone_by = ? WHERE id = ?')

/** The fields a change set records and can revert. */
const TRACKED = ['start', 'end', 'workDays', 'title', 'predecessorIds', 'progress', 'complete']

function snapshot(item) {
  const out = {}
  for (const k of TRACKED) if (item[k] !== undefined) out[k] = item[k]
  return out
}

/**
 * Plan a batch without touching the database.
 *
 * Separated from the apply so the preview endpoint, the apply, and the tests
 * all agree by construction rather than by careful maintenance.
 */
export function planBatch(jobId, requests, opts = {}) {
  const items = listItems(jobId)
  // The job's real calendar, so holidays and extra Saturdays affect an apply
  // exactly as they affect the preview and the Gantt.
  const plan = cascade(items, requests, { mode: opts.mode, today: todayIso(), calendar: calendarFor(jobId) })
  return { items, plan }
}

/**
 * Apply a batch of schedule changes atomically, recording a change set.
 *
 * Returns `{ changeSet, items, plan }` on success, or `{ error, ... }` shaped
 * for the HTTP layer to turn into a status code.
 */
export function applyBatch(jobId, requests, opts = {}) {
  const { items, plan } = planBatch(jobId, requests, opts)

  if (!plan.ok) return { error: plan.error, unknownIds: plan.unknownIds, cycleIds: plan.cycleIds }
  if (!plan.changes.length) {
    // Nothing to do is a success, not an error — a drag that lands where it
    // started shouldn't create an empty change set for the user to undo.
    return { noop: true, plan, items }
  }

  const byId = new Map(items.map((i) => [i.id, i]))
  const now = new Date().toISOString()

  // --- everything above this line is reads; ids are reserved before BEGIN ---
  const changeSetId = reserveIds('next_change_set_id', 'cs', 1)[0]

  const rows = plan.changes.map((c) => ({
    change_set_id: changeSetId,
    item_id: c.itemId,
    role: c.role,
    prior: JSON.stringify(snapshot(byId.get(c.itemId))),
    next: JSON.stringify(c.to),
  }))

  db.exec('BEGIN')
  try {
    for (const c of plan.changes) {
      // Dates only. Never round-trip a whole item here: itemToRow defaults any
      // absent field, so a full write would clear predecessorIds — the very
      // graph this cascade was computed from.
      patchDates(c.itemId, c.to, now)
    }
    insertSet.run({
      id: changeSetId,
      job_id: jobId,
      origin: opts.origin || 'batch',
      origin_ref: opts.originRef || '',
      reason: opts.reason || '',
      shift_notes: opts.shiftNotes || '',
      notify_assignees: opts.notifyAssignees ? 1 : 0,
      notify_linked: opts.notifyLinked ? 1 : 0,
      request_confirmation: opts.requestConfirmation ? 1 : 0,
      direct_count: plan.counts.direct,
      cascade_count: plan.counts.cascade,
      project_end_before: plan.projectEnd.before,
      project_end_after: plan.projectEnd.after,
      created_by: CURRENT_USER,
      created_at: now,
    })
    for (const r of rows) insertSetItem.run(r)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return { changeSet: getChangeSet(changeSetId), items: listItems(jobId), plan }
}

export function getChangeSet(id) {
  const row = selectSet.get(id)
  if (!row) return null
  return { ...rowToChangeSet(row), items: selectSetItems.all(id).map(rowToChangeItem) }
}

export function listChangeSets(jobId, limit = 20) {
  return selectSetsByJob.all(jobId, Math.min(Math.max(Number(limit) || 20, 1), 100)).map(rowToChangeSet)
}

/**
 * Revert a change set, recording the reversal as its own change set.
 *
 * Non-destructive on purpose: undo is itself undoable, and the history keeps
 * both rows rather than deleting the thing that happened.
 *
 * Refuses when an item's current dates no longer match what this change set
 * wrote — someone edited on top of it, and blindly restoring `prior` would
 * silently discard their edit. `force` overrides, but the caller has to mean it.
 */
export function undoChangeSet(id, { force = false } = {}) {
  const set = getChangeSet(id)
  if (!set) return { error: 'not_found' }
  if (set.undoneBy) return { error: 'already_undone', undoneBy: set.undoneBy }

  const live = new Map(listItems(set.jobId).map((i) => [i.id, i]))

  const missing = set.items.filter((ci) => !live.has(ci.itemId)).map((ci) => ci.itemId)
  if (missing.length && !force) return { error: 'items_deleted', itemIds: missing }

  const drifted = set.items
    .filter((ci) => {
      const cur = live.get(ci.itemId)
      if (!cur) return false
      return cur.start !== ci.next.start || cur.end !== ci.next.end
    })
    .map((ci) => ci.itemId)
  if (drifted.length && !force) return { error: 'stale', itemIds: drifted }

  const now = new Date().toISOString()
  const undoId = reserveIds('next_change_set_id', 'cs', 1)[0]

  const restorable = set.items.filter((ci) => live.has(ci.itemId))
  const rows = restorable.map((ci) => ({
    change_set_id: undoId,
    item_id: ci.itemId,
    role: ci.role,
    prior: JSON.stringify(ci.next),
    next: JSON.stringify(ci.prior),
  }))

  db.exec('BEGIN')
  try {
    for (const ci of restorable) patchDates(ci.itemId, ci.prior, now)
    insertSet.run({
      id: undoId,
      job_id: set.jobId,
      origin: 'undo',
      origin_ref: set.id,
      reason: `Undo of ${set.id}`,
      shift_notes: '',
      notify_assignees: 0,
      notify_linked: 0,
      request_confirmation: 0,
      direct_count: restorable.filter((r) => r.role === 'direct').length,
      cascade_count: restorable.filter((r) => r.role === 'cascade').length,
      project_end_before: set.projectEnd.after,
      project_end_after: set.projectEnd.before,
      created_by: CURRENT_USER,
      created_at: now,
    })
    for (const r of rows) insertSetItem.run(r)
    markUndoneBy.run(undoId, set.id)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return { changeSet: getChangeSet(undoId), items: listItems(set.jobId) }
}

export { rowToItem }

/**
 * Every recorded date change for ONE item, newest first — the Shifts tab.
 *
 * Derived from change sets rather than stored separately: a change set already
 * IS a shift record (who, when, why, and what moved), so a parallel shifts
 * table would be the same facts written twice and free to disagree. BT surfaces
 * the same thing per item, alongside the Shift Reason logged at the time.
 */
export function listShiftsForItem(itemId) {
  const rows = db
    .prepare(
      `SELECT ci.*, cs.id AS set_id, cs.origin, cs.reason, cs.shift_notes, cs.created_by, cs.created_at,
              cs.undone_by, cs.direct_count, cs.cascade_count
         FROM schedule_change_items ci
         JOIN schedule_change_sets cs ON cs.id = ci.change_set_id
        WHERE ci.item_id = ?
        ORDER BY cs.created_at DESC, cs.id DESC`,
    )
    .all(itemId)

  return rows.map((r) => {
    const prior = JSON.parse(r.prior || '{}')
    const next = JSON.parse(r.next || '{}')
    return {
      changeSetId: r.set_id,
      itemId: r.item_id,
      // 'direct' means this item is what someone actually moved; 'cascade'
      // means it moved because something it depends on did. Worth showing —
      // "we didn't touch this, it followed framing" is the useful explanation.
      role: r.role,
      origin: r.origin,
      reason: r.reason,
      shiftNotes: r.shift_notes ?? '',
      from: { start: prior.start ?? '', end: prior.end ?? '', workDays: prior.workDays ?? null },
      to: { start: next.start ?? '', end: next.end ?? '', workDays: next.workDays ?? null },
      undone: Boolean(r.undone_by),
      alsoMoved: Math.max(0, (r.direct_count ?? 0) + (r.cascade_count ?? 0) - 1),
      createdBy: r.created_by,
      createdAt: r.created_at,
    }
  })
}
