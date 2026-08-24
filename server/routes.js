import { db, rowToItem, itemToRow, nextScheduleId } from './db.js'
import { isISODate, endFromWorkDays, workDaysBetween } from '../src/lib/dates.js'
import { wouldCreateCycle } from '../src/lib/cascade.js'

const selectByJob = db.prepare('SELECT * FROM schedule_items WHERE job_id = ? ORDER BY start_date, id')
const selectById = db.prepare('SELECT * FROM schedule_items WHERE id = ?')
const deleteById = db.prepare('DELETE FROM schedule_items WHERE id = ?')

const insertStmt = db.prepare(`
  INSERT INTO schedule_items (
    id, job_id, title, color, assignees, start_date, end_date, work_days,
    hourly, progress, reminder, complete, phase, tags, show_on_gantt,
    show_client, sub_ids, predecessor_ids, notes, created_by, created_at, updated_at
  ) VALUES (
    @id, @job_id, @title, @color, @assignees, @start_date, @end_date, @work_days,
    @hourly, @progress, @reminder, @complete, @phase, @tags, @show_on_gantt,
    @show_client, @sub_ids, @predecessor_ids, @notes, @created_by, @created_at, @updated_at
  )
`)

const updateStmt = db.prepare(`
  UPDATE schedule_items SET
    title = @title, color = @color, assignees = @assignees,
    start_date = @start_date, end_date = @end_date, work_days = @work_days,
    hourly = @hourly, progress = @progress, reminder = @reminder,
    complete = @complete, phase = @phase, tags = @tags,
    show_on_gantt = @show_on_gantt, show_client = @show_client,
    sub_ids = @sub_ids, predecessor_ids = @predecessor_ids, notes = @notes, updated_at = @updated_at
  WHERE id = @id
`)

export function listItems(jobId) {
  return selectByJob.all(jobId).map(rowToItem)
}

/**
 * Validate a create/update payload against the merged result, returning a
 * message on rejection or null when it's fine.
 *
 * This exists because the write path had no validation at all: a PUT with an
 * empty body bound `undefined` to NOT NULL date columns and surfaced as a 500,
 * and nothing anywhere stopped a caller from creating a dependency cycle —
 * which then made the affected items silently vanish from the critical-path
 * computation rather than erroring.
 *
 * @param merged  the full post-merge item (wire shape)
 * @param jobId   job the item belongs to
 * @param selfId  item id on update; null on create
 */
export function validateItem(merged, jobId, selfId = null) {
  if (!merged.title || !String(merged.title).trim()) return 'title is required'
  if (!isISODate(merged.start)) return `start must be YYYY-MM-DD (got ${JSON.stringify(merged.start)})`
  if (!isISODate(merged.end)) return `end must be YYYY-MM-DD (got ${JSON.stringify(merged.end)})`
  if (merged.end < merged.start) return 'end must not be before start'

  const workDays = Number(merged.workDays)
  if (!Number.isInteger(workDays) || workDays < 1) return 'workDays must be an integer >= 1'
  // Deliberately NOT enforcing `end === endFromWorkDays(start, workDays)` here.
  // Reconciliation already keeps writes consistent, and a stored row can be
  // inconsistent through no fault of the current caller (one seeded fixture
  // ends on a Saturday). Rejecting that would make a title-only edit fail with
  // a duration error the caller can't act on, and would push agents into
  // "fixing" it by moving dates.

  const progress = Number(merged.progress ?? 0)
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return 'progress must be between 0 and 100'

  const preds = merged.predecessorIds ?? []
  if (!Array.isArray(preds)) return 'predecessorIds must be an array of schedule item ids'
  if (preds.length) {
    if (selfId && preds.includes(selfId)) return 'an item cannot be its own predecessor'
    const siblings = listItems(jobId)
    const known = new Set(siblings.map((s) => s.id))
    const bad = preds.filter((p) => !known.has(p))
    if (bad.length) {
      return `unknown predecessorIds for this job: ${bad.join(', ')}`
    }
    if (new Set(preds).size !== preds.length) return 'predecessorIds contains duplicates'
    if (selfId) {
      const cycle = wouldCreateCycle(siblings, selfId, preds)
      if (cycle) {
        const titles = cycle.map((id) => siblings.find((s) => s.id === id)?.title ?? id)
        return `that would create a dependency loop: ${titles.join(' -> ')}`
      }
    }
  }
  return null
}

/**
 * Reconcile the start/end/workDays triple, which are two views of one fact
 * (`end === start + workDays - 1`).
 *
 * Callers legitimately send any subset — the Gantt drag sends start+end, the
 * modal's Work Days field sends start+workDays, the agent sends start+end
 * without workDays. So derive the missing side from whichever the caller
 * actually supplied, and only complain when they supplied both and disagreed.
 * Validation then enforces the invariant on the result.
 */
export function reconcileDuration(merged, body, stored = null) {
  const sentStart = body.start !== undefined
  const sentEnd = body.end !== undefined
  const sentWorkDays = body.workDays !== undefined
  const out = { ...merged }

  if (!isISODate(out.start)) return out // let validateItem report it

  // Duration is in WORKING days. The stored duration comes from workDays when
  // present and is otherwise recovered from the span, since a legacy row can
  // have had workDays reset to 1 by the old full-replace PUT while keeping a
  // multi-week end.
  const storedDuration = stored
    ? Math.max(
        1,
        Number(stored.workDays) > 0
          ? Math.trunc(Number(stored.workDays))
          : isISODate(stored.start) && isISODate(stored.end)
            ? workDaysBetween(stored.start, stored.end)
            : 1,
      )
    : null

  if (sentWorkDays && !sentEnd) {
    // Explicit duration: derive end. (An invalid value is rejected by
    // validateBody before we get here, so this arithmetic is safe.)
    out.workDays = Math.trunc(Number(out.workDays))
    out.end = endFromWorkDays(out.start, out.workDays)
  } else if (sentEnd && !sentWorkDays && isISODate(out.end)) {
    out.workDays = Math.max(1, workDaysBetween(out.start, out.end))
  } else if (sentStart && !sentEnd && !sentWorkDays && storedDuration) {
    // A pure move: keep the duration, re-derive the end from the new start.
    out.workDays = storedDuration
    out.end = endFromWorkDays(out.start, storedDuration)
  } else if (!sentStart && !sentEnd && !sentWorkDays) {
    // The caller touched no date field at all (a title/progress/notes edit), so
    // touch nothing. Recomputing `end` here is what silently truncated a
    // 12-day bar to one day on a rename.
    return out
  }
  return out
}

/**
 * Validate the fields the caller actually sent, before any merging.
 *
 * Separate from validateItem because merging hides bad input: an explicit
 * `workDays: 0` would get coerced to 1 by reconciliation and then pass the
 * merged-invariant check, so the caller gets a silent 200 for a value we
 * should have rejected outright.
 */
export function validateBody(body) {
  // Type guards first. These matter more than they look: `tags` and `subIds`
  // are JSON-text columns, so a bare string round-trips back out as a string,
  // and the modal's `form.tags.map(...)` then throws and takes the page down.
  // An array into the TEXT `assignees` column threw a 500 outright. And the
  // 0/1 boolean columns accepted anything truthy, so `complete: "yes"` stored
  // as complete and `hourly: 123` stored as hourly.
  for (const key of ['tags', 'subIds', 'predecessorIds']) {
    if (body[key] === undefined) continue
    if (!Array.isArray(body[key])) {
      return `${key} must be an array of strings (got ${typeof body[key]}: ${JSON.stringify(body[key])})`
    }
    if (body[key].some((v) => typeof v !== 'string')) {
      return `${key} must contain only strings (got ${JSON.stringify(body[key])})`
    }
  }
  for (const key of ['title', 'assignees', 'color', 'reminder', 'phase', 'notes']) {
    if (body[key] !== undefined && typeof body[key] !== 'string') {
      return `${key} must be a string (got ${typeof body[key]}: ${JSON.stringify(body[key])})`
    }
  }
  for (const key of ['complete', 'hourly', 'showOnGantt', 'showClient']) {
    if (body[key] !== undefined && typeof body[key] !== 'boolean') {
      return `${key} must be true or false (got ${typeof body[key]}: ${JSON.stringify(body[key])})`
    }
  }

  if (body.title !== undefined && !String(body.title).trim()) return 'title is required'
  if (body.start !== undefined && !isISODate(body.start)) {
    return `start must be YYYY-MM-DD (got ${JSON.stringify(body.start)})`
  }
  if (body.end !== undefined && !isISODate(body.end)) {
    return `end must be YYYY-MM-DD (got ${JSON.stringify(body.end)})`
  }
  if (body.workDays !== undefined) {
    const n = Number(body.workDays)
    if (!Number.isInteger(n) || n < 1) {
      return `workDays must be an integer >= 1 (got ${JSON.stringify(body.workDays)})`
    }
  }
  if (body.progress !== undefined) {
    const n = Number(body.progress)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return `progress must be between 0 and 100 (got ${JSON.stringify(body.progress)})`
    }
  }
  return null
}

/** The post-merge, duration-reconciled view of an update. */
export function mergedItem(id, body) {
  const existing = selectById.get(id)
  if (!existing) return null
  const stored = rowToItem(existing)
  const merged = { ...stored, ...body, jobId: existing.job_id }
  return reconcileDuration(merged, body, stored)
}

/** The reconciled view of a create, for validation before insert. */
export function preparedNewItem(body) {
  const base = {
    color: 'Victoria', assignees: '', workDays: 1, hourly: false, progress: 0,
    reminder: 'None', complete: false, phase: 'Unassigned', tags: [],
    showOnGantt: true, showClient: true, subIds: [], predecessorIds: [], notes: '',
  }
  const merged = { ...base, ...body }
  return reconcileDuration(merged, body)
}

export function createItem(body) {
  const now = new Date().toISOString()
  const id = nextScheduleId()
  // Through preparedNewItem so a create honors the same
  // `end === start + workDays - 1` invariant an update does — a caller sending
  // start+workDays and no end used to land a 1-day row with a bogus end.
  const row = { id, ...itemToRow(preparedNewItem(body)), created_by: 'Ruhaab Markas', created_at: now, updated_at: now }
  insertStmt.run(row)
  return rowToItem(selectById.get(id))
}

export function updateItem(id, body) {
  // Partial update, via the same merge the caller validates against: omitted
  // fields keep their stored value instead of falling back to itemToRow's
  // defaults. Without this, any field the caller left out was reset — which
  // silently wiped predecessorIds, subIds and tags on every title-only edit,
  // and made a missing title/start/end bind undefined to a NOT NULL column
  // (a 500, not a 400). To clear a field, send it explicitly.
  const merged = mergedItem(id, body)
  if (!merged) return null
  // updateStmt's SET clause never references @job_id (a row's job never
  // changes) — node:sqlite's DatabaseSync, unlike better-sqlite3, throws
  // "Unknown named parameter" if a bound object has a key absent from the
  // SQL text, so it has to be dropped here rather than just left unused.
  const { job_id: _job_id, ...rowFields } = itemToRow(merged)
  const row = { id, ...rowFields, updated_at: new Date().toISOString() }
  updateStmt.run(row)
  return rowToItem(selectById.get(id))
}

const patchDatesStmt = db.prepare(`
  UPDATE schedule_items SET
    start_date = @start_date, end_date = @end_date, work_days = @work_days,
    updated_at = @updated_at
  WHERE id = @id
`)

const patchDatesAndFieldsStmt = db.prepare(`
  UPDATE schedule_items SET
    start_date = @start_date, end_date = @end_date, work_days = @work_days,
    title = @title, predecessor_ids = @predecessor_ids, progress = @progress,
    complete = @complete, updated_at = @updated_at
  WHERE id = @id
`)

/**
 * Write ONLY the fields a cascade or an undo actually owns.
 *
 * Deliberately not built on updateItem: that round-trips the whole row through
 * itemToRow, which defaults every absent field — so a dates-only caller would
 * silently clear `predecessorIds`, i.e. the dependency graph the cascade was
 * just computed from. Narrowing the SQL is what makes that structurally
 * impossible rather than a thing to remember.
 *
 * `patch` carries start/end/workDays; undo also restores the other tracked
 * fields, so those are written only when present.
 *
 * Synchronous by design — callers invoke this inside a transaction, where an
 * await would hand control back to the event loop mid-write.
 */
export function patchDates(id, patch, now = new Date().toISOString()) {
  const existing = selectById.get(id)
  if (!existing) return null

  const base = {
    id,
    start_date: patch.start ?? existing.start_date,
    end_date: patch.end ?? existing.end_date,
    work_days: patch.workDays ?? existing.work_days,
    updated_at: now,
  }

  const restoresMore =
    patch.title !== undefined ||
    patch.predecessorIds !== undefined ||
    patch.progress !== undefined ||
    patch.complete !== undefined

  if (!restoresMore) {
    patchDatesStmt.run(base)
  } else {
    patchDatesAndFieldsStmt.run({
      ...base,
      title: patch.title ?? existing.title,
      predecessor_ids:
        patch.predecessorIds !== undefined
          ? JSON.stringify(patch.predecessorIds)
          : existing.predecessor_ids,
      progress: patch.progress ?? existing.progress,
      complete: patch.complete !== undefined ? (patch.complete ? 1 : 0) : existing.complete,
    })
  }
  return rowToItem(selectById.get(id))
}

export function deleteItem(id) {
  const existing = selectById.get(id)
  if (!existing) return false
  deleteById.run(id)
  return true
}
