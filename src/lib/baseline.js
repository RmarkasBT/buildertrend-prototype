// Comparing the live schedule against a baseline snapshot.
//
// A baseline is a frozen copy of the schedule taken when the plan was agreed.
// Its whole purpose is answering "are we ahead or behind, and where" — which BT
// describes as expected vs. actual start dates, durations, and the slips
// between them.
//
// Kept separate from the DB and the UI so the arithmetic is testable on its
// own, and so the same comparison serves the Baseline tab, the Gantt's
// baseline bars, and anything that later wants to report drift.

import { dayIndex, workDaysBetween, WEEKDAYS_ONLY } from './dates.js'

/**
 * SIGN CONVENTION, stated once because it's the thing that gets confused:
 * positive means LATER than planned, i.e. behind schedule. Negative means
 * earlier, i.e. ahead. Zero is on plan. Slips are in CALENDAR days, because
 * "three days late" to a builder means three days on the wall calendar, not
 * three working days.
 */
export const BEHIND = 'behind'
export const AHEAD = 'ahead'
export const ON_PLAN = 'on_plan'
export const ADDED = 'added'
export const REMOVED = 'removed'

function statusFor(slip) {
  if (slip > 0) return BEHIND
  if (slip < 0) return AHEAD
  return ON_PLAN
}

/**
 * Compare live items against baseline rows.
 *
 * @param items    current schedule items
 * @param baseline rows of { itemId, title, start, end, workDays }
 * @returns per-item comparison plus a job-level summary
 *
 * Items created after the baseline was set have nothing to compare against and
 * are reported as `added` rather than silently omitted — scope added mid-project
 * is exactly the thing a baseline is supposed to make visible. Items that were
 * in the baseline and have since been deleted come back as `removed`, for the
 * same reason.
 */
export function compareToBaseline(items, baseline, opts = {}) {
  const calendar = opts.calendar || WEEKDAYS_ONLY
  const baseById = new Map(baseline.map((b) => [b.itemId, b]))
  const liveById = new Map(items.map((i) => [i.id, i]))

  const rows = []

  for (const it of items) {
    const base = baseById.get(it.id)
    if (!base) {
      rows.push({
        itemId: it.id,
        title: it.title,
        status: ADDED,
        baseline: null,
        current: { start: it.start, end: it.end, workDays: it.workDays },
        startSlip: 0,
        endSlip: 0,
        durationDelta: 0,
      })
      continue
    }
    const startSlip = dayIndex(it.start) - dayIndex(base.start)
    const endSlip = dayIndex(it.end) - dayIndex(base.end)
    const baseDuration = base.workDays || workDaysBetween(base.start, base.end, calendar)
    const curDuration = it.workDays || workDaysBetween(it.start, it.end, calendar)
    rows.push({
      itemId: it.id,
      title: it.title,
      // Status tracks the FINISH, not the start: an item that starts late but
      // finishes on time hasn't cost the project anything, and one that starts
      // on time but runs long has.
      status: statusFor(endSlip),
      baseline: { start: base.start, end: base.end, workDays: baseDuration },
      current: { start: it.start, end: it.end, workDays: curDuration },
      startSlip,
      endSlip,
      durationDelta: curDuration - baseDuration,
    })
  }

  for (const base of baseline) {
    if (liveById.has(base.itemId)) continue
    rows.push({
      itemId: base.itemId,
      title: base.title,
      status: REMOVED,
      baseline: { start: base.start, end: base.end, workDays: base.workDays },
      current: null,
      startSlip: 0,
      endSlip: 0,
      durationDelta: 0,
    })
  }

  const comparable = rows.filter((r) => r.baseline && r.current)
  const baseFinish = baseline.reduce((acc, b) => (acc && acc > b.end ? acc : b.end), '')
  const liveFinish = items.reduce((acc, i) => (acc && acc > i.end ? acc : i.end), '')

  return {
    rows: rows.sort((a, b) => {
      const as = a.current?.start ?? a.baseline?.start ?? ''
      const bs = b.current?.start ?? b.baseline?.start ?? ''
      return as < bs ? -1 : as > bs ? 1 : 0
    }),
    summary: {
      behind: comparable.filter((r) => r.status === BEHIND).length,
      ahead: comparable.filter((r) => r.status === AHEAD).length,
      onPlan: comparable.filter((r) => r.status === ON_PLAN).length,
      added: rows.filter((r) => r.status === ADDED).length,
      removed: rows.filter((r) => r.status === REMOVED).length,
      // The number that actually matters: has the finish date moved?
      projectEnd: {
        baseline: baseFinish,
        current: liveFinish,
        slip: baseFinish && liveFinish ? dayIndex(liveFinish) - dayIndex(baseFinish) : 0,
      },
      // Worst single slip, so the tab can point at the item to look at first.
      worst: comparable.reduce(
        (worst, r) => (!worst || r.endSlip > worst.endSlip ? r : worst),
        null,
      ),
    },
  }
}

/** "3 days late" / "2 days early" / "on plan" — for display only. */
export function describeSlip(days) {
  if (days === 0) return 'on plan'
  const n = Math.abs(days)
  return `${n} ${n === 1 ? 'day' : 'days'} ${days > 0 ? 'late' : 'early'}`
}
