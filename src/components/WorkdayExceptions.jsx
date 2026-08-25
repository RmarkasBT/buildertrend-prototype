import { useCallback, useEffect, useState } from 'react'
import * as workdayApi from '../api/workdayApi'
import { EXCEPTION_TYPE_LABELS } from '../lib/workCalendar'
import { fmtDate, todayIso } from '../lib/dates'
import { IconTrash } from './icons'

// The Schedule page's Workday Exceptions tab. Field set follows what
// Buildertrend documents: Title, Type (Non Workday / Extra Workday), Start and
// end, Same Every Year, Category, and Apply Exception To (all jobs or this one).
//
// This is not cosmetic — an exception feeds the job's working calendar, which
// the cascade engine uses, so adding a holiday here genuinely moves dates.

const BLANK = {
  title: '',
  type: 'non_workday',
  start: '',
  end: '',
  sameEveryYear: false,
  category: '',
  applyToAll: false,
}

export default function WorkdayExceptions({ jobId, onChanged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(BLANK)

  const refresh = useCallback(() => {
    if (!jobId) return
    setLoading(true)
    setError(null)
    workdayApi
      .listExceptions(jobId)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => { refresh() }, [refresh])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const startAdd = () => {
    const today = todayIso()
    setForm({ ...BLANK, start: today, end: today })
    setAdding(true)
    setError(null)
  }

  const save = () => {
    const { applyToAll, ...rest } = form
    workdayApi
      // '' means every job — that's what a public holiday is.
      .createException({ ...rest, jobId: applyToAll ? '' : jobId })
      .then(() => {
        setAdding(false)
        setForm(BLANK)
        refresh()
        // The schedule's dates depend on this, so tell the page to refetch.
        onChanged?.()
      })
      .catch((e) => setError(e.message))
  }

  const remove = (row) => {
    workdayApi
      .deleteException(row.id)
      .then(() => { refresh(); onChanged?.() })
      .catch((e) => setError(e.message))
  }

  return (
    <div className="mt-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-gray-70">
          Block out holidays and office closures, or open up a Saturday, without changing the
          job's standard work week. Schedule dates are calculated around these.
        </p>
        <button
          onClick={startAdd}
          className="shrink-0 rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white"
        >
          Add Workday Exception
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</div>
      )}

      {adding && (
        <div className="mt-3 rounded-md border border-gray-15 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-gray-60">
              Title
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Thanksgiving"
                className="mt-1 w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm font-normal text-gray-90"
              />
            </label>
            <label className="text-xs font-semibold text-gray-60">
              Type
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="mt-1 w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm font-normal text-gray-90"
              >
                <option value="non_workday">Non Workday — block a working day</option>
                <option value="extra_workday">Extra Workday — open a day off</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-60">
              Category
              <input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Holiday"
                className="mt-1 w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm font-normal text-gray-90"
              />
            </label>
            <label className="text-xs font-semibold text-gray-60">
              Start
              <input
                type="date"
                value={form.start}
                onChange={(e) => set('start', e.target.value)}
                className="mt-1 w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm font-normal text-gray-90"
              />
            </label>
            <label className="text-xs font-semibold text-gray-60">
              End
              <input
                type="date"
                value={form.end}
                onChange={(e) => set('end', e.target.value)}
                className="mt-1 w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm font-normal text-gray-90"
              />
            </label>
            <div className="flex flex-col justify-end gap-1.5 text-sm text-gray-80">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.sameEveryYear}
                  onChange={(e) => set('sameEveryYear', e.target.checked)}
                />
                Same Every Year
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.applyToAll}
                  onChange={(e) => set('applyToAll', e.target.checked)}
                />
                Apply to all jobs
              </label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              className="rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white"
            >
              Save
            </button>
            <button
              onClick={() => { setAdding(false); setError(null) }}
              className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <div className="mt-3 text-sm text-gray-50">Loading exceptions…</div>}

      {!loading && !rows.length && !adding && (
        <div className="mt-3 rounded-md border border-gray-15 bg-white px-3 py-6 text-center text-sm text-gray-50">
          No workday exceptions yet. Schedule dates use this job's standard work week.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <table className="mt-3 w-full rounded-md border border-gray-15 bg-white text-sm">
          <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Applies to</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-15">
                <td className="px-3 py-2 text-gray-90">{r.title}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-xs font-semibold ${
                      r.type === 'extra_workday'
                        ? 'bg-success-bg text-success-fg'
                        : 'bg-warning-bg text-warning-fg'
                    }`}
                  >
                    {EXCEPTION_TYPE_LABELS[r.type]}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-gray-70">
                  {r.start === r.end ? fmtDate(r.start) : `${fmtDate(r.start)} – ${fmtDate(r.end)}`}
                  {r.sameEveryYear && <span className="ml-1 text-xs text-gray-50">· every year</span>}
                </td>
                <td className="px-3 py-2 text-gray-70">{r.category || '—'}</td>
                <td className="px-3 py-2 text-gray-70">{r.jobId ? 'This job' : 'All jobs'}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => remove(r)}
                    aria-label={`Delete ${r.title}`}
                    className="text-gray-50 hover:text-danger-fg"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
