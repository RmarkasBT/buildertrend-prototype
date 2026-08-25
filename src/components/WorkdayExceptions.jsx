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

// Label-left row, matching BT's form layout.
function Field({ label, required, info, children }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
      <div className="shrink-0 pt-1.5 text-sm text-gray-80 sm:w-40">
        {label}
        {required && <span className="ml-0.5 text-danger-fg">*</span>}
        {info && <span className="ml-1 text-xs text-gray-40" title="More info">&#9432;</span>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// BT's Category is a managed list with Add/Edit, not free text — so it starts
// from a seeded set and grows, rather than accepting anything typed.
const DEFAULT_CATEGORIES = ['State Holiday', 'Company Holiday', 'Weather', 'Catch-up']

const BLANK = {
  title: '',
  type: 'non_workday',
  start: '',
  end: '',
  sameEveryYear: false,
  category: '',
  applyToAll: true,
}

export default function WorkdayExceptions({ jobId, onChanged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [extraCategories, setExtraCategories] = useState([])

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

  // Seeded categories, plus any already in use on this job, plus newly added.
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...rows.map((r) => r.category).filter(Boolean), ...extraCategories])]

  const commitCategory = () => {
    const v = newCategory.trim()
    if (!v) return
    setExtraCategories((c) => [...c, v])
    set('category', v)
    setNewCategory('')
    setAddingCategory(false)
  }

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
        <div className="mt-3 rounded-md border border-gray-15 bg-white p-4">
          {/* Layout and controls follow BT's own "Add Workday Exception" screen:
              labels to the LEFT of their field, Type and Apply-To as radio
              groups rather than a select and a checkbox, one "Start and end"
              label spanning two date inputs, and Category as a required
              managed list with an Add affordance. */}
          <div className="text-lg font-bold text-gray-90">Add Workday Exception</div>

          <div className="mt-4 space-y-3">
            <Field label="Title" required>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="4th of July"
                className="w-full max-w-sm rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Type" info>
              <div className="space-y-1">
                {[
                  ['non_workday', 'Non Workday', 'Blocks a day that normally works, like a holiday.'],
                  ['extra_workday', 'Extra Workday', 'Opens a day that normally does not, like a Saturday.'],
                ].map(([value, label, hint]) => (
                  <label key={value} className="flex items-start gap-2 text-sm text-gray-80">
                    <input
                      type="radio"
                      name="wx-type"
                      checked={form.type === value}
                      onChange={() => set('type', value)}
                      className="mt-0.5"
                    />
                    <span>
                      {label}
                      <span className="block text-xs text-gray-50">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Start and end" required>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={form.start}
                  onChange={(e) => set('start', e.target.value)}
                  className="rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={form.end}
                  onChange={(e) => set('end', e.target.value)}
                  className="rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                />
              </div>
            </Field>

            <Field label="Same Every Year">
              <input
                type="checkbox"
                checked={form.sameEveryYear}
                onChange={(e) => set('sameEveryYear', e.target.checked)}
              />
            </Field>

            <Field label="Category" required>
              <div className="flex flex-wrap items-center gap-2">
                {addingCategory ? (
                  <>
                    <input
                      autoFocus
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="New category"
                      className="rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={commitCategory}
                      className="rounded-sm border border-gray-20 px-2 py-1.5 text-sm text-gray-70"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setAddingCategory(false); setNewCategory('') }}
                      className="text-sm text-gray-50 underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <select
                      value={form.category}
                      onChange={(e) => set('category', e.target.value)}
                      className="min-w-48 rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                    >
                      <option value="">Select a category…</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button
                      onClick={() => setAddingCategory(true)}
                      className="rounded-sm border border-gray-20 px-2 py-1.5 text-sm text-gray-70"
                    >
                      Add
                    </button>
                  </>
                )}
              </div>
            </Field>

            <Field label="Apply Exception To">
              <div className="space-y-1">
                {[[true, 'All Jobs'], [false, 'Specific Jobs']].map(([val, label]) => (
                  <label key={String(val)} className="flex items-center gap-2 text-sm text-gray-80">
                    <input
                      type="radio"
                      name="wx-apply"
                      checked={form.applyToAll === val}
                      onChange={() => set('applyToAll', val)}
                    />
                    {label}
                    {val === false && <span className="text-xs text-gray-50">(this job)</span>}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-4 flex gap-2 border-t border-gray-15 pt-3">
            <button
              onClick={save}
              className="rounded-sm bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white"
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
