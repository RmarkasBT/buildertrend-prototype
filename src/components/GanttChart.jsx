import { useMemo, useRef, useState, useEffect } from 'react'
import { colorHex } from '../data/scheduleColors'
import {
  addDays,
  durationDays,
  offsetDays,
  fmtDate,
  minISO,
  maxISO,
  parseISODate,
  todayIso,
  weekdayIndex,
  endFromWorkDays,
  workDaysBetween,
} from '../lib/dates'
// CPM lives in the cascade engine so the Critical Path toggle and the impact
// cascade can never disagree about which items are critical — they were
// separate implementations of the same forward/backward pass before.
import { computeCriticalIds, itemDuration, wouldCreateCycle, linksOf } from '../lib/cascade'
import { IconSliders, IconShare, IconExpand, IconChevronDown, IconCheck, IconXCircle, IconEdit, IconCirclePlus } from './icons'

// Real Buildertrend Gantt (/app/Schedules/{id}, Gantt tab) captured live:
// zoom dropdown (Day/Week/Month/Year), Today button, Phases/Critical Path
// toggles, a pinned left grid (Title/Start/Workdays) with per-row pencil
// (select + scroll-to) and "+" (add item) icons, a scrollable timeline with
// weekend shading and a "Today" marker line, phase group summary bars, and
// click-a-bar-to-inline-edit (Title/Start/Workdays become inputs with a
// check/X to save/cancel) instead of a modal. Drag-to-move/resize and
// drag-a-link-handle-to-set-a-predecessor are real capabilities of the
// underlying library (dhtmlx-gantt, per its `gantt_*` class names) that
// weren't exercised live (no job had dependency links configured — see
// CAPTURE_LOG.md) — implemented here as a best-effort reconstruction of
// that mechanism, not a pixel-for-pixel observed capture.

const ROW_H = 34
const LEFT_W = 380
const WEEKDAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const ZOOMS = {
  Day: { dayWidth: 36, dayRow: true },
  Week: { dayWidth: 14, dayRow: true, weekly: true },
  Month: { dayWidth: 4.4, dayRow: false },
  Year: { dayWidth: 1.15, dayRow: false },
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-70">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-brand-blue' : 'bg-gray-25'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {label}
    </label>
  )
}

export default function GanttChart({ items, onUpdateItem, onCreateItem, onApplyChanges, calendar }) {
  const [zoom, setZoom] = useState('Day')
  const [groupByPhase, setGroupByPhase] = useState(false)
  const [showCritical, setShowCritical] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const [linkDraft, setLinkDraft] = useState(null)
  const [linkError, setLinkError] = useState(null)
  const [linkToRemove, setLinkToRemove] = useState(null)
  const scrollRef = useRef(null)
  const containerRef = useRef(null)
  const rowRefs = useRef(new Map())
  const todayISO = todayIso()

  const { dayWidth, dayRow, weekly } = ZOOMS[zoom]

  const rangeStart = useMemo(() => {
    const dates = items.flatMap((it) => [it.start, it.end]).concat([todayISO])
    const min = dates.reduce(minISO, todayISO)
    return addDays(min, -14)
  }, [items])
  const rangeEnd = useMemo(() => {
    const dates = items.flatMap((it) => [it.start, it.end]).concat([todayISO])
    const max = dates.reduce(maxISO, todayISO)
    return addDays(max, 30)
  }, [items])
  const totalDays = durationDays(rangeStart, rangeEnd)
  const totalWidth = totalDays * dayWidth

  // Geometry, so this is the exclusive offset: day 0 sits at x=0.
  const xOf = (iso) => offsetDays(rangeStart, iso) * dayWidth

  const monthBlocks = useMemo(() => {
    const blocks = []
    for (let i = 0; i < totalDays; i++) {
      const d = parseISODate(addDays(rangeStart, i))
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (blocks.length && blocks[blocks.length - 1].label === label) blocks[blocks.length - 1].days++
      else blocks.push({ label, days: 1 })
    }
    return blocks
  }, [rangeStart, totalDays])

  // Shade whatever the job's calendar says doesn't work — so a holiday or a
  // blocked closure appears alongside the weekends, and an opened Saturday
  // correctly appears NOT shaded. Falls back to Sat/Sun before the calendar
  // has loaded.
  const nonWorkingCols = useMemo(() => {
    const cols = []
    for (let i = 0; i < totalDays; i++) {
      const iso = addDays(rangeStart, i)
      const off = calendar ? !calendar.isWorkDay(iso) : [0, 6].includes(weekdayIndex(iso))
      if (off) cols.push(i)
    }
    return cols
  }, [rangeStart, totalDays, calendar])

  const phaseGroups = useMemo(() => {
    if (!groupByPhase) return null
    const map = new Map()
    for (const it of items) {
      const key = it.phase || 'Unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(it)
    }
    return Array.from(map.entries()).map(([phase, its]) => ({
      phase,
      items: its,
      start: its.reduce((a, b) => minISO(a, b.start), its[0].start),
      end: its.reduce((a, b) => maxISO(a, b.end), its[0].end),
    }))
  }, [items, groupByPhase])

  const rows = useMemo(() => {
    if (!groupByPhase) return items.map((it) => ({ type: 'item', item: it }))
    const out = []
    for (const g of phaseGroups) {
      out.push({ type: 'phase', ...g })
      if (!collapsed.has(g.phase)) for (const it of g.items) out.push({ type: 'item', item: it })
    }
    return out
  }, [items, phaseGroups, collapsed, groupByPhase])

  const criticalIds = useMemo(() => (showCritical ? computeCriticalIds(items) : new Set()), [items, showCritical])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = Math.max(0, xOf(todayISO) - el.clientWidth / 2)
  }, [zoom])

  const scrollToToday = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, xOf(todayISO) - el.clientWidth / 2), behavior: 'smooth' })
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current?.requestFullscreen?.()
  }

  const startEdit = (item) => {
    setSelectedId(item.id)
    setEditingId(item.id)
    setEditForm({ title: item.title, start: item.start, workDays: item.workDays })
  }
  const cancelEdit = () => { setEditingId(null); setEditForm(null) }
  const saveEdit = (item) => {
    const workDays = Math.max(1, Number(editForm.workDays) || 1)
    const titleChanged = editForm.title !== item.title
    const datesChanged = editForm.start !== item.start || workDays !== itemDuration(item)

    // Title is a plain field edit; dates have to cascade. Doing them as two
    // calls keeps the change set purely about dates, so undo restores the
    // schedule shape without also reverting a rename the user meant to keep.
    if (titleChanged) onUpdateItem({ ...item, title: editForm.title })
    if (datesChanged && onApplyChanges) {
      onApplyChanges([{ itemId: item.id, start: editForm.start, workDays }], {
        origin: 'gantt_edit',
        reason: `Edited ${item.title}`,
      })
    } else if (datesChanged) {
      // workDays are WORKING days, so the end date skips weekends.
      onUpdateItem({ ...item, start: editForm.start, workDays, end: endFromWorkDays(editForm.start, workDays) })
    }
    cancelEdit()
  }

  const previewFor = (item) => {
    let { start, end } = item
    if (dragPreview && dragPreview.id === item.id) {
      const d = dragPreview.deltaDays
      if (dragPreview.mode === 'move') { start = addDays(start, d); end = addDays(end, d) }
      else if (dragPreview.mode === 'resize-start') start = minISO(addDays(start, d), end)
      else if (dragPreview.mode === 'resize-end') end = maxISO(addDays(end, d), start)
    }
    return { start, end }
  }

  const onBarMouseDown = (e, item, mode) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const orig = { start: item.start, end: item.end }
    let moved = false
    const onMove = (ev) => {
      const deltaPx = ev.clientX - startX
      if (Math.abs(deltaPx) > 3) moved = true
      setDragPreview({ id: item.id, mode, deltaDays: Math.round(deltaPx / dayWidth) })
    }
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragPreview(null)
      if (!moved) { startEdit(item); return }
      const deltaDays = Math.round((ev.clientX - startX) / dayWidth)
      if (deltaDays === 0) { setSelectedId(item.id); return }
      // The drag delta is in calendar days because that's the axis the mouse
      // moved along. A move keeps the duration and re-derives the end through
      // the work calendar; a resize changes the duration to whatever working
      // days the new span actually contains.
      //
      // All three go through onApplyChanges (POST /batch) rather than a single
      // PUT: dragging a bar almost always pushes its successors, and that has to
      // land as one atomic, undoable write.
      let change
      if (mode === 'move') {
        change = { itemId: item.id, start: addDays(orig.start, deltaDays), workDays: itemDuration(item) }
      } else if (mode === 'resize-start') {
        const newStart = minISO(addDays(orig.start, deltaDays), orig.end)
        change = { itemId: item.id, start: newStart, workDays: workDaysBetween(newStart, orig.end) }
      } else {
        const newEnd = maxISO(addDays(orig.end, deltaDays), orig.start)
        change = { itemId: item.id, start: orig.start, workDays: workDaysBetween(orig.start, newEnd) }
      }
      const verb = mode === 'move' ? 'Moved' : 'Resized'
      if (onApplyChanges) {
        onApplyChanges([change], { origin: 'gantt_drag', reason: `${verb} ${item.title}` })
      } else {
        const end = endFromWorkDays(change.start, change.workDays)
        onUpdateItem({ ...item, start: change.start, end, workDays: change.workDays })
      }
      setSelectedId(item.id)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onLinkHandleDown = (e, fromItem) => {
    e.preventDefault()
    e.stopPropagation()
    const containerRect = scrollRef.current.getBoundingClientRect()
    setLinkDraft({ fromId: fromItem.id, x: e.clientX - containerRect.left + scrollRef.current.scrollLeft, y: e.clientY - containerRect.top + scrollRef.current.scrollTop })
    const onMove = (ev) => {
      const rect = scrollRef.current.getBoundingClientRect()
      setLinkDraft((d) => d && { ...d, x: ev.clientX - rect.left + scrollRef.current.scrollLeft, y: ev.clientY - rect.top + scrollRef.current.scrollTop })
    }
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const target = document.elementFromPoint(ev.clientX, ev.clientY)
      const rowEl = target?.closest('[data-row-id]')
      const targetId = rowEl?.dataset.rowId
      setLinkDraft(null)
      if (targetId && targetId !== fromItem.id) {
        const targetItem = items.find((i) => i.id === targetId)
        if (targetItem && !(targetItem.predecessorIds || []).includes(fromItem.id)) {
          const next = [...(targetItem.predecessorIds || []), fromItem.id]
          // Check before writing. The server rejects a cycle too, but only this
          // side can name the loop in the user's own task titles instead of
          // surfacing an id list after a failed round-trip.
          const loop = wouldCreateCycle(items, targetItem.id, next)
          if (loop) {
            const titles = loop.map((id) => items.find((i) => i.id === id)?.title ?? id)
            setLinkError(`That would make the schedule circular: ${titles.join(' → ')}`)
            return
          }
          setLinkError(null)
          onUpdateItem({ ...targetItem, predecessorIds: next })
        }
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const headerH = dayRow ? 50 : 28
  const contentH = rows.length * ROW_H

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items])
  const rowIndexById = useMemo(() => {
    const m = new Map()
    rows.forEach((r, i) => { if (r.type === 'item') m.set(r.item.id, i) })
    return m
  }, [rows])

  const removeLink = () => {
    const succ = byId.get(linkToRemove.succId)
    if (succ) {
      onUpdateItem({
        ...succ,
        predecessorIds: (succ.predecessorIds || []).filter((p) => p !== linkToRemove.predId),
      })
    }
    setLinkToRemove(null)
  }

  return (
    <div ref={containerRef} className="rounded-md border border-gray-15 bg-white">
      {/* Refusing a circular link, and confirming a link removal. Both belong
          here rather than as toasts: the user is looking at the two bars they
          just tried to connect. */}
      {linkError && (
        <div className="flex items-start justify-between gap-3 border-b border-gray-15 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          <span>{linkError}</span>
          <button onClick={() => setLinkError(null)} className="shrink-0 font-semibold underline">Dismiss</button>
        </div>
      )}
      {linkToRemove && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-15 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          <span>
            Remove the link so {byId.get(linkToRemove.succId)?.title ?? 'this item'} no longer waits on{' '}
            {byId.get(linkToRemove.predId)?.title ?? 'that item'}?
          </span>
          <span className="flex shrink-0 gap-3">
            <button onClick={removeLink} className="font-semibold text-brand-blue underline">Remove link</button>
            <button onClick={() => setLinkToRemove(null)} className="text-gray-70 underline">Cancel</button>
          </span>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-gray-15 px-3 py-2">
        <div className="flex items-center gap-2">
          <select
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
            className="rounded-sm border border-gray-20 px-2 py-1 text-sm text-gray-80"
          >
            {Object.keys(ZOOMS).map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <button onClick={scrollToToday} className="rounded-sm border border-gray-20 px-2.5 py-1 text-sm text-gray-70">
            Today
          </button>
        </div>
        <div className="flex items-center gap-4">
          <ToggleSwitch checked={groupByPhase} onChange={setGroupByPhase} label="Phases" />
          <ToggleSwitch checked={showCritical} onChange={setShowCritical} label="Critical Path" />
          <div className="flex items-center gap-1 text-gray-50">
            <button title="Column settings" className="rounded-sm p-1.5 hover:bg-gray-10"><IconSliders className="h-4 w-4" /></button>
            <button title="Share" className="rounded-sm p-1.5 hover:bg-gray-10"><IconShare className="h-4 w-4" /></button>
            <button title="Fullscreen" onClick={toggleFullscreen} className="rounded-sm p-1.5 hover:bg-gray-10"><IconExpand className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="relative overflow-auto" style={{ maxHeight: 620 }}>
        <div className="relative flex" style={{ width: LEFT_W + totalWidth }}>
          {/* Left pinned grid */}
          <div className="sticky left-0 z-20 border-r border-gray-15 bg-white" style={{ width: LEFT_W, flexShrink: 0 }}>
            <div
              className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-15 bg-white px-2 text-xs font-semibold text-gray-60"
              style={{ height: headerH }}
            >
              <button onClick={() => setCollapsed((s) => (s.size ? new Set() : new Set(phaseGroups?.map((g) => g.phase))))} className="text-gray-40">
                <IconChevronDown className="h-3.5 w-3.5" />
              </button>
              <div style={{ width: LEFT_W - 220 }}>Title</div>
              <div style={{ width: 100 }}>Start</div>
              <div style={{ width: 76 }}>Workdays</div>
              <div className="ml-auto text-brand-blue"><IconCirclePlus className="h-4 w-4" /></div>
            </div>
            {rows.map((row, i) => row.type === 'phase' ? (
              <div
                key={`phase-${row.phase}`}
                className="flex items-center gap-2 border-b border-gray-15 bg-gray-5 px-2 text-sm font-semibold text-gray-80"
                style={{ height: ROW_H }}
              >
                <button
                  onClick={() => setCollapsed((s) => {
                    const next = new Set(s)
                    next.has(row.phase) ? next.delete(row.phase) : next.add(row.phase)
                    return next
                  })}
                  className={`text-gray-50 transition-transform ${collapsed.has(row.phase) ? '-rotate-90' : ''}`}
                >
                  <IconChevronDown className="h-3.5 w-3.5" />
                </button>
                <span className="truncate uppercase tracking-wide">{row.phase}</span>
                <span className="ml-auto text-xs font-normal text-gray-40">{row.items.length}</span>
              </div>
            ) : (
              <div
                key={row.item.id}
                ref={(el) => el && rowRefs.current.set(row.item.id, el)}
                className={`flex items-center gap-2 border-b border-gray-15 px-2 text-sm ${selectedId === row.item.id ? 'bg-info-bg' : 'hover:bg-gray-5'}`}
                style={{ height: ROW_H }}
              >
                {editingId === row.item.id ? (
                  <>
                    <input
                      autoFocus
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="min-w-0 flex-1 rounded-sm border border-brand-blue px-1.5 py-0.5 text-sm"
                      style={{ width: LEFT_W - 220 }}
                    />
                    <input
                      type="date"
                      value={editForm.start}
                      onChange={(e) => setEditForm((f) => ({ ...f, start: e.target.value }))}
                      className="rounded-sm border border-gray-20 px-1 py-0.5 text-xs"
                      style={{ width: 100 }}
                    />
                    <input
                      type="number"
                      min="1"
                      value={editForm.workDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, workDays: e.target.value }))}
                      className="rounded-sm border border-gray-20 px-1 py-0.5 text-xs"
                      style={{ width: 44 }}
                    />
                    <button onClick={() => saveEdit(row.item)} className="text-success-fg"><IconCheck className="h-4 w-4" /></button>
                    <button onClick={cancelEdit} className="text-gray-40"><IconXCircle className="h-4 w-4" /></button>
                    <button onClick={() => onCreateItem(row.item)} className="text-brand-blue"><IconCirclePlus className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="truncate" style={{ width: LEFT_W - 220 }} title={row.item.title}>{row.item.title}</span>
                    <span className="shrink-0 text-gray-60" style={{ width: 100 }}>{fmtDate(row.item.start)}</span>
                    <span className="shrink-0 text-gray-60" style={{ width: 76 }}>{row.item.workDays} day{row.item.workDays === 1 ? '' : 's'}</span>
                    <button onClick={() => startEdit(row.item)} className="shrink-0 text-brand-blue"><IconEdit className="h-4 w-4" /></button>
                    <button onClick={() => onCreateItem(row.item)} className="shrink-0 text-brand-blue"><IconCirclePlus className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative" style={{ width: totalWidth, flexShrink: 0 }}>
            <div className="sticky top-0 z-20 bg-white" style={{ height: headerH }}>
              <div className="flex border-b border-gray-15 text-sm font-semibold text-gray-70" style={{ height: dayRow ? 28 : headerH }}>
                {monthBlocks.map((b, i) => (
                  <div key={i} className="flex shrink-0 items-center justify-center border-r border-gray-15" style={{ width: b.days * dayWidth }}>
                    {b.days * dayWidth > 60 ? b.label : ''}
                  </div>
                ))}
              </div>
              {dayRow && (
                <div className="flex text-[11px] leading-tight text-gray-50" style={{ height: 22 }}>
                  {Array.from({ length: totalDays }, (_, i) => {
                    const iso = addDays(rangeStart, i)
                    const w = weekdayIndex(iso)
                    // Header shading has to agree with the body's, or a holiday
                    // shows as a shaded column under an unshaded date.
                    const off = calendar ? !calendar.isWorkDay(iso) : w === 0 || w === 6
                    const why = calendar?.reasonFor?.(iso)
                    return (
                      <div
                        key={i}
                        title={why?.title || undefined}
                        className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-gray-15 ${off ? 'bg-gray-5' : ''}`}
                        style={{ width: dayWidth }}
                      >
                        <div>{WEEKDAY_ABBR[w]}</div>
                        <div className={`font-medium tabular-nums ${why?.title ? 'text-warning-fg' : 'text-gray-70'}`}>
                          {parseISODate(iso).getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* weekend column shading */}
            <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: contentH, top: headerH }}>
              {nonWorkingCols.map((i) => (
                <div key={i} className="absolute top-0 bg-gray-5" style={{ left: i * dayWidth, width: dayWidth, height: contentH }} />
              ))}
            </div>

            {/* today marker: dot pokes above the header (z-30, over everything);
                the line itself only runs through the body so it never draws
                through the header's month/day labels */}
            <div className="pointer-events-none absolute top-0 z-30" style={{ left: xOf(todayISO) + dayWidth / 2 }}>
              <div className="-translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-brand-blue" />
            </div>
            <div className="pointer-events-none absolute z-0" style={{ left: xOf(todayISO) + dayWidth / 2, top: headerH, height: contentH }}>
              <div className="h-full w-px -translate-x-1/2 bg-brand-blue" />
            </div>

            {/* dependency arrows */}
            <svg
              className="pointer-events-none absolute left-0"
              style={{ top: headerH, width: totalWidth, height: contentH }}
            >
              {rows.map((row) => row.type === 'item' ? row.item : null).filter(Boolean).flatMap((item) => {
                const succIdx = rowIndexById.get(item.id)
                if (succIdx === undefined) return []
                return linksOf(item).map((link) => {
                  const pid = link.id
                  const predIdx = rowIndexById.get(pid)
                  const pred = byId.get(pid)
                  if (predIdx === undefined || !pred) return null
                  const critical = criticalIds.has(pid) && criticalIds.has(item.id)
                  // An SS link leaves the predecessor's START, not its finish —
                  // drawing it from the end would show a finish-to-start
                  // relationship that isn't what the schedule actually says.
                  const ss = link.type === 'SS'
                  const x1 = ss ? xOf(pred.start) : xOf(pred.end) + dayWidth
                  const y1 = predIdx * ROW_H + ROW_H / 2
                  const x2 = xOf(item.start)
                  const y2 = succIdx * ROW_H + ROW_H / 2
                  // SS routes below/left via a short stub so a same-start pair
                  // (identical x1 and x2) still renders as a visible connector
                  // rather than collapsing to a zero-length line.
                  const midX = ss ? Math.min(x1, x2) - 8 : x1 + 8
                  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
                  return (
                    <g key={`${pid}-${item.id}`} className="pointer-events-auto">
                      {/* Invisible fat stroke under the visible line: a 1.5px
                          path is far too thin to click reliably. Matches BT,
                          where clicking a link is how you remove it. */}
                      <path
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                        className="cursor-pointer"
                        onClick={() => setLinkToRemove({ predId: pid, succId: item.id })}
                      />
                      <path
                        d={d}
                        fill="none"
                        stroke={critical ? '#0763fb' : '#8f9ba8'}
                        strokeWidth={critical ? 2 : 1.5}
                        strokeDasharray={ss ? '4 3' : undefined}
                        markerEnd="url(#arrow)"
                        className="pointer-events-none"
                      />
                    </g>
                  )
                })
              })}
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="#8f9ba8" />
                </marker>
              </defs>
              {linkDraft && (() => {
                const fromItem = byId.get(linkDraft.fromId)
                const fromIdx = rowIndexById.get(linkDraft.fromId)
                if (!fromItem || fromIdx === undefined) return null
                const x1 = xOf(fromItem.start) + (xOf(fromItem.end) - xOf(fromItem.start)) + dayWidth
                const y1 = fromIdx * ROW_H + ROW_H / 2
                return <path d={`M ${x1} ${y1} L ${linkDraft.x} ${linkDraft.y - headerH}`} stroke="#0763fb" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
              })()}
            </svg>

            {rows.map((row, i) => {
              if (row.type === 'phase') {
                const left = xOf(row.start)
                const width = Math.max(xOf(row.end) + dayWidth - left, dayWidth)
                return (
                  <div key={`phase-bar-${row.phase}`} className="relative border-b border-gray-15" style={{ height: ROW_H }}>
                    <div
                      className="absolute top-1.5 flex items-center justify-center rounded-sm bg-gray-60 text-xs font-medium text-white"
                      style={{ left, width, height: ROW_H - 12 }}
                    >
                      <span className="truncate px-2">{row.phase}</span>
                    </div>
                  </div>
                )
              }
              const item = row.item
              const { start, end } = previewFor(item)
              const left = xOf(start)
              const width = Math.max(xOf(end) + dayWidth - left, dayWidth)
              const label = item.title
              const fitsInside = width > label.length * 6 + 16
              const selected = selectedId === item.id
              const critical = criticalIds.has(item.id)
              // Per Buildertrend's own docs, the Critical Path toggle outlines
              // critical items in BLUE and greys out everything else ("Tasks
              // shown in grey indicate schedule items that are not on the
              // critical path. These tasks have some built-in flexibility or
              // 'float'"). Greying the non-critical bars is the half that makes
              // the toggle readable — outlining alone leaves every bar its
              // normal colour and the eye can't separate them.
              const dimmed = showCritical && !critical
              return (
                <div key={item.id} data-row-id={item.id} className="relative border-b border-gray-15" style={{ height: ROW_H }}>
                  <div
                    onMouseDown={(e) => onBarMouseDown(e, item, 'move')}
                    className="absolute top-1.5 flex cursor-grab items-center rounded-sm text-xs font-medium text-white active:cursor-grabbing"
                    style={{
                      left,
                      width,
                      height: ROW_H - 12,
                      backgroundColor: dimmed ? '#b8bfcc' : colorHex(item.color),
                      outline: critical ? '2px solid #0763fb' : selected ? '2px solid #0763fb' : 'none',
                      outlineOffset: 1,
                    }}
                  >
                    <div
                      onMouseDown={(e) => onBarMouseDown(e, item, 'resize-start')}
                      className="absolute -left-0.5 h-full w-2 cursor-ew-resize"
                    />
                    {fitsInside && <span className="w-full truncate px-2 text-center">{label}</span>}
                    <div
                      onMouseDown={(e) => onBarMouseDown(e, item, 'resize-end')}
                      className="absolute -right-0.5 h-full w-2 cursor-ew-resize"
                    />
                    {selected && (
                      <>
                        <div
                          onMouseDown={(e) => onLinkHandleDown(e, item)}
                          className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-brand-blue bg-white"
                        />
                        <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-blue bg-white" />
                      </>
                    )}
                  </div>
                  {!fitsInside && (
                    <div
                      className="absolute top-0 flex items-center text-xs text-gray-70"
                      style={{ left: left + width + 6, height: ROW_H }}
                    >
                      {label}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
