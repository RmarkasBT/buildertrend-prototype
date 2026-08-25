import { useEffect, useState } from 'react'
import Modal from './Modal'
import { scheduleColors, reminderOptions, phaseOptions } from '../data/scheduleColors'
import { subsVendors } from '../data/subsVendors'
import { endFromWorkDays, workDaysBetween, todayIso } from '../lib/dates'
import { wouldCreateCycle } from '../lib/cascade'
import * as scheduleApi from '../api/scheduleApi'
import { fmtDateShort } from '../lib/dates'

const TABS = ['Predecessors & Links', 'Phases & Tags', 'Viewing', 'Shifts', 'Notes']

// Layout (Complete toggle, Title/Display Color, Assignees, Start Date/Work
// Days/End Date, Hourly, Progress, Reminder, Phases & Tags / Viewing /
// Notes tabs, Created by/on footer, "..." Copy/Delete menu) copied from the
// real Schedule Item create + edit modals at /app/Schedules. Predecessors &
// Links is implemented: typed links (Finish-to-Start / Start-to-Start) with a
// lag in working days that may be negative for lead time, matching what
// Buildertrend documents. Files, Shifts, RFIs and Related Items were observed
// but are not implemented (flagged in CAPTURE_LOG.md), and Notes is simplified
// to a single field instead of the real All/Internal/Sub/Client split.
export default function ScheduleItemModal({ item, jobSubIds, allItems, onSave, onDelete, onCopy, onClose }) {
  const isEditing = Boolean(item?.id)
  const [form, setForm] = useState(() => ({
    title: item?.title ?? '',
    color: item?.color ?? 'Victoria',
    assignees: item?.assignees ?? '',
    start: item?.start ?? todayIso(),
    end: item?.end ?? todayIso(),
    workDays: item?.workDays ?? 1,
    hourly: item?.hourly ?? false,
    progress: item?.progress ?? 0,
    reminder: item?.reminder ?? 'None',
    complete: item?.complete ?? false,
    phase: item?.phase ?? 'Unassigned',
    tags: item?.tags ?? [],
    showOnGantt: item?.showOnGantt ?? true,
    showClient: item?.showClient ?? true,
    subIds: item?.subIds ?? [],
    // Typed links are canonical. An item that only carries the older bare id
    // list reads as finish-to-start with no lag, which is what that list meant.
    predecessors:
      item?.predecessors ?? (item?.predecessorIds ?? []).map((id) => ({ id, type: 'FS', lag: 0 })),
    notes: item?.notes ?? '',
  }))
  const [tab, setTab] = useState('Predecessors & Links')
  const [tagInput, setTagInput] = useState('')
  const [showRequired, setShowRequired] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkWarning, setLinkWarning] = useState(null)
  const [shifts, setShifts] = useState(null)

  // Loaded on demand: most opens of this modal never look at Shifts, and the
  // history grows for the life of the job.
  useEffect(() => {
    if (tab !== 'Shifts' || !item?.id || shifts !== null) return
    scheduleApi.listShifts(item.id).then(setShifts).catch(() => setShifts([]))
  }, [tab, item?.id, shifts])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Start / Work Days / End are three views of two facts, and "Work Days"
  // means WORKING days — so the end date skips weekends. Editing any one of
  // them re-derives the others through the work calendar.
  const onStartChange = (val) => {
    setField('start', val)
    setField('end', endFromWorkDays(val, form.workDays))
  }
  const onWorkDaysChange = (val) => {
    const days = Math.max(1, Number(val) || 1)
    setField('workDays', days)
    setField('end', endFromWorkDays(form.start, days))
  }
  const onEndChange = (val) => {
    setField('end', val)
    setField('workDays', Math.max(1, workDaysBetween(form.start, val)))
  }

  const availableSubs = subsVendors.filter((s) => (jobSubIds || []).includes(s.id))

  // --- Predecessors & Links -------------------------------------------------
  const linkable = (allItems || []).filter((i) => i.id !== item?.id)
  const byId = new Map((allItems || []).map((i) => [i.id, i]))

  const addLink = (id) => {
    // Check before adding rather than after saving: the server rejects a cycle
    // too, but only here can the loop be named in the user's own task titles.
    const next = [...form.predecessors, { id, type: 'FS', lag: 0 }]
    const loop = item?.id ? wouldCreateCycle(allItems || [], item.id, next) : null
    if (loop) {
      const titles = loop.map((lid) => byId.get(lid)?.title ?? lid)
      setLinkWarning(`That would make the schedule circular: ${titles.join(' → ')}`)
      return
    }
    setLinkWarning(null)
    setField('predecessors', next)
  }

  const setLink = (id, patch) => {
    setLinkWarning(null)
    setField('predecessors', form.predecessors.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const removeLink = (id) => {
    setLinkWarning(null)
    setField('predecessors', form.predecessors.filter((l) => l.id !== id))
  }

  // Plain-English echo of what the link actually means, so a lag of -1 isn't
  // something the user has to decode.
  const describeLink = (link, pred) => {
    const name = pred?.title ? `"${pred.title}"` : 'it'
    const days = Math.abs(link.lag) === 1 ? 'day' : 'days'
    if (link.type === 'SS') {
      if (link.lag === 0) return `Starts the same day ${name} starts`
      if (link.lag > 0) return `Starts ${link.lag} work ${days} after ${name} starts`
      return `Starts ${Math.abs(link.lag)} work ${days} before ${name} starts`
    }
    if (link.lag === 0) return `Starts the next work day after ${name} finishes`
    if (link.lag > 0) return `Waits ${link.lag} work ${days} after ${name} finishes`
    return `Starts ${Math.abs(link.lag)} work ${days} before ${name} finishes`
  }

  const handleSave = () => {
    if (!form.title.trim()) {
      setShowRequired(true)
      return
    }
    onSave({ ...item, ...form, id: item?.id })
  }

  return (
    <Modal
      title="Schedule Item"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-gray-50">
            {isEditing && item?.createdBy && (
              <>Created by {item.createdBy} on {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70">
              Cancel
            </button>
            {isEditing && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div className="absolute bottom-full right-0 mb-1 w-32 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                    <button
                      onClick={() => { setMenuOpen(false); onCopy(item) }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-gray-80 hover:bg-gray-5"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmingDelete(true) }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-danger-fg hover:bg-gray-5"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={handleSave} className="rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white">
              Save
            </button>
          </div>
        </div>
      }
    >
      {confirmingDelete ? (
        <div className="py-4 text-center">
          <div className="text-sm font-medium text-gray-90">Delete "{item.title}"?</div>
          <div className="mt-1 text-sm text-gray-50">This can't be undone.</div>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => setConfirmingDelete(false)} className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70">
              Cancel
            </button>
            <button
              onClick={() => onDelete(item)}
              className="rounded-sm bg-danger-fg px-3 py-1.5 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-gray-90">Schedule Item Details</h3>

          {isEditing && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-80">
              <input type="checkbox" checked={form.complete} onChange={(e) => setField('complete', e.target.checked)} />
              Complete
            </label>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Title *</label>
              <input
                value={form.title}
                onChange={(e) => { setField('title', e.target.value); setShowRequired(false) }}
                className={`w-full rounded-sm border px-2 py-1.5 text-sm ${showRequired ? 'border-danger-fg' : 'border-gray-20'}`}
              />
              {showRequired && <div className="mt-0.5 text-xs text-danger-fg">Required</div>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Display Color</label>
              <select
                value={form.color}
                onChange={(e) => setField('color', e.target.value)}
                className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              >
                {scheduleColors.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-60">Assignees</label>
            <input
              value={form.assignees}
              onChange={(e) => setField('assignees', e.target.value)}
              placeholder="Add an assignee"
              className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Start Date *</label>
              <input type="date" value={form.start} onChange={(e) => onStartChange(e.target.value)} className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Work {form.hourly ? 'Hours' : 'Days'} *</label>
              <input type="number" min="1" value={form.workDays} onChange={(e) => onWorkDaysChange(e.target.value)} className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">End Date *</label>
              <input type="date" value={form.end} onChange={(e) => onEndChange(e.target.value)} className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm" />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-80">
            <input type="checkbox" checked={form.hourly} onChange={(e) => setField('hourly', e.target.checked)} />
            Hourly
          </label>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-60">Progress</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={form.progress} onChange={(e) => setField('progress', Number(e.target.value))} className="flex-1" />
              <div className="flex items-center gap-1 text-sm">
                <input type="number" min="0" max="100" value={form.progress} onChange={(e) => setField('progress', Math.min(100, Math.max(0, Number(e.target.value))))} className="w-14 rounded-sm border border-gray-20 px-1.5 py-1" />
                %
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-60">Reminder</label>
            <select value={form.reminder} onChange={(e) => setField('reminder', e.target.value)} className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm">
              {reminderOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="mt-4 flex gap-4 border-b border-gray-15 text-sm">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 ${tab === t ? 'border-b-2 border-brand-blue font-semibold text-brand-blue' : 'text-gray-60'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Predecessors & Links' && (
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-90">Predecessors</div>
                <div className="mt-1 text-xs text-gray-50">
                  What this item waits on. Drives the Gantt's dependency arrows, the Critical
                  Path, and the dates of everything downstream.
                </div>
              </div>

              {linkable.length === 0 ? (
                <div className="text-sm text-gray-50">No other schedule items on this job yet.</div>
              ) : (
                <>
                  {form.predecessors.length > 0 && (
                    <div className="space-y-2">
                      {form.predecessors.map((link) => {
                        const pred = byId.get(link.id)
                        return (
                          <div key={link.id} className="rounded-sm border border-gray-15 bg-gray-5 p-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: scheduleColors.find((c) => c.name === pred?.color)?.hex }}
                              />
                              <span className="truncate text-sm text-gray-90">{pred?.title ?? link.id}</span>
                              <button
                                onClick={() => removeLink(link.id)}
                                aria-label={`Remove ${pred?.title ?? link.id}`}
                                className="ml-auto shrink-0 text-xs text-gray-50 underline hover:text-danger-fg"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-end gap-3">
                              <label className="text-xs font-medium text-gray-60">
                                Type
                                <select
                                  value={link.type}
                                  onChange={(e) => setLink(link.id, { type: e.target.value })}
                                  className="mt-1 block rounded-sm border border-gray-20 bg-white px-2 py-1 text-sm text-gray-90"
                                >
                                  <option value="FS">Finish-to-Start</option>
                                  <option value="SS">Start-to-Start</option>
                                </select>
                              </label>
                              <label className="text-xs font-medium text-gray-60">
                                Lag (work days)
                                <input
                                  type="number"
                                  value={link.lag}
                                  onChange={(e) => setLink(link.id, { lag: Math.trunc(Number(e.target.value) || 0) })}
                                  className="mt-1 block w-24 rounded-sm border border-gray-20 px-2 py-1 text-sm text-gray-90"
                                />
                              </label>
                              <div className="pb-1 text-xs text-gray-50">{describeLink(link, pred)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <label className="block text-xs font-medium text-gray-60">
                    Add a predecessor
                    <select
                      value=""
                      onChange={(e) => e.target.value && addLink(e.target.value)}
                      className="mt-1 block w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm text-gray-90"
                    >
                      <option value="">Select an item…</option>
                      {linkable
                        .filter((i) => !form.predecessors.some((l) => l.id === i.id))
                        .map((i) => (
                          <option key={i.id} value={i.id}>{i.title} ({i.start})</option>
                        ))}
                    </select>
                  </label>

                  {linkWarning && (
                    <div className="rounded-sm bg-danger-bg px-2 py-1.5 text-xs text-danger-fg">{linkWarning}</div>
                  )}

                  <div className="text-xs text-gray-50">
                    Lag waits that many working days after the predecessor (2 for concrete to
                    cure). A negative lag is lead time — start before it finishes.
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'Phases & Tags' && (
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-90">Schedule Item Phase</div>
                <label className="mb-1 mt-2 block text-xs font-medium text-gray-60">Phase</label>
                <select value={form.phase} onChange={(e) => setField('phase', e.target.value)} className="w-full max-w-xs rounded-sm border border-gray-20 px-2 py-1.5 text-sm">
                  {phaseOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-90">Schedule Item Tags</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {form.tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-sm bg-gray-15 px-2 py-0.5 text-xs text-gray-80">
                      {t}
                      <button onClick={() => setField('tags', form.tags.filter((x) => x !== t))} className="text-gray-40">✕</button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        setField('tags', [...form.tags, tagInput.trim()])
                        setTagInput('')
                      }
                    }}
                    placeholder="Add tag, press Enter"
                    className="min-w-[8rem] flex-1 rounded-sm border border-gray-20 px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'Viewing' && (
            <div className="mt-3 space-y-3">
              <div className="text-sm font-semibold text-gray-90">Schedule Viewing</div>
              <label className="flex items-center gap-2 text-sm text-gray-80">
                <input type="checkbox" checked={form.showOnGantt} onChange={(e) => setField('showOnGantt', e.target.checked)} />
                Show on Gantt
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-80">
                <input type="checkbox" checked={form.showClient} onChange={(e) => setField('showClient', e.target.checked)} />
                Show Client (Full schedule)
              </label>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-60">Subs/Vendors</div>
                {availableSubs.length === 0 ? (
                  <div className="text-sm text-gray-50">No subs/vendors assigned to this job yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubs.map((s) => {
                      const active = form.subIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          onClick={() => setField('subIds', active ? form.subIds.filter((id) => id !== s.id) : [...form.subIds, s.id])}
                          className={`rounded-sm border px-2 py-1 text-xs ${active ? 'border-brand-blue bg-info-bg text-info-fg' : 'border-gray-20 text-gray-60'}`}
                        >
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                {form.subIds.length > 0 && (
                  <div className="mt-2 text-xs text-gray-50">
                    All Assigned Subs/Vendors have been granted viewing access and will receive notifications on this schedule item.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'Shifts' && (
            <div className="mt-3">
              <div className="text-sm font-semibold text-gray-90">Shifts</div>
              <div className="mt-1 text-xs text-gray-50">
                Every recorded change to this item's dates, and why. A shift marked "followed"
                moved because something it depends on moved — not because anyone edited it.
              </div>
              {!isEditing ? (
                <div className="mt-3 text-sm text-gray-50">Save the item first — there's no history yet.</div>
              ) : shifts === null ? (
                <div className="mt-3 text-sm text-gray-50">Loading shifts…</div>
              ) : shifts.length === 0 ? (
                <div className="mt-3 rounded-sm border border-gray-15 px-3 py-4 text-center text-sm text-gray-50">
                  This item hasn't moved since it was created.
                </div>
              ) : (
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {shifts.map((sh) => (
                    <div key={`${sh.changeSetId}`} className="rounded-sm border border-gray-15 px-2 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="tabular-nums text-gray-90">
                          {fmtDateShort(sh.from.start)} → {fmtDateShort(sh.to.start)}
                        </span>
                        <span
                          className={`rounded-sm px-1.5 py-0.5 text-xs font-semibold ${
                            sh.role === 'direct' ? 'bg-info-bg text-brand-blue' : 'bg-gray-10 text-gray-60'
                          }`}
                        >
                          {sh.role === 'direct' ? 'Moved' : 'Followed'}
                        </span>
                        {sh.undone && (
                          <span className="rounded-sm bg-gray-10 px-1.5 py-0.5 text-xs text-gray-50">Undone</span>
                        )}
                      </div>
                      {sh.reason && <div className="mt-1 text-sm text-gray-80">{sh.reason}</div>}
                      <div className="mt-1 text-xs text-gray-50">
                        {sh.createdBy} · {new Date(sh.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {sh.alsoMoved > 0 && ` · ${sh.alsoMoved} other item${sh.alsoMoved === 1 ? '' : 's'} moved with it`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Notes' && (
            <div className="mt-3">
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={4}
                className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                placeholder="Add a note…"
              />
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
