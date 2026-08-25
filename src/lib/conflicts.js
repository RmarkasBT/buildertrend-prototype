// Schedule conflicts: the same sub or assignee booked on overlapping work.
//
// BT: "Schedule Conflicts help you avoid double-booking by alerting you when an
// internal user or sub/vendor is already assigned to overlapping schedule
// items", with a permission controlling how many overlaps are tolerated before
// it warns.
//
// Pure and dependency-free so the same detection serves the Schedule page, the
// API, and later the impact synthesizer — which already needs to know that
// pushing one trade onto another creates a clash.

import { dayIndex } from './dates.js'

/**
 * Two items overlap if their inclusive date ranges intersect at all.
 * Deliberately calendar-based, not working-day based: a sub double-booked
 * across a weekend is still double-booked on the Monday.
 */
function overlaps(a, b) {
  return dayIndex(a.start) <= dayIndex(b.end) && dayIndex(b.start) <= dayIndex(a.end)
}

/** The people and companies an item books. */
function resourcesOf(item) {
  const out = []
  for (const id of item.subIds || []) out.push({ kind: 'sub', id })
  // `assignees` is a single free-text field in this app, not a list — so it's
  // one resource, trimmed. Blank means nobody is booked.
  const who = String(item.assignees || '').trim()
  if (who) out.push({ kind: 'user', id: who })
  return out
}

/**
 * Find double-bookings.
 *
 * @param items      schedule items
 * @param opts.limit how many concurrent items a resource may hold before it
 *                   counts as a conflict. 1 (the default) means any overlap at
 *                   all. BT exposes this as a per-contact permission.
 * @param opts.today ISO date; items finishing before it are ignored, matching
 *                   BT's "if the schedule item(s) are in the past, you will not
 *                   receive a conflict notification".
 * @param opts.names optional id -> display name map for subs
 *
 * Returns one entry per conflicting PAIR rather than per resource, because the
 * actionable unit is "these two jobs clash", not "this sub is busy".
 */
export function findConflicts(items, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 1)
  const today = opts.today || null
  const names = opts.names || {}

  // Completed work can't clash — the crew already did it — and neither can
  // anything wholly in the past.
  const live = items.filter((it) => !it.complete && (!today || it.end >= today))

  const byResource = new Map()
  for (const it of live) {
    for (const r of resourcesOf(it)) {
      const key = `${r.kind}:${r.id}`
      if (!byResource.has(key)) byResource.set(key, { ...r, items: [] })
      byResource.get(key).items.push(it)
    }
  }

  const conflicts = []
  for (const [key, res] of byResource) {
    const list = res.items
    if (list.length < 2) continue
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (!overlaps(list[i], list[j])) continue
        // How many of this resource's items are live across the overlap. With
        // limit 1 any pair conflicts; a higher limit tolerates a crew that can
        // genuinely be in more than one place.
        const concurrent = list.filter((x) => overlaps(x, list[i]) && overlaps(x, list[j])).length
        if (concurrent <= limit) continue
        conflicts.push({
          resourceKey: key,
          kind: res.kind,
          resourceId: res.id,
          resourceName: res.kind === 'sub' ? names[res.id] || res.id : res.id,
          concurrent,
          items: [
            { id: list[i].id, title: list[i].title, start: list[i].start, end: list[i].end },
            { id: list[j].id, title: list[j].title, start: list[j].start, end: list[j].end },
          ],
          // The days they actually collide on — the part worth quoting.
          overlapStart: list[i].start > list[j].start ? list[i].start : list[j].start,
          overlapEnd: list[i].end < list[j].end ? list[i].end : list[j].end,
        })
      }
    }
  }

  return conflicts.sort((a, b) => (a.overlapStart < b.overlapStart ? -1 : 1))
}
