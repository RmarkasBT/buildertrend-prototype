// Formatting helpers shared by the Daily Logs list, detail and form.

// parseLogDate/todayIso used to live here — the one place in the app that got
// bare-date parsing right. They now live in ./dates.js alongside the rest of
// the date math (which had the opposite bug), and are re-exported under the
// original names so the daily-log call sites don't churn.
import { parseISODate as parseLogDate, todayIso } from './dates.js'

export { parseLogDate, todayIso }

const SHORT = { weekday: 'short', month: 'short', day: 'numeric' }
const LONG = { weekday: 'long', month: 'long', day: 'numeric' }

export const shortDate = (iso) => parseLogDate(iso).toLocaleDateString('en-US', SHORT)
export const longDate = (iso) => parseLogDate(iso).toLocaleDateString('en-US', LONG)

// The live list card's heading is the short and long form separated by a
// pipe ("Wed, Aug 19 | Wednesday, August 19"). A log with a custom title
// shows that instead, with the date underneath.
export const cardDateLabel = (iso) => `${shortDate(iso)} | ${longDate(iso)}`

export const initials = (name) =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

// The live card shows one audience chip. Private wins outright; otherwise
// the audiences are listed in the same order the form's checkboxes appear.
export function shareLabel(log) {
  if (log.isPrivate) return 'Private'
  const audiences = []
  if (log.shareInternal) audiences.push('Internal')
  if (log.shareSubs) audiences.push('Subs/Vendors')
  if (log.shareClient) audiences.push('Client')
  return audiences.join(', ') || 'Internal'
}

export function relativeTime(isoTimestamp) {
  const then = new Date(isoTimestamp)
  const minutes = Math.round((Date.now() - then.getTime()) / 60000)
  // Negative means the timestamp is ahead of the clock (a log dated later
  // today, or a clock skew). "in 3h ago" would be nonsense, so fall through
  // to the absolute date instead.
  if (minutes < 0) return then.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// The Notes body is a single free-text field, but the default template gives
// it "Progress:" / "Issues:" / "Materials Delivered:" headings. Splitting on
// those lets the detail page lay them out as labelled sections the way the
// live view does, while leaving fully custom notes as one untitled block.
const HEADINGS = ['Progress:', 'Issues:', 'Materials Delivered:']

export function splitNoteSections(notes) {
  const text = String(notes ?? '')
  const found = HEADINGS.filter((h) => text.includes(h))
  if (found.length === 0) return [{ heading: null, body: text.trim() }]

  const pattern = new RegExp(`^(${HEADINGS.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gm')
  const sections = []
  let match
  let lastHeading = null
  let lastIndex = 0

  while ((match = pattern.exec(text)) !== null) {
    if (lastHeading !== null || text.slice(lastIndex, match.index).trim()) {
      sections.push({ heading: lastHeading, body: text.slice(lastIndex, match.index).trim() })
    }
    lastHeading = match[1].replace(/:$/, '')
    lastIndex = match.index + match[1].length
  }
  sections.push({ heading: lastHeading, body: text.slice(lastIndex).trim() })
  return sections
}
