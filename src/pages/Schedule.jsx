import { useMemo, useState } from 'react'
import { useJob } from '../context/JobContext'
import { useSchedule } from '../hooks/useSchedule'
import { colorHex } from '../data/scheduleColors'
import ScheduleItemModal from '../components/ScheduleItemModal'

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

function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

export default function Schedule() {
  const { currentJob } = useJob()
  const { items, loading, error, save, remove, copy } = useSchedule(currentJob?.id)
  const [view, setView] = useState('Calendar')
  const [tab, setTab] = useState('Schedule')
  const [monthOffset, setMonthOffset] = useState(0)
  const [editingItem, setEditingItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const base = new Date(2026, 7, 1) // August 2026, matching the captured screenshot
  const cursor = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)

  const weeks = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const itemsForDay = (day) => {
    const iso = toISODate(day)
    return items.filter((it) => it.start <= iso && iso <= it.end)
  }

  const openCreate = () => { setEditingItem(null); setModalOpen(true) }
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

      {tab !== 'Schedule' ? (
        <div className="mt-6 text-sm text-gray-50">No {tab.toLowerCase()} data yet.</div>
      ) : (
        <>
          <div className="mt-3 rounded-sm bg-warning-bg px-3 py-2 text-sm text-warning-fg">
            Your schedule is offline and is unavailable to subs and clients. Notifications will not be sent.
          </div>

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
              <label className="flex items-center gap-1 text-gray-70">
                <input type="checkbox" defaultChecked readOnly /> Schedule Offline
              </label>
              <button className="rounded-sm border border-gray-20 px-2 py-1">More Actions ▾</button>
              <button className="rounded-sm border border-gray-20 px-2 py-1">▽ Filter</button>
              <button onClick={openCreate} className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white">
                + New Schedule Item
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
            <table className="mt-3 w-full rounded-md border border-gray-15 bg-white text-sm">
              <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Progress</th>
                  <th className="px-3 py-2">Complete</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-50">No schedule items yet.</td></tr>
                ) : items.map((it) => (
                  <tr key={it.id} className="cursor-pointer border-t border-gray-15 hover:bg-gray-5" onClick={() => openEdit(it)}>
                    <td className="px-3 py-2">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: colorHex(it.color) }} />
                      {it.title}
                    </td>
                    <td className="px-3 py-2">{it.start}</td>
                    <td className="px-3 py-2">{it.end}</td>
                    <td className="px-3 py-2">{it.progress}%</td>
                    <td className="px-3 py-2">{it.complete ? 'Yes' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !error && view === 'Gantt' && (
            <div className="mt-3 rounded-md border border-gray-15 bg-white p-3">
              {items.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-50">No schedule items yet.</div>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => {
                    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
                    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
                    const s = Math.max(0, (new Date(it.start) - monthStart) / 86400000)
                    const e = Math.min(daysInMonth, (new Date(it.end) - monthStart) / 86400000 + 1)
                    const left = (s / daysInMonth) * 100
                    const width = Math.max(((e - s) / daysInMonth) * 100, 2)
                    return (
                      <button key={it.id} onClick={() => openEdit(it)} className="flex w-full items-center gap-2 text-left">
                        <div className="w-56 truncate text-xs text-gray-70">{it.title}</div>
                        <div className="relative h-4 flex-1 rounded-sm bg-gray-10">
                          <div
                            className="absolute h-4 rounded-sm"
                            style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colorHex(it.color) }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <ScheduleItemModal
          item={editingItem}
          jobSubIds={currentJob.subIds}
          onSave={handleSave}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
