// A job's working calendar: which days work, and which don't.
//
// Two layers, matching how Buildertrend describes it:
//
//   1. The job's standard WORK WEEK — set from Job Info's "Work Days" dropdown.
//      Most jobs are Mon-Fri, but a job can run six or seven days.
//   2. WORKDAY EXCEPTIONS — per-date overrides on top of that week:
//        Non Workday   blocks a day that would normally work (a holiday, an
//                      office closure). Nothing can be scheduled on it.
//        Extra Workday opens a day that normally wouldn't (a Saturday push).
//      BT: "Workday Exceptions allow you to treat specific non-working days as
//      working days without altering the overall schedule."
//
// An exception can apply to one job or to every job (a public holiday), and can
// repeat annually — "Same Every Year" — in which case only its month and day
// matter, not its year.
//
// The result is the `calendar` object src/lib/cascade.js already accepts: any
// `{ isWorkDay(iso) }` drops in. That seam existed before this file did,
// precisely so holidays could arrive without touching the cascade's structure.

import { dayIndex, fromDayIndex, weekdayIndex, isISODate } from './dates.js'

/** Mon-Fri, as weekday indices (0 = Sunday). The default work week. */
export const DEFAULT_WORK_WEEK = [1, 2, 3, 4, 5]

export const EXCEPTION_TYPES = ['non_workday', 'extra_workday']

/** Human labels, matching BT's own wording in the Type dropdown. */
export const EXCEPTION_TYPE_LABELS = {
  non_workday: 'Non Workday',
  extra_workday: 'Extra Workday',
}

const monthDay = (iso) => String(iso).slice(5, 10)

/**
 * Does `exc` cover `iso`?
 *
 * A normal exception is a plain inclusive date range. An annual one compares
 * month-day instead, so "Christmas Day, same every year" keeps applying without
 * needing a row per year — including across a range that wraps New Year, which
 * is why the wrap case is handled rather than assumed away.
 */
export function exceptionCovers(exc, iso) {
  if (!isISODate(iso) || !isISODate(exc.start) || !isISODate(exc.end)) return false
  if (!exc.sameEveryYear) return iso >= exc.start && iso <= exc.end
  const [a, b, d] = [monthDay(exc.start), monthDay(exc.end), monthDay(iso)]
  return a <= b ? d >= a && d <= b : d >= a || d <= b
}

/**
 * Build a calendar for one job.
 *
 * @param workWeek   weekday indices that normally work; defaults to Mon-Fri
 * @param exceptions rows shaped { type, start, end, sameEveryYear, jobId }
 *
 * Exceptions are pre-filtered by caller for the job in question (or global).
 * `extra_workday` wins over `non_workday` on the same date: opening a day is
 * the more specific intent, and a job that has explicitly been told to work a
 * date shouldn't be blocked by a company-wide closure.
 */
export function buildWorkCalendar(workWeek = DEFAULT_WORK_WEEK, exceptions = []) {
  const week = new Set((Array.isArray(workWeek) && workWeek.length ? workWeek : DEFAULT_WORK_WEEK).map(Number))
  const extra = exceptions.filter((e) => e.type === 'extra_workday')
  const off = exceptions.filter((e) => e.type === 'non_workday')

  // Small memo: the cascade asks about the same dates repeatedly while walking
  // a chain, and each miss costs a scan of every exception.
  const memo = new Map()

  return {
    name: 'job-calendar',
    workWeek: [...week].sort(),
    exceptions,
    isWorkDay(iso) {
      const hit = memo.get(iso)
      if (hit !== undefined) return hit
      let result
      if (extra.some((e) => exceptionCovers(e, iso))) result = true
      else if (off.some((e) => exceptionCovers(e, iso))) result = false
      else result = week.has(weekdayIndex(iso))
      memo.set(iso, result)
      return result
    },
    /** Why a date doesn't work — for a tooltip, not for logic. */
    reasonFor(iso) {
      const opened = extra.find((e) => exceptionCovers(e, iso))
      if (opened) return { working: true, title: opened.title, type: 'extra_workday' }
      const blocked = off.find((e) => exceptionCovers(e, iso))
      if (blocked) return { working: false, title: blocked.title, type: 'non_workday' }
      return { working: week.has(weekdayIndex(iso)), title: '', type: '' }
    },
  }
}

/** Every non-working date in [from, to] — what the Gantt shades. */
export function nonWorkingDays(calendar, from, to) {
  const out = []
  for (let i = dayIndex(from); i <= dayIndex(to); i++) {
    const iso = fromDayIndex(i)
    if (!calendar.isWorkDay(iso)) out.push(iso)
  }
  return out
}
