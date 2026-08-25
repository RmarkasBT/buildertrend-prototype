// Workday Exceptions: per-date overrides on a job's standard work week, plus
// the one place that assembles a job's working calendar.
//
// calendarFor() is the important export. Every piece of date arithmetic on the
// server — cascade preview, batch apply, duration derivation — has to use the
// SAME calendar, or the schedule the API writes disagrees with the schedule the
// Gantt draws. src/lib/cascade.js has always accepted a `calendar`; this is
// what finally supplies a real one instead of the Mon-Fri default.

import { db, rowToException, exceptionToRow, nextExceptionId } from './db.js'
import { jobs } from '../src/data/jobs.js'
import { buildWorkCalendar, DEFAULT_WORK_WEEK, EXCEPTION_TYPES } from '../src/lib/workCalendar.js'
import { isISODate } from '../src/lib/dates.js'

const CURRENT_USER = 'Ruhaab Markas'

// job_id = '' is a company-wide exception, so a job's calendar is its own rows
// plus the global ones.
const selectForJob = db.prepare(
  `SELECT * FROM workday_exceptions WHERE job_id = ? OR job_id = '' ORDER BY start_date, id`,
)
const selectAll = db.prepare(`SELECT * FROM workday_exceptions ORDER BY start_date, id`)
const selectById = db.prepare(`SELECT * FROM workday_exceptions WHERE id = ?`)
const deleteById = db.prepare(`DELETE FROM workday_exceptions WHERE id = ?`)

const insertStmt = db.prepare(`
  INSERT INTO workday_exceptions (
    id, job_id, title, type, start_date, end_date, same_every_year, category,
    created_by, created_at, updated_at
  ) VALUES (
    @id, @job_id, @title, @type, @start_date, @end_date, @same_every_year, @category,
    @created_by, @created_at, @updated_at
  )
`)

const updateStmt = db.prepare(`
  UPDATE workday_exceptions SET
    job_id = @job_id, title = @title, type = @type,
    start_date = @start_date, end_date = @end_date,
    same_every_year = @same_every_year, category = @category,
    updated_at = @updated_at
  WHERE id = @id
`)

/** Exceptions that affect this job: its own, plus company-wide ones. */
export function listExceptions(jobId) {
  return (jobId ? selectForJob.all(jobId) : selectAll.all()).map(rowToException)
}

export function getException(id) {
  return rowToException(selectById.get(id))
}

/**
 * The working calendar for a job: its work week from Job Info, with its
 * exceptions layered on top.
 *
 * Jobs are static fixtures, so the work week is read from there rather than the
 * DB. A job with no explicit `workDays` gets Mon-Fri.
 */
export function calendarFor(jobId) {
  const job = jobs.find((j) => j.id === jobId)
  const week = Array.isArray(job?.workDays) && job.workDays.length ? job.workDays : DEFAULT_WORK_WEEK
  return buildWorkCalendar(week, listExceptions(jobId))
}

/** Validate a create/update body. Returns a message, or null. */
export function validateException(body, { partial = false } = {}) {
  const need = (k) => !partial || body[k] !== undefined
  if (need('title') && (!body.title || !String(body.title).trim())) return 'title is required'
  if (body.type !== undefined && !EXCEPTION_TYPES.includes(body.type)) {
    return `type must be "non_workday" (blocks a working day) or "extra_workday" (opens a non-working one), got ${JSON.stringify(body.type)}`
  }
  for (const k of ['start', 'end']) {
    if (!need(k)) continue
    if (!isISODate(body[k])) return `${k} must be YYYY-MM-DD (got ${JSON.stringify(body[k])})`
  }
  if (body.start !== undefined && body.end !== undefined && body.end < body.start) {
    return 'end must not be before start'
  }
  if (body.sameEveryYear !== undefined && typeof body.sameEveryYear !== 'boolean') {
    return `sameEveryYear must be true or false (got ${typeof body.sameEveryYear})`
  }
  if (body.category !== undefined && typeof body.category !== 'string') {
    return 'category must be a string'
  }
  // Required in BT's own form (red asterisk), and it's what makes a list of
  // exceptions scannable once there are more than a handful.
  if (need('category') && !String(body.category || '').trim()) {
    return 'category is required'
  }
  // '' is legal and means "every job" — a public holiday. Anything else has to
  // name a real job, or the exception silently affects nothing.
  if (body.jobId !== undefined && body.jobId !== '' && !jobs.some((j) => j.id === body.jobId)) {
    return `unknown jobId ${JSON.stringify(body.jobId)}. Use "" to apply to every job, or one of: ${jobs.map((j) => j.id).join(', ')}`
  }
  return null
}

export function createException(body) {
  const now = new Date().toISOString()
  const id = nextExceptionId()
  insertStmt.run({
    id,
    ...exceptionToRow({ sameEveryYear: false, category: '', jobId: '', ...body }),
    created_by: CURRENT_USER,
    created_at: now,
    updated_at: now,
  })
  return getException(id)
}

export function updateException(id, body) {
  const existing = selectById.get(id)
  if (!existing) return null
  // Merge over the stored row, same as every other update path here — an
  // omitted field keeps its value rather than resetting to a default.
  const merged = { ...rowToException(existing), ...body }
  updateStmt.run({ id, ...exceptionToRow(merged), updated_at: new Date().toISOString() })
  return getException(id)
}

export function deleteException(id) {
  if (!selectById.get(id)) return false
  deleteById.run(id)
  return true
}
