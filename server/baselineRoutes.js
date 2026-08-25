// Baseline: freeze the agreed plan, then measure against it.
//
// Setting a baseline is the only write here, and it's additive — a new snapshot
// rather than an overwrite. The comparison itself lives in src/lib/baseline.js
// so it's testable without a database and shared with the UI.

import {
  db,
  rowToBaseline,
  rowToBaselineItem,
  reserveIds,
} from './db.js'
import { listItems } from './routes.js'
import { compareToBaseline } from '../src/lib/baseline.js'
import { calendarFor } from './workdayRoutes.js'

const CURRENT_USER = 'Ruhaab Markas'

const insertBaseline = db.prepare(`
  INSERT INTO schedule_baselines (id, job_id, name, project_end, item_count, created_by, created_at)
  VALUES (@id, @job_id, @name, @project_end, @item_count, @created_by, @created_at)
`)

const insertBaselineItem = db.prepare(`
  INSERT INTO schedule_baseline_items (baseline_id, item_id, title, start_date, end_date, work_days)
  VALUES (@baseline_id, @item_id, @title, @start_date, @end_date, @work_days)
`)

const selectLatest = db.prepare(
  `SELECT * FROM schedule_baselines WHERE job_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
)
const selectAllForJob = db.prepare(
  `SELECT * FROM schedule_baselines WHERE job_id = ? ORDER BY created_at DESC, id DESC`,
)
const selectById = db.prepare(`SELECT * FROM schedule_baselines WHERE id = ?`)
const selectItems = db.prepare(`SELECT * FROM schedule_baseline_items WHERE baseline_id = ?`)
const deleteBaseline = db.prepare(`DELETE FROM schedule_baselines WHERE id = ?`)
const deleteBaselineItems = db.prepare(`DELETE FROM schedule_baseline_items WHERE baseline_id = ?`)

/** Every baseline ever set for this job, newest first. */
export function listBaselines(jobId) {
  return selectAllForJob.all(jobId).map(rowToBaseline)
}

/** Capture the schedule as it stands now. */
export function setBaseline(jobId, name = '') {
  const items = listItems(jobId)
  const now = new Date().toISOString()
  const projectEnd = items.reduce((acc, i) => (acc && acc > i.end ? acc : i.end), '')

  // Reserved before BEGIN — see db.js's reserveIds for why that matters.
  const id = reserveIds('next_baseline_id', 'bl', 1)[0]

  db.exec('BEGIN')
  try {
    insertBaseline.run({
      id,
      job_id: jobId,
      name: name || `Baseline ${now.slice(0, 10)}`,
      project_end: projectEnd,
      item_count: items.length,
      created_by: CURRENT_USER,
      created_at: now,
    })
    for (const it of items) {
      insertBaselineItem.run({
        baseline_id: id,
        item_id: it.id,
        title: it.title,
        start_date: it.start,
        end_date: it.end,
        work_days: it.workDays,
      })
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return getComparison(jobId)
}

export function clearBaseline(id) {
  const row = selectById.get(id)
  if (!row) return false
  db.exec('BEGIN')
  try {
    deleteBaselineItems.run(id)
    deleteBaseline.run(id)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return true
}

/**
 * The active baseline plus a live comparison against it.
 *
 * Returns `{ baseline: null }` when none has been set, rather than an error —
 * "no baseline yet" is a normal state the tab has to render.
 *
 * The comparison is computed on every read, never stored: the schedule moves
 * constantly, and a cached slip would be wrong within a minute.
 */
export function getComparison(jobId) {
  const row = selectLatest.get(jobId)
  if (!row) return { baseline: null, rows: [], summary: null }
  const baseline = rowToBaseline(row)
  const snapshot = selectItems.all(row.id).map(rowToBaselineItem)
  const { rows, summary } = compareToBaseline(listItems(jobId), snapshot, {
    calendar: calendarFor(jobId),
  })
  return { baseline, rows, summary }
}
