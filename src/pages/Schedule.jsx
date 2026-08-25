import { useCallback, useEffect, useMemo, useState } from 'react'
import { useJob } from '../context/JobContext'
import { useSchedule } from '../hooks/useSchedule'
import { colorHex } from '../data/scheduleColors'
import {
  addDays, toISODate, fmtDate, fmtDateShort, weekdayIndex, todayIso,
  addMonths, firstOfMonth, lastOfMonth, startOfWeek,
} from '../lib/dates'
import ScheduleItemModal from '../components/ScheduleItemModal'
import AssistantPanel from '../components/AssistantPanel'
import GanttChart from '../components/GanttChart'
import WorkdayExceptions from '../components/WorkdayExceptions'
import BaselineView from '../components/BaselineView'
import * as workdayApi from '../api/workdayApi'
import * as baselineApi from '../api/baselineApi'
import { buildWorkCalendar } from '../lib/workCalendar'
import { findConflicts } from '../lib/conflicts'
import { subsVendors } from '../data/subsVendors'

// Tabs (Schedule/Baseline/Workday Exceptions), view toggle (Calendar/List/
// Gantt), toolbar (gear/undo/Schedule Offline/More Actions/Filter/New
// Schedule Item), and month calendar grid with colored bars + "+N more"
// overflow copied from the live /app/Schedules/0 page. Clicking a bar/row
// opens the real Schedule Item edit modal (ScheduleItemModal.jsx); "+ New
// Schedule Item" opens it blank. Both create/edit/delete/copy actually
// mutate this page's state, matching the real Save/Copy/Delete flow.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
// BT's calendar scales, in the order its dropdown lists them.
const SCALES = ['Month', 'Week', 'Day', 'Agenda']

/** The month grid, padded out to whole Sunday-Saturday weeks. */
function buildMonthGrid(anchor) {
  const last = lastOfMonth(anchor)
  const weeks = []
  let d = startOfWeek(firstOfMonth(anchor))
  while (d <= last) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(d)
      d = addDays(d, 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** One Sunday-Saturday week containing `anchor`, shaped like a month grid. */
function buildWeek(anchor) {
  const start = startOfWeek(anchor)
  return [Array.from({ length: 7 }, (_, i) => addDays(start, i))]
}

/** How far one press of the chevrons moves, per scale. */
function stepAnchor(anchor, scale, dir) {
  if (scale === 'Day') return addDays(anchor, dir)
  if (scale === 'Week') return addDays(anchor, dir * 7)
  return addMonths(anchor, dir) // Month and Agenda both page by month
}

/**
 * The nav row's label. BT writes the month with a comma ("November, 2024"),
 * which reads like a typo until you see it set in its own box.
 */
function rangeLabel(anchor, scale) {
  const [y, m, d] = anchor.split('-').map(Number)
  if (scale === 'Day') return `${WEEKDAYS_ABBR[weekdayIndex(anchor)]}, ${MONTHS[m - 1]} ${d}, ${y}`
  if (scale === 'Week') {
    const start = startOfWeek(anchor)
    return `${fmtDateShort(start)} – ${fmtDateShort(addDays(start, 6))}`
  }
  return `${MONTHS[m - 1]}, ${y}`
}

/**
 * One day cell in the Month or Week grid. `cap` is the "+N more" threshold,
 * and Infinity once Expand All is on.
 */
function DayCell({ iso, items, muted, cap, tall, onOpen }) {
  const shown = cap === Infinity ? items : items.slice(0, cap)
  const hidden = items.length - shown.length
  return (
    <div
      className={`border-r border-gray-15 p-1 last:border-r-0 ${tall ? 'min-h-64' : 'min-h-20'} ${
        muted ? 'bg-gray-5/50' : ''
      }`}
    >
      <div className={`text-xs ${muted ? 'text-gray-30' : 'text-gray-70'}`}>{Number(iso.slice(8))}</div>
      {shown.map((it) => (
        <button
          key={it.id}
          onClick={() => onOpen(it)}
          className="mt-1 block w-full truncate rounded-sm px-1 py-0.5 text-left text-[11px] text-white"
          style={{ backgroundColor: colorHex(it.color) }}
          title={it.title}
        >
          {it.title}
        </button>
      ))}
      {hidden > 0 && <div className="mt-0.5 text-[11px] text-brand-blue">+{hidden} more</div>}
    </div>
  )
}

export default function Schedule() {
  const { currentJob } = useJob()
  const {
    items, loading, error, writeError, clearWriteError,
    save, remove, copy, refresh, applyChanges, undo, lastChangeSet,
  } = useSchedule(currentJob?.id)
  const [view, setView] = useState('Calendar')
  const [tab, setTab] = useState('Schedule')
  // The calendar's scale and the date it is centred on. BT drives all four
  // scales off one anchor plus one pair of chevrons, so the anchor is the state
  // and the visible span is derived.
  const [scale, setScale] = useState('Month')
  const [anchor, setAnchor] = useState('2026-08-01') // August 2026, matching the captured screenshot
  // "Expand All" uncaps the per-day "+N more" overflow; the maximise control
  // takes the calendar full-screen. Both are BT nav-row affordances.
  const [expandAll, setExpandAll] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  // BT offers the Phases grouping on the List view as well as the Gantt.
  const [listPhases, setListPhases] = useState(false)
  const [online, setOnline] = useState(false)
  // BT keeps one page-level toolbar across all three tabs and swaps only its
  // tab-specific actions, so the primary button lives here rather than inside
  // each tab body. These counters/flags let it reach in.
  const [setBaselineSignal, setSetBaselineSignal] = useState(0)
  const [wxAdding, setWxAdding] = useState(false)
  // The job's working calendar, fetched so the browser derives dates the same
  // way the server does — otherwise the Gantt shades a hardcoded Mon-Fri while
  // the API cascades around real holidays.
  const [calendar, setCalendar] = useState(() => buildWorkCalendar())
  const loadCalendar = useCallback(() => {
    if (!currentJob?.id) return
    workdayApi
      .getCalendar(currentJob.id)
      .then((c) => setCalendar(buildWorkCalendar(c.workWeek, c.exceptions)))
      .catch(() => {})
  }, [currentJob?.id])
  useEffect(() => { loadCalendar() }, [loadCalendar])

  // A full-screen overlay has to be dismissible from the keyboard, or the only
  // way out is finding one button.
  useEffect(() => {
    if (!maximized) return
    const onKey = (e) => { if (e.key === 'Escape') setMaximized(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [maximized])

  // Baseline rows for the Gantt's Baseline toggle. Null until fetched; an
  // absent baseline is a normal state, so failures are silent.
  const [baselineRows, setBaselineRows] = useState([])
  useEffect(() => {
    if (!currentJob?.id) return
    baselineApi
      .getBaseline(currentJob.id)
      .then((d) => setBaselineRows((d.rows || []).filter((r) => r.baseline).map((r) => ({ itemId: r.itemId, ...r.baseline }))))
      .catch(() => setBaselineRows([]))
  }, [currentJob?.id, items])

  // Month and Week both render a grid of Sunday-Saturday weeks and differ only
  // in how many rows and how tall. Day and Agenda render their own way.
  const weeks = useMemo(
    () => (scale === 'Week' ? buildWeek(anchor) : buildMonthGrid(anchor)),
    [anchor, scale],
  )
  const anchorMonth = anchor.slice(0, 7)

  // List rows, optionally grouped under a phase header. Same shape the Gantt
  // uses for its own Phases toggle, so the two views group identically.
  const listRows = useMemo(() => {
    if (!listPhases) return items.map((it) => ({ type: 'item', item: it }))
    const byPhase = new Map()
    for (const it of items) {
      const key = it.phase || 'Unassigned'
      if (!byPhase.has(key)) byPhase.set(key, [])
      byPhase.get(key).push(it)
    }
    const out = []
    for (const [phase, group] of byPhase) {
      out.push({
        type: 'phase',
        phase,
        count: group.length,
        start: group.reduce((a, b) => (a < b.start ? a : b.start), group[0].start),
        end: group.reduce((a, b) => (a > b.end ? a : b.end), group[0].end),
      })
      for (const it of group) out.push({ type: 'item', item: it })
    }
    return out
  }, [items, listPhases])

  // Double-bookings: the same sub or assignee on overlapping work. BT surfaces
  // these as alerts with a per-contact tolerance; one overlap is the default.
  const conflicts = useMemo(
    () => findConflicts(items, {
      today: toISODate(new Date()),
      names: Object.fromEntries(subsVendors.map((s) => [s.id, s.name])),
    }),
    [items],
  )

  const itemsForDay = (iso) => items.filter((it) => it.start <= iso && iso <= it.end)

  // Agenda lists every item overlapping the anchored month, earliest first — a
  // flat chronology rather than a grid.
  const agendaRows = useMemo(() => {
    const from = firstOfMonth(anchor)
    const to = lastOfMonth(anchor)
    return items
      .filter((it) => it.start <= to && it.end >= from)
      .slice()
      .sort((a, b) => (a.start === b.start ? a.title.localeCompare(b.title) : a.start < b.start ? -1 : 1))
  }, [items, anchor])

  const openCreate = (afterItem) => {
    setEditingItem(
      afterItem
        ? { phase: afterItem.phase, start: addDays(afterItem.end, 1), end: addDays(afterItem.end, 1) }
        : null,
    )
    setModalOpen(true)
  }
  const openEdit = (it) => { setEditingItem(it); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingItem(null) }

  const handleSave = (form) => { save(form); closeModal() }
  const handleDelete = (it) => { remove(it); closeModal() }
  const handleCopy = (it) => { copy(it); closeModal() }

  if (!currentJob) return null

  return (
    <div className="p-4">
      <div className="text-xs text-gray-50">{currentJob.name}</div>
      <h1 className="text-xl font-bold text-gray-90">Schedule</h1>

      <div className="mt-3 flex gap-4 border-b border-gray-15 text-sm">
        {['Schedule', 'Baseline', 'Workday Exceptions'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 ${tab === t ? 'border-b-2 border-brand-blue font-semibold text-brand-blue' : 'text-gray-60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Page-level, on every tab — BT shows the offline warning on Baseline and
          Workday Exceptions too, not only on Schedule. */}
      {!online && (
        <div className="mt-3 rounded-sm bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          Your schedule is offline and is unavailable to subs and clients. Notifications will not be sent.
        </div>
      )}

      {/* One toolbar for all tabs. Only the view toggle, the actions menu and the
          primary button change with the tab. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {tab === 'Schedule' ? (
          <div className="flex gap-1 rounded-sm border border-gray-20 text-sm">
            {['Calendar', 'List', 'Gantt'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 ${view === v ? 'bg-gray-15 font-semibold' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : <div />}
        <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Settings">⚙</button>
          {tab === 'Schedule' && (
            <button className="rounded-sm border border-gray-20 px-2 py-1" title="History">↺</button>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-gray-70">
            <button
              type="button"
              role="switch"
              aria-checked={online}
              onClick={() => setOnline((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${online ? 'bg-brand-blue' : 'bg-gray-25'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${online ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            Schedule {online ? 'Online' : 'Offline'}
          </label>
          <button className="rounded-sm border border-gray-20 px-2 py-1">Learn More</button>
          {/* Baseline swaps More Actions for Export. */}
          <button className="rounded-sm border border-gray-20 px-2 py-1">
            {tab === 'Baseline' ? 'Export ▾' : 'More Actions ▾'}
          </button>
          <button className="rounded-sm border border-gray-20 px-2 py-1">▽ Filter</button>
          {tab === 'Schedule' && (
            <button
              onClick={() => setAssistantOpen(true)}
              className="rounded-sm border border-brand-blue px-3 py-1 font-semibold text-brand-blue"
            >
              ✨ AI Assistant
            </button>
          )}
          <button
            onClick={() => {
              if (tab === 'Baseline') setSetBaselineSignal((n) => n + 1)
              else if (tab === 'Workday Exceptions') setWxAdding(true)
              else openCreate()
            }}
            className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white"
          >
            {tab === 'Baseline' ? 'Set Baseline' : tab === 'Workday Exceptions' ? 'Add Workday Exception' : 'New Schedule Item'}
          </button>
        </div>
      </div>

      {tab === 'Baseline' ? (
        <BaselineView jobId={currentJob.id} setSignal={setBaselineSignal} />
      ) : tab === 'Workday Exceptions' ? (
        <WorkdayExceptions
          jobId={currentJob.id}
          adding={wxAdding}
          onAddingChange={setWxAdding}
          onChanged={() => { loadCalendar(); refresh() }}
        />
      ) : (
        <>
          {/* BT's nav row: scale select and Today on the left, the date
              stepper centred with its label in a bordered box, and the
              maximise + Expand All controls hard right.

              Calendar only. The List view has its own Phases toggle and the
              Gantt draws its own full timeline, so on those two every control
              here is inert — and an enabled dropdown that changes nothing is
              worse than no dropdown. */}
          {view === 'Calendar' && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              aria-label="Calendar scale"
              className="rounded-sm border border-gray-20 px-2 py-1"
            >
              {SCALES.map((sc) => <option key={sc} value={sc}>{sc}</option>)}
            </select>
            <button onClick={() => setAnchor(todayIso())} className="px-2 py-1 text-gray-70">
              Today
            </button>

            <div className="mx-auto flex items-center gap-2">
              <button
                onClick={() => setAnchor((a) => stepAnchor(a, scale, -1))}
                aria-label="Previous"
                className="px-1 text-gray-60"
              >
                ‹
              </button>
              <div className="min-w-44 rounded-sm border border-gray-20 px-3 py-1 text-center font-semibold text-gray-90">
                {rangeLabel(anchor, scale)}
              </div>
              <button
                onClick={() => setAnchor((a) => stepAnchor(a, scale, 1))}
                aria-label="Next"
                className="px-1 text-gray-60"
              >
                ›
              </button>
            </div>

            <button
              onClick={() => setMaximized(true)}
              aria-label="Full screen"
              title="Full screen"
              className="px-2 py-1 text-gray-60"
            >
              ⛶
            </button>
            {/* Agenda and Day are already flat lists, so there is nothing to
                expand — BT greys the control rather than hiding it. */}
            <button
              onClick={() => setExpandAll((v) => !v)}
              disabled={scale === 'Agenda' || scale === 'Day'}
              className="px-2 py-1 text-brand-blue disabled:text-gray-30"
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          )}

          {conflicts.length > 0 && (
            <div className="mt-3 rounded-sm bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              <div className="font-semibold">
                {conflicts.length} schedule conflict{conflicts.length === 1 ? '' : 's'}
              </div>
              <ul className="mt-1 space-y-0.5">
                {conflicts.slice(0, 4).map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.resourceName}</span> is booked on{' '}
                    {c.items[0].title} and {c.items[1].title} — both running{' '}
                    {fmtDateShort(c.overlapStart)}
                    {c.overlapStart !== c.overlapEnd && `–${fmtDateShort(c.overlapEnd)}`}
                  </li>
                ))}
                {conflicts.length > 4 && <li>and {conflicts.length - 4} more</li>}
              </ul>
            </div>
          )}

          {writeError && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              <span>Couldn't save that change: {writeError}</span>
              <button onClick={clearWriteError} className="shrink-0 font-semibold underline">Dismiss</button>
            </div>
          )}

          {lastChangeSet && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm bg-info-bg px-3 py-2 text-sm text-gray-80">
              <span>
                {lastChangeSet.reason || 'Schedule updated'} — moved{' '}
                {lastChangeSet.counts.direct + lastChangeSet.counts.cascade} item
                {lastChangeSet.counts.direct + lastChangeSet.counts.cascade === 1 ? '' : 's'}
                {lastChangeSet.counts.cascade > 0 && ` (${lastChangeSet.counts.cascade} downstream)`}
                {lastChangeSet.projectEnd.before !== lastChangeSet.projectEnd.after
                  ? `, finish now ${fmtDateShort(lastChangeSet.projectEnd.after)}`
                  : ', finish date unchanged'}
              </span>
              <button
                onClick={() => undo(lastChangeSet.id).catch(() => {})}
                className="shrink-0 font-semibold text-brand-blue underline"
              >
                Undo
              </button>
            </div>
          )}

          {loading && <div className="mt-3 text-sm text-gray-50">Loading schedule…</div>}
          {error && (
            <div className="mt-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              Couldn't load the schedule: {error}
            </div>
          )}

          {!loading && !error && view === 'Calendar' && (
            <div
              className={
                maximized
                  ? 'fixed inset-0 z-40 overflow-auto bg-white p-4'
                  : 'mt-3'
              }
            >
              {maximized && (
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-semibold text-gray-90">
                    {currentJob.name} · {rangeLabel(anchor, scale)}
                  </div>
                  <button
                    onClick={() => setMaximized(false)}
                    className="rounded-sm border border-gray-20 px-2 py-1 text-sm text-gray-70"
                  >
                    Exit full screen
                  </button>
                </div>
              )}

              {/* Agenda: a flat chronology of the anchored month. */}
              {scale === 'Agenda' && (
                <div className="overflow-hidden rounded-md border border-gray-15 bg-white">
                  {agendaRows.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-gray-50">
                      Nothing scheduled in {rangeLabel(anchor, 'Month')}.
                    </div>
                  ) : (
                    agendaRows.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => openEdit(it)}
                        className="flex w-full items-center gap-3 border-b border-gray-15 px-3 py-2 text-left last:border-b-0 hover:bg-gray-5"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: colorHex(it.color) }}
                        />
                        <span className="w-44 shrink-0 text-xs tabular-nums text-gray-60">
                          {fmtDate(it.start)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-90">{it.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-gray-50">
                          {fmtDateShort(it.start)} – {fmtDateShort(it.end)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Day: one column, everything on the anchored date. */}
              {scale === 'Day' && (
                <div className="overflow-hidden rounded-md border border-gray-15 bg-white">
                  <div className="border-b border-gray-15 bg-gray-5 px-3 py-1 text-xs font-semibold text-gray-60">
                    {WEEKDAYS[weekdayIndex(anchor)]}
                  </div>
                  {itemsForDay(anchor).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-gray-50">
                      Nothing scheduled on {fmtDate(anchor)}.
                    </div>
                  ) : (
                    itemsForDay(anchor).map((it) => (
                      <button
                        key={it.id}
                        onClick={() => openEdit(it)}
                        className="flex w-full items-center gap-3 border-b border-gray-15 px-3 py-2 text-left last:border-b-0 hover:bg-gray-5"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: colorHex(it.color) }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-90">{it.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-gray-50">
                          {fmtDateShort(it.start)} – {fmtDateShort(it.end)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Month and Week: the same Sunday-Saturday grid. Week shows the
                  date beside each weekday name, since one row of seven cells
                  gives no other clue which week you are looking at. */}
              {(scale === 'Month' || scale === 'Week') && (
                <div className="overflow-hidden rounded-md border border-gray-15 bg-white">
                  <div className="grid grid-cols-7 border-b border-gray-15 bg-gray-5 text-xs font-semibold text-gray-60">
                    {WEEKDAYS.map((w, i) => (
                      <div key={w} className="px-2 py-1">
                        {scale === 'Week' ? `${w} ${Number(weeks[0][i].slice(8))}` : w}
                      </div>
                    ))}
                  </div>
                  {weeks.map((week) => (
                    <div key={week[0]} className="grid grid-cols-7 border-b border-gray-15 last:border-b-0">
                      {week.map((iso) => (
                        <DayCell
                          key={iso}
                          iso={iso}
                          items={itemsForDay(iso)}
                          // Week view has no "outside the month" concept.
                          muted={scale === 'Month' && iso.slice(0, 7) !== anchorMonth}
                          cap={expandAll ? Infinity : scale === 'Week' ? 8 : 2}
                          tall={scale === 'Week'}
                          onOpen={openEdit}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && view === 'List' && (
            <>
            <div className="mt-3 flex items-center justify-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-70">
                <button
                  type="button"
                  role="switch"
                  aria-checked={listPhases}
                  onClick={() => setListPhases((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${listPhases ? 'bg-brand-blue' : 'bg-gray-25'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${listPhases ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                Phases
              </label>
            </div>
            <div className="mt-2 overflow-x-auto rounded-md border border-gray-15 bg-white">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b border-gray-15 bg-gray-5 text-left text-xs font-semibold text-gray-60">
                  <tr>
                    <th className="w-8 px-3 py-2"><input type="checkbox" /></th>
                    <th className="px-3 py-2">ID #</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Complete</th>
                    <th className="px-3 py-2">Phase</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Assigned To</th>
                    <th className="px-3 py-2">Accepted</th>
                    <th className="px-3 py-2">Pending</th>
                    <th className="px-3 py-2">Declined</th>
                    <th className="px-3 py-2">Files</th>
                    <th className="px-3 py-2">Comments</th>
                    <th className="px-3 py-2">RFIs</th>
                    <th className="px-3 py-2">Show Client</th>
                    <th className="px-3 py-2">Predecessors</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={17} className="px-3 py-6 text-center text-gray-50">No schedule items yet.</td></tr>
                  ) : listRows.map((row, i) => {
                    if (row.type === 'phase') {
                      return (
                        <tr key={`ph-${row.phase}`} className="border-b border-gray-15 bg-gray-5">
                          <td colSpan={17} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-70">
                            {row.phase}
                            <span className="ml-2 font-normal normal-case tracking-normal text-gray-50">
                              {row.count} item{row.count === 1 ? '' : 's'} · {fmtDateShort(row.start)} – {fmtDateShort(row.end)}
                            </span>
                          </td>
                        </tr>
                      )
                    }
                    const it = row.item
                    const preds = (it.predecessorIds || []).map((pid) => items.find((x) => x.id === pid)?.title).filter(Boolean)
                    return (
                      <tr key={it.id} className="border-t border-gray-15 hover:bg-gray-5">
                        <td className="px-3 py-2"><input type="checkbox" /></td>
                        <td className="px-3 py-2 text-gray-50">{i + 1}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => openEdit(it)} className="flex items-center gap-2 text-left text-brand-blue hover:underline">
                            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorHex(it.color) }} />
                            <span className="truncate">{it.title}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ background: `conic-gradient(var(--color-brand-blue) ${it.progress * 3.6}deg, var(--color-gray-15) 0deg)` }}
                            />
                            {it.progress}%
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-60">{it.phase === 'Unassigned' ? '--' : it.phase}</td>
                        <td className="px-3 py-2 text-gray-60">{it.workDays} day{it.workDays === 1 ? '' : 's'}</td>
                        <td className="px-3 py-2">{it.start}</td>
                        <td className="px-3 py-2">{it.end}</td>
                        <td className="px-3 py-2 text-gray-60">{it.assignees || '--'}</td>
                        <td className="px-3 py-2 text-brand-blue">0</td>
                        <td className="px-3 py-2 text-brand-blue">0</td>
                        <td className="px-3 py-2 text-brand-blue">0</td>
                        <td className="px-3 py-2 text-brand-blue">0</td>
                        <td className="px-3 py-2 text-brand-blue">0</td>
                        <td className="px-3 py-2 text-brand-blue">0</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => save({ ...it, showClient: !it.showClient })}
                            title={it.showClient ? 'Visible to client' : 'Hidden from client'}
                            className={it.showClient ? 'text-gray-70' : 'text-gray-25'}
                          >
                            {it.showClient ? '👁' : '—'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-60">{preds.length ? preds.join(', ') : '--'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-gray-15 px-3 py-2 text-xs text-gray-50">
                <select className="rounded-sm border border-gray-20 px-2 py-1" defaultValue="Standard View">
                  <option>Standard View</option>
                </select>
                <span>1-{items.length} of {items.length} items</span>
              </div>
            </div>
            </>
          )}

          {!loading && !error && view === 'Gantt' && (
            <div className="mt-3">
              {items.length === 0 ? (
                <div className="rounded-md border border-gray-15 bg-white py-6 text-center text-sm text-gray-50">No schedule items yet.</div>
              ) : (
                <GanttChart items={items} onUpdateItem={save} onCreateItem={openCreate} onApplyChanges={applyChanges} calendar={calendar} baseline={baselineRows} />
              )}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <ScheduleItemModal
          item={editingItem}
          jobSubIds={currentJob.subIds}
          allItems={items}
          onSave={handleSave}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onClose={closeModal}
        />
      )}

      {assistantOpen && (
        <AssistantPanel jobId={currentJob.id} onClose={() => setAssistantOpen(false)} onChanged={refresh} />
      )}
    </div>
  )
}
