import { useCallback, useEffect, useMemo, useState } from 'react'
import { useJob } from '../context/JobContext'
import { useSchedule } from '../hooks/useSchedule'
import { colorHex } from '../data/scheduleColors'
import { addDays, toISODate, fmtDateShort } from '../lib/dates'
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

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  const weeks = []
  let cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor.getMonth() !== month && cursor.getDate() > 7) break
  }
  return weeks
}

export default function Schedule() {
  const { currentJob } = useJob()
  const {
    items, loading, error, writeError, clearWriteError,
    save, remove, copy, refresh, applyChanges, undo, lastChangeSet,
  } = useSchedule(currentJob?.id)
  const [view, setView] = useState('Calendar')
  const [tab, setTab] = useState('Schedule')
  const [monthOffset, setMonthOffset] = useState(0)
  const [editingItem, setEditingItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  // BT offers the Phases grouping on the List view as well as the Gantt.
  const [listPhases, setListPhases] = useState(false)
  const [online, setOnline] = useState(false)
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

  const base = new Date(2026, 7, 1) // August 2026, matching the captured screenshot
  const cursor = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)

  const weeks = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

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

  const itemsForDay = (day) => {
    const iso = toISODate(day)
    return items.filter((it) => it.start <= iso && iso <= it.end)
  }

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

      {tab === 'Baseline' ? (
        <BaselineView jobId={currentJob.id} />
      ) : tab === 'Workday Exceptions' ? (
        <WorkdayExceptions
          jobId={currentJob.id}
          onChanged={() => { loadCalendar(); refresh() }}
        />
      ) : tab !== 'Schedule' ? (
        <div className="mt-6 text-sm text-gray-50">No {tab.toLowerCase()} data yet.</div>
      ) : (
        <>
          {!online && (
            <div className="mt-3 rounded-sm bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              Your schedule is offline and is unavailable to subs and clients. Notifications will not be sent.
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
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
            <div className="flex items-center gap-2 text-sm">
              <button className="rounded-sm border border-gray-20 px-2 py-1" title="Settings">⚙</button>
              <button className="rounded-sm border border-gray-20 px-2 py-1" title="History">↺</button>
              {/* BT frames this positively as a "Schedule Online" toggle, not a
                  negative "Schedule Offline" checkbox. */}
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
                Schedule Online
              </label>
              <button className="rounded-sm border border-gray-20 px-2 py-1">More Actions ▾</button>
              <button className="rounded-sm border border-gray-20 px-2 py-1">▽ Filter</button>
              <button
                onClick={() => setAssistantOpen(true)}
                className="rounded-sm border border-brand-blue px-3 py-1 font-semibold text-brand-blue"
              >
                ✨ AI Assistant
              </button>
              <button onClick={openCreate} className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white">
                New Schedule Item
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => setMonthOffset((o) => o - 1)}>‹</button>
            <div className="font-semibold text-gray-90">
              {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => setMonthOffset((o) => o + 1)}>›</button>
            <button onClick={() => setMonthOffset(0)} className="ml-2 rounded-sm border border-gray-20 px-2 py-0.5 text-sm">
              Today
            </button>
          </div>

          {loading && <div className="mt-3 text-sm text-gray-50">Loading schedule…</div>}
          {error && (
            <div className="mt-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              Couldn't load the schedule: {error}
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

          {/* A rejected write used to fail silently — the bar just snapped back
              with no explanation. The server's message names the field or the
              dependency loop, so show it verbatim. */}
          {writeError && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              <span>Couldn't save that change: {writeError}</span>
              <button onClick={clearWriteError} className="shrink-0 font-semibold underline">Dismiss</button>
            </div>
          )}

          {/* One click reverts every item the last cascade touched. Undo has to
              be this reachable, or nobody risks a change that moves 9 bars. */}
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

          {!loading && !error && view === 'Calendar' && (
            <div className="mt-3 overflow-hidden rounded-md border border-gray-15 bg-white">
              <div className="grid grid-cols-7 border-b border-gray-15 bg-gray-5 text-xs font-semibold text-gray-60">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="px-2 py-1">{w}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-gray-15 last:border-b-0">
                  {week.map((day) => {
                    const dayItems = itemsForDay(day)
                    const inMonth = day.getMonth() === cursor.getMonth()
                    return (
                      <div key={day.toISOString()} className={`min-h-20 border-r border-gray-15 p-1 last:border-r-0 ${inMonth ? '' : 'bg-gray-5/50'}`}>
                        <div className={`text-xs ${inMonth ? 'text-gray-70' : 'text-gray-30'}`}>{day.getDate()}</div>
                        {dayItems.slice(0, 2).map((it) => (
                          <button
                            key={it.id}
                            onClick={() => openEdit(it)}
                            className="mt-1 block w-full truncate rounded-sm px-1 py-0.5 text-left text-[11px] text-white"
                            style={{ backgroundColor: colorHex(it.color) }}
                            title={it.title}
                          >
                            {it.title}
                          </button>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="mt-0.5 text-[11px] text-brand-blue">+{dayItems.length - 2} more</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
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
