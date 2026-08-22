// The schedule dependency engine: CPM analysis, cycle detection, and the
// cascade that shifts downstream work when a date moves.
//
// Lives in src/lib/ rather than server/ so it is literally ONE implementation
// shared by every caller, not two that agree by convention:
//   - GanttChart.jsx        imports it directly (synchronous, in-render, so a
//                           drag can preview the ripple without a round-trip)
//   - server/routes.js      imports it for validation and transactional apply
//   - server/index.js       exposes it as POST /api/schedule/cascade-preview,
//                           which is how the Python agents reach it instead of
//                           reimplementing CPM
// Node runs raw ESM here and Vite only bundles what main.jsx reaches, so a
// plain no-JSX module under src/lib/ is importable from both sides with no
// build changes (same trick server/mcp.js uses for src/data/jobs.js).
//
// DEPENDENCY MODEL: finish-to-start only. `predecessorIds` on an item lists
// items that must FINISH before it starts. Gaps in the current dates are read
// as intentional lag and preserved.
//
// DURATION IS IN WORK DAYS; POSITION IS IN CALENDAR DAYS. `workDays` means
// working days — verified against the fixtures, where business-day math
// reproduces 11 of the 12 stored end dates exactly (the 12th ends on a
// Saturday and is simply a malformed fixture). So a 7-work-day task starting
// Mon Aug 3 ends Tue Aug 11, spans 9 calendar days on the chart, and a 2-day
// weather delay across a weekend correctly lands 4 calendar days later.
//
// The `calendar` option defaults to WEEKDAYS_ONLY and is the seam for per-job
// work weeks and holidays — i.e. the Schedule page's stubbed "Workday
// Exceptions" tab. Pass ALL_DAYS for a seven-day operation.

// NOTE the explicit .js extension, here and in every other src/lib module:
// Vite resolves extensionless imports but raw Node ESM does not, and server/
// imports this file directly. Extensionless works in the browser and breaks
// the API server.
import {
  addDays,
  dayIndex,
  fromDayIndex,
  maxISO,
  WEEKDAYS_ONLY,
  ALL_DAYS,
  endFromWorkDays,
  workDaysBetween,
  workDayGap,
  addWorkDays,
  nextWorkDay,
} from './dates.js'

export { WEEKDAYS_ONLY, ALL_DAYS }

/** Duration in WORK days, honoring `end = start + workDays - 1` in work days. */
export function itemDuration(item, calendar = WEEKDAYS_ONLY) {
  const declared = Number(item.workDays) || 0
  if (declared > 0) return Math.trunc(declared)
  if (item.start && item.end) return Math.max(1, workDaysBetween(item.start, item.end, calendar))
  return 1
}

/**
 * Calendar days consumed by `workDays` working days ENDING at `end` — the
 * backward-pass counterpart of endFromWorkDays. Walks back until it has seen
 * that many working days.
 */
function spanForDuration(end, workDays, calendar) {
  const n = Math.max(1, workDays)
  if (n <= 1) return 1
  let seen = calendar.isWorkDay(end) ? 1 : 0
  let span = 1
  for (let guard = 0; seen < n && guard < 4000; guard++) {
    span++
    if (calendar.isWorkDay(addDays(end, -(span - 1)))) seen++
  }
  return span
}

/**
 * Adjacency in both directions, with unresolvable edges dropped.
 *
 * Self-edges and predecessors that don't exist in `items` are filtered out
 * rather than throwing — an item whose predecessor was deleted should still
 * schedule, it just has one fewer constraint. Cross-job ids are caught by
 * validation at the write boundary, not here.
 */
export function buildGraph(items) {
  const byId = new Map(items.map((it) => [it.id, it]))
  const preds = new Map(items.map((it) => [it.id, []]))
  const succs = new Map(items.map((it) => [it.id, []]))

  for (const it of items) {
    for (const pid of it.predecessorIds || []) {
      if (pid === it.id) continue
      if (!byId.has(pid)) continue
      preds.get(it.id).push(pid)
      succs.get(pid).push(it.id)
    }
  }
  return { byId, preds, succs }
}

/**
 * Kahn topological order. Returns `{ order, cycleIds }` — if the graph has a
 * cycle, `order` is the acyclic prefix and `cycleIds` names one concrete cycle.
 *
 * This is the bug the old inline CPM had: it ran Kahn and then used the result
 * without checking `order.length`, so items inside a cycle silently vanished
 * from the critical-path set with no error at all, while the Gantt happily drew
 * arrows for the edges CPM had ignored.
 */
export function topoSort(items) {
  const { preds, succs } = buildGraph(items)
  const indeg = new Map(items.map((it) => [it.id, preds.get(it.id).length]))
  const queue = items.filter((it) => indeg.get(it.id) === 0).map((it) => it.id)
  const order = []

  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    order.push(id)
    for (const sid of succs.get(id)) {
      indeg.set(sid, indeg.get(sid) - 1)
      if (indeg.get(sid) === 0) queue.push(sid)
    }
  }

  if (order.length === items.length) return { order, cycleIds: null }
  return { order, cycleIds: findCycle(items, new Set(order)) }
}

/** Walk the residual (non-ordered) subgraph to name one actual cycle. */
function findCycle(items, ordered) {
  const { succs } = buildGraph(items)
  const remaining = items.filter((it) => !ordered.has(it.id)).map((it) => it.id)
  const inStack = new Map()

  const walk = (id, stack) => {
    if (inStack.has(id)) return [...stack.slice(inStack.get(id)), id]
    inStack.set(id, stack.length)
    stack.push(id)
    for (const sid of succs.get(id) || []) {
      if (ordered.has(sid)) continue
      const hit = walk(sid, stack)
      if (hit) return hit
    }
    stack.pop()
    inStack.delete(id)
    return null
  }

  for (const id of remaining) {
    const hit = walk(id, [])
    if (hit) return hit
  }
  return remaining
}

/** Convenience: one cycle in the current graph, or null. */
export function detectCycle(items) {
  return topoSort(items).cycleIds
}

/**
 * Would setting `itemId`'s predecessors to `nextPredecessorIds` close a loop?
 * Returns a naming cycle path, or null. Used at the write boundary so the DB
 * can never reach a cyclic state (the Gantt's link-drag and the agent's update
 * tool both go through this).
 */
export function wouldCreateCycle(items, itemId, nextPredecessorIds) {
  const probe = items.map((it) =>
    it.id === itemId ? { ...it, predecessorIds: [...(nextPredecessorIds || [])] } : it,
  )
  return detectCycle(probe)
}

/**
 * Date-anchored CPM. Unlike the previous inline version — which worked in
 * unitless offsets from an implicit t=0 and so could say *that* something was
 * critical but never *when* anything happened — every value here is a real
 * epoch day index, so callers get dates back.
 *
 * Roots are anchored at their own scheduled start (rather than a common zero),
 * which is the useful reading for an existing schedule: float answers "how far
 * could this slip before it hurts the finish date".
 */
export function analyze(items, opts = {}) {
  const calendar = opts.calendar || WEEKDAYS_ONLY

  const { byId, preds, succs } = buildGraph(items)
  const { order, cycleIds } = topoSort(items)
  if (cycleIds) return { ok: false, error: 'cycle', cycleIds, nodes: new Map() }

  const ES = new Map()
  const EF = new Map()

  // Forward pass. Positions are calendar day indices so results are real dates,
  // but each item's finish is derived through the work calendar — otherwise a
  // 5-day task starting Thursday would be reported as finishing on Monday
  // rather than the following Wednesday.
  for (const id of order) {
    const it = byId.get(id)
    const own = dayIndex(it.start)
    // A successor can start no earlier than the next WORKING day after its
    // predecessor finishes.
    const gated = preds.get(id).map((pid) => dayIndex(nextWorkDay(addDays(fromDayIndex(EF.get(pid)), 1), calendar)))
    const es = gated.length ? Math.max(own, ...gated) : own
    ES.set(id, es)
    EF.set(id, dayIndex(endFromWorkDays(fromDayIndex(es), itemDuration(it, calendar), calendar)))
  }

  const projectEndIndex = order.length ? Math.max(...order.map((id) => EF.get(id))) : 0

  // Backward pass. Latest start walks the duration back through the work
  // calendar, mirroring the forward pass.
  const LS = new Map()
  const LF = new Map()
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]
    const out = succs.get(id)
    const lf = out.length ? Math.min(...out.map((sid) => LS.get(sid) - 1)) : projectEndIndex
    LF.set(id, lf)
    LS.set(id, lf - spanForDuration(fromDayIndex(lf), itemDuration(byId.get(id), calendar), calendar) + 1)
  }

  const nodes = new Map()
  for (const id of order) {
    const out = succs.get(id)
    const totalFloat = LS.get(id) - ES.get(id)
    // Free float: how far this can slip without moving any successor at all.
    const freeFloat = out.length
      ? Math.min(...out.map((sid) => ES.get(sid) - 1 - EF.get(id)))
      : totalFloat
    const hasEdge = preds.get(id).length > 0 || out.length > 0
    nodes.set(id, {
      id,
      es: fromDayIndex(ES.get(id)),
      ef: fromDayIndex(EF.get(id)),
      ls: fromDayIndex(LS.get(id)),
      lf: fromDayIndex(LF.get(id)),
      totalFloat,
      freeFloat: Math.max(0, freeFloat),
      // Isolated items are never "critical" — with no dependency edge, calling
      // them critical is noise rather than information.
      critical: hasEdge && totalFloat <= 0,
    })
  }

  return {
    ok: true,
    nodes,
    order,
    projectEnd: fromDayIndex(projectEndIndex),
    criticalIds: order.filter((id) => nodes.get(id).critical),
  }
}

/**
 * Ids on the critical path. Kept as a named export because this is what the
 * Gantt's Critical Path toggle consumed when the implementation lived inline
 * in GanttChart.jsx; now both it and the cascade share one graph.
 */
export function computeCriticalIds(items) {
  const res = analyze(items)
  return new Set(res.ok ? res.criticalIds : [])
}

function projectEndOf(items) {
  return items.reduce((acc, it) => (acc ? maxISO(acc, it.end) : it.end), '')
}

/**
 * Shift work and ripple the consequences downstream.
 *
 * @param items    current schedule items (wire shape, camelCase)
 * @param requests [{ itemId, shiftDays }] or [{ itemId, start, workDays? }]
 * @param opts     { mode: 'rigid'|'float-aware', today, calendar }
 *
 * MODE — 'rigid' (the default, and what this product wants): a successor moves
 * by the full delta, preserving whatever gap it already had. Predictable, and
 * it keeps a deliberately-sequenced chain sequenced.
 *   - Lag is measured from the PRE-cascade dates, so intentional slack survives
 *     a shift instead of being collapsed to zero.
 *   - Forward-only: a predecessor that gets shorter or moves earlier never
 *     drags its successors backward. Pulling work earlier is not something an
 *     impact approval should ever silently do.
 * 'float-aware' is the alternative reading — move a successor only once its
 * slack is actually consumed. Wired but not the default.
 *
 * Items marked complete are pinned: they do not move, and if the cascade wanted
 * to move one it is reported in `conflicts` rather than silently dropped, since
 * an engine that hides what it couldn't do is worse than one that refuses.
 */
export function cascade(items, requests = [], opts = {}) {
  const mode = opts.mode === 'float-aware' ? 'float-aware' : 'rigid'
  const today = opts.today || null
  const calendar = opts.calendar || WEEKDAYS_ONLY

  const { byId, preds } = buildGraph(items)

  const unknown = requests.map((r) => r.itemId).filter((id) => !byId.has(id))
  if (unknown.length) return { ok: false, error: 'unknown_item', unknownIds: unknown }

  const { order, cycleIds } = topoSort(items)
  if (cycleIds) return { ok: false, error: 'cycle', cycleIds }

  // Pre-cascade truth, used for lag and for from/to reporting.
  const orig = new Map(
    items.map((it) => [
      it.id,
      { start: it.start, end: it.end, workDays: itemDuration(it, calendar) },
    ]),
  )

  const next = new Map(orig)
  const directIds = new Set()
  const conflicts = []
  const warnings = []

  // Duration is in work days, so a moved item's end is re-derived through the
  // calendar rather than by sliding the old end by the same offset.
  const place = (start, workDays) => ({
    start,
    end: endFromWorkDays(start, workDays, calendar),
    workDays,
  })

  // 1. Explicit intent wins — apply requests without regard to float.
  //    `shiftDays` is a WORK-day shift, so "push out 2 days" on a Thursday
  //    lands on Monday rather than burning the delay on the weekend.
  for (const req of requests) {
    const before = orig.get(req.itemId)
    const workDays = Math.max(1, Number(req.workDays ?? before.workDays) || 1)
    const shift = Number(req.shiftDays) || 0
    const start =
      req.start != null
        ? req.start
        : shift === 0
          ? before.start
          : shift > 0
            ? addWorkDays(before.start, shift, calendar)
            : addDays(before.start, shift)
    next.set(req.itemId, place(start, workDays))
    directIds.add(req.itemId)
  }

  // 2. Sweep in dependency order so a predecessor is always resolved first.
  for (const id of order) {
    const item = byId.get(id)
    const before = orig.get(id)
    const predIds = preds.get(id)
    if (!predIds.length) continue

    if (directIds.has(id)) continue // an explicit request is never overridden

    // Two different readings of "when could this start", and the mode picks one:
    //   hard  = the bare finish-to-start constraint, gaps ignored
    //   rigid = that PLUS the gap this item originally had, so a deliberately
    //           sequenced chain keeps its spacing when it shifts
    let hard = -Infinity
    let rigid = -Infinity
    for (const pid of predIds) {
      const predEnd = next.get(pid).end
      // The earliest this could legally start: the next WORKING day after the
      // predecessor finishes.
      const soonest = dayIndex(nextWorkDay(addDays(predEnd, 1), calendar))
      // Lag measured in WORK days from the original schedule, so a Fri->Mon
      // handoff reads as zero slack rather than an intentional 2-day gap.
      const lag = workDayGap(orig.get(pid).end, before.start, calendar)
      hard = Math.max(hard, soonest)
      rigid = Math.max(rigid, dayIndex(addWorkDays(fromDayIndex(soonest), lag, calendar)))
    }
    if (hard === -Infinity) continue

    const ownStart = dayIndex(next.get(id).start)
    const targetIndex =
      mode === 'float-aware'
        // Move only once this item's own slack is genuinely used up.
        ? Math.max(ownStart, hard)
        // Forward-only: a predecessor moving earlier never drags this back.
        : Math.max(rigid, dayIndex(before.start))

    if (targetIndex <= ownStart) continue

    if (item.complete) {
      if (targetIndex > dayIndex(before.start)) {
        conflicts.push({
          itemId: id,
          title: item.title,
          reason: 'complete',
          wantedStart: fromDayIndex(targetIndex),
          currentStart: before.start,
        })
      }
      // Traversal continues past it using its UNCHANGED dates, so downstream
      // items with their own slack still resolve correctly.
      continue
    }

    next.set(id, place(fromDayIndex(targetIndex), next.get(id).workDays))

    if (today && Number(item.progress) > 0 && item.start <= today) {
      warnings.push({
        itemId: id,
        title: item.title,
        reason: 'in_progress',
        progress: Number(item.progress),
      })
    }
  }

  // 3. Diff.
  const changes = []
  for (const it of items) {
    const a = orig.get(it.id)
    const b = next.get(it.id)
    if (a.start === b.start && a.end === b.end && a.workDays === b.workDays) continue
    changes.push({
      itemId: it.id,
      title: it.title,
      role: directIds.has(it.id) ? 'direct' : 'cascade',
      from: a,
      to: b,
      deltaDays: dayIndex(b.start) - dayIndex(a.start),
    })
  }

  const before = projectEndOf(items)
  const after = changes.length
    ? items.reduce((acc, it) => maxISO(acc, next.get(it.id).end), '')
    : before

  const shifted = items.map((it) => ({ ...it, ...next.get(it.id) }))
  const post = analyze(shifted, { calendar })

  return {
    ok: true,
    mode,
    changes,
    conflicts,
    warnings,
    counts: {
      direct: changes.filter((c) => c.role === 'direct').length,
      cascade: changes.filter((c) => c.role === 'cascade').length,
    },
    projectEnd: {
      before,
      after,
      deltaDays: before && after ? dayIndex(after) - dayIndex(before) : 0,
    },
    criticalIds: post.ok ? post.criticalIds : [],
  }
}
