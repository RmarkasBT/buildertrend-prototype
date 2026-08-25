// The one date module. Plain ESM, no JSX/DOM, so it's importable from both
// src/ (components) and server/ (node) — the same trick server/mcp.js and
// server/seed.js already use to import src/data/*.
//
// Every date in this app is a bare 'YYYY-MM-DD' calendar day with no time and
// no timezone: a schedule item starts on a day, not at an instant. So the
// arithmetic here is integer day-index math, never Date-object math. That
// avoids DST, avoids UTC-vs-local, and makes addDays exact.
//
// THE BUG THIS REPLACES: GanttChart.jsx and ScheduleItemModal.jsx each had
// their own copy mixing `new Date(iso + 'T00:00:00')` (LOCAL midnight) with
// `d.toISOString().slice(0, 10)` (UTC). East of Greenwich that round-trip
// loses a day, so addDays(iso, 1) returned `iso` — a silent no-op, and every
// derived end date landed a day early. Central Time (UTC-5/6) hid it, which
// is why it survived. src/lib/dailyLogFormat.js already documented the same
// hazard for its own parse; this is that fix, generalized.

const DAY_MS = 86400000

function parts(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) throw new Error(`Not a YYYY-MM-DD date: ${iso}`)
  return [y, m, d]
}

const pad2 = (n) => String(n).padStart(2, '0')

/** True for a well-formed 'YYYY-MM-DD' string that names a real calendar day. */
export function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false
  const [y, m, d] = String(value).split('-').map(Number)
  // Round-trip through Date.UTC to reject 2026-02-30 and friends.
  const t = Date.UTC(y, m - 1, d)
  const back = new Date(t)
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d
}

/**
 * Days since the epoch, as an integer. This is the canonical internal
 * representation for all date math — compare, add, and diff on these, then
 * convert back at the boundary with fromDayIndex.
 */
export function dayIndex(iso) {
  const [y, m, d] = parts(iso)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

/** Inverse of dayIndex. */
export function fromDayIndex(n) {
  const dt = new Date(n * DAY_MS)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM-DD' + n days -> 'YYYY-MM-DD'. Exact in every timezone. */
export function addDays(iso, n) {
  return fromDayIndex(dayIndex(iso) + n)
}

/**
 * INCLUSIVE span: how many calendar days the range [a, b] covers.
 * durationDays('2026-08-03', '2026-08-03') === 1.
 * This is the schedule's duration convention — it pairs with the invariant
 * `end === addDays(start, workDays - 1)` that the cascade engine maintains.
 */
export function durationDays(a, b) {
  return dayIndex(b) - dayIndex(a) + 1
}

/**
 * EXCLUSIVE offset: how far b sits from a.
 * offsetDays('2026-08-03', '2026-08-03') === 0.
 * This is the geometry convention — use it for pixel offsets on a timeline.
 *
 * The distinct name is the point: the old code had two functions both called
 * some variant of "diffDays" that differed by one, in two different files.
 */
export function offsetDays(a, b) {
  return dayIndex(b) - dayIndex(a)
}

/** Today as 'YYYY-MM-DD', from the local clock (a job site's "today"). */
export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 'YYYY-MM-DD' -> a LOCAL-midnight Date, for formatting only.
 * Deliberately not `new Date(iso)`: that parses a bare date as UTC midnight,
 * which renders as the previous day for anyone west of Greenwich — and every
 * job site in this app is Central Time.
 */
export function parseISODate(iso) {
  const [y, m, d] = parts(iso)
  return new Date(y, m - 1, d)
}

/** A local Date -> 'YYYY-MM-DD', using local getters (never toISOString). */
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// String comparison is correct for zero-padded ISO dates, so these need no
// parsing at all — but they're worth naming so call sites read as date logic.
export const minISO = (a, b) => (a < b ? a : b)
export const maxISO = (a, b) => (a > b ? a : b)
export const clampISO = (iso, lo, hi) => maxISO(lo, minISO(iso, hi))

/** 0 = Sunday .. 6 = Saturday. */
export function weekdayIndex(iso) {
  const [y, m, d] = parts(iso)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isWeekend(iso) {
  const w = weekdayIndex(iso)
  return w === 0 || w === 6
}

// --- calendar-month navigation ----------------------------------------------
// The Schedule calendar pages by month, week and day off a single anchor date.
// Month stepping is the only one that needs care, so it lives here with the
// rest of the date math rather than in the page.

/** Days in a 1-indexed month, e.g. daysInMonth(2024, 2) === 29. */
export function daysInMonth(year, month1) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate() // day 0 of the next month
}

/**
 * Add calendar months, clamping the day to the target month's length.
 *
 * Deliberately NOT `new Date(y, m + n, d)`: that rolls Jan 31 + 1 month into
 * Mar 2 or 3, so a month navigator built on it skips February entirely. A
 * calendar's Next button must land on Feb 29, and Jan 31 + 1 - 1 is allowed to
 * be lossy — that is what clamping means.
 */
export function addMonths(iso, n) {
  const [y, m, d] = parts(iso)
  const t = y * 12 + (m - 1) + Math.trunc(n)
  const ny = Math.floor(t / 12)
  const nm = (t % 12) + 1
  return `${ny}-${pad2(nm)}-${pad2(Math.min(d, daysInMonth(ny, nm)))}`
}

/** The 1st of the month containing `iso`. */
export const firstOfMonth = (iso) => `${iso.slice(0, 8)}01`

/** The last day of the month containing `iso`. */
export const lastOfMonth = (iso) => addDays(addMonths(firstOfMonth(iso), 1), -1)

/** The Sunday that starts the week containing `iso`. */
export const startOfWeek = (iso) => addDays(iso, -weekdayIndex(iso))

const MED = { month: 'short', day: 'numeric', year: 'numeric' }

/** 'Aug 3, 2026' */
export function fmtDate(iso) {
  return parseISODate(iso).toLocaleDateString('en-US', MED)
}

/** 'Aug 3' — for dense UI like Gantt bars and impact proposal rows. */
export function fmtDateShort(iso) {
  return parseISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Every day in [start, end], inclusive. */
export function eachDay(start, end) {
  const out = []
  for (let i = dayIndex(start); i <= dayIndex(end); i++) out.push(fromDayIndex(i))
  return out
}

// ---------------------------------------------------------------------------
// Work-day calendars
//
// `workDays` on a schedule item means WORKING days, not calendar days. That is
// not a guess: it's the field name captured from the real product ("Work
// Days"), it's why the real Schedule page has a "Workday Exceptions" tab, and
// it is what the seed fixtures encode — business-day math reproduces the stored
// end date of 11 of the 12 seeded items exactly, and the 12th has its end on a
// Saturday (a malformed fixture, since a task cannot finish on a non-work day).
//
// So: DURATION is counted in work days, POSITION is measured in calendar days.
// A 7-work-day task starting Mon Aug 3 ends Tue Aug 11 and visually spans 9
// calendar days on the Gantt — the bar covers the weekend it doesn't work.
//
// WEEKDAYS_ONLY is the default. The `calendar` parameter is the seam for
// per-job work weeks and holidays (the Workday Exceptions tab); anything
// implementing `isWorkDay(iso)` drops in.
// ---------------------------------------------------------------------------

/** Mon–Fri are working days. The default. */
export const WEEKDAYS_ONLY = { name: 'weekdays', isWorkDay: (iso) => !isWeekend(iso) }

/** Every day works — for jobs that genuinely run seven days. */
export const ALL_DAYS = { name: 'all-days', isWorkDay: () => true }

/** The first working day at or after `iso`. */
export function nextWorkDay(iso, calendar = WEEKDAYS_ONLY) {
  let cur = iso
  // Bounded so a pathological calendar that works no days can't spin forever.
  for (let guard = 0; guard < 400 && !calendar.isWorkDay(cur); guard++) cur = addDays(cur, 1)
  return cur
}

/** The last working day at or before `iso`. */
export function prevWorkDay(iso, calendar = WEEKDAYS_ONLY) {
  let cur = iso
  for (let guard = 0; guard < 400 && !calendar.isWorkDay(cur); guard++) cur = addDays(cur, -1)
  return cur
}

/**
 * Advance `n` working days forward from `iso`, landing on a working day.
 * n = 0 returns the first working day at or after `iso`.
 */
export function addWorkDays(iso, n, calendar = WEEKDAYS_ONLY) {
  let cur = nextWorkDay(iso, calendar)
  let remaining = Math.max(0, n)
  while (remaining > 0) {
    cur = addDays(cur, 1)
    if (calendar.isWorkDay(cur)) remaining--
  }
  return cur
}

/**
 * Step `n` working days from `iso` in either direction, landing on a working
 * day. n = 0 snaps to the nearest working day (forward, or backward for a
 * negative caller).
 *
 * The signed version exists for LEAD time: a dependency with a negative lag
 * lets a successor start before its predecessor finishes ("start painting a
 * day before the drywall is done"), which needs to walk the calendar backwards.
 */
export function stepWorkDays(iso, n, calendar = WEEKDAYS_ONLY) {
  const forward = n >= 0
  let cur = forward ? nextWorkDay(iso, calendar) : prevWorkDay(iso, calendar)
  let remaining = Math.abs(n)
  while (remaining > 0) {
    cur = addDays(cur, forward ? 1 : -1)
    if (calendar.isWorkDay(cur)) remaining--
  }
  return cur
}

/**
 * The end date of an item that starts at `start` and occupies `workDays`
 * working days, where the start day itself counts as the first.
 *
 * A 1-day item ends the day it starts — including a milestone parked on a
 * weekend (the seed has one on a Sunday), which is why this short-circuits
 * rather than snapping forward to Monday.
 */
export function endFromWorkDays(start, workDays, calendar = WEEKDAYS_ONLY) {
  const n = Math.max(1, Math.trunc(Number(workDays) || 1))
  if (n <= 1) return start
  // Day 1 is the start day when it works, otherwise the first working day
  // after it — and addWorkDays already snaps forward — so both cases advance
  // n-1 from `start`. (Subtracting a separate "did the start day count"
  // adjustment double-counted and overshot by a day on a weekend start.)
  return addWorkDays(start, n - 1, calendar)
}

/** Working days in [start, end] inclusive, with no fallback. */
function countWorkDays(start, end, calendar) {
  if (end < start) return 0
  let count = 0
  for (let i = dayIndex(start); i <= dayIndex(end); i++) {
    if (calendar.isWorkDay(fromDayIndex(i))) count++
  }
  return count
}

/**
 * Working days in [start, end] inclusive, as a DURATION.
 * Falls back to the calendar span when the range contains no working day at
 * all, so a milestone parked on a weekend reports 1 day rather than 0.
 */
export function workDaysBetween(start, end, calendar = WEEKDAYS_ONLY) {
  if (end < start) return 0
  return countWorkDays(start, end, calendar) || durationDays(start, end)
}

/**
 * Working days strictly between two dates — the slack a scheduler left.
 * Deliberately uses the no-fallback count: a successor starting the next
 * working day after its predecessor ends has a gap of 0, and the duration
 * fallback would have reported the intervening weekend as 2 days of slack.
 */
export function workDayGap(afterEnd, beforeStart, calendar = WEEKDAYS_ONLY) {
  if (beforeStart <= afterEnd) return 0
  return countWorkDays(addDays(afterEnd, 1), addDays(beforeStart, -1), calendar)
}
