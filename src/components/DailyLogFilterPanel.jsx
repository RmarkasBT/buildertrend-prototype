import { useState } from 'react'
import { IconX, IconInfoCircle, IconEllipsis } from './icons'
import { EMPTY_FILTERS, SHARED_WITH, DATE_RANGES } from '../lib/dailyLogFilters'

// Right-hand filter drawer, matching the live Daily Logs funnel icon: a
// saved-filter select, Shared with / Keywords / Created by / Date / Tags,
// and a Clear all + Apply filter footer. Criteria are held locally and only
// pushed to the list on Apply, the way the live drawer behaves.
const field = 'w-full rounded-sm border border-gray-20 bg-white px-2 py-1.5 text-sm text-gray-90 outline-none focus:border-brand-blue'

export default function DailyLogFilterPanel({ filters, availableTags, onApply, onClose }) {
  // The drawer is unmounted while closed, so each open mounts fresh with the
  // list's currently applied criteria — no re-sync effect needed.
  const [draft, setDraft] = useState(filters)

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const toggleTag = (tag) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag] }))

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="flex h-full w-72 flex-col border-l border-gray-15 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-semibold text-gray-90">Filter</h2>
          <button onClick={onClose} aria-label="Close filter" className="text-gray-40 hover:text-gray-70">
            <IconX />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4">
          <select className={field} defaultValue="standard" aria-label="Saved filter">
            <option value="standard">Standard Filter</option>
          </select>
          <button className="text-gray-40 hover:text-gray-70" aria-label="Filter options">
            <IconEllipsis />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <label htmlFor="filter-shared" className="mb-1 block text-xs font-medium text-gray-70">Shared with</label>
            <select id="filter-shared" className={field} value={draft.sharedWith} onChange={(e) => set('sharedWith', e.target.value)}>
              {SHARED_WITH.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-keywords" className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-70">
              Keywords
              <IconInfoCircle className="h-3.5 w-3.5 text-gray-40" />
            </label>
            <input
              id="filter-keywords"
              className={field}
              value={draft.keywords}
              onChange={(e) => set('keywords', e.target.value)}
              placeholder="Search title, notes and tags"
            />
          </div>

          <div>
            <label htmlFor="filter-created-by" className="mb-1 block text-xs font-medium text-gray-70">Created by</label>
            <input id="filter-created-by" className={field} value={draft.createdBy} onChange={(e) => set('createdBy', e.target.value)} />
          </div>

          <div>
            <label htmlFor="filter-date" className="mb-1 block text-xs font-medium text-gray-70">Date</label>
            <select id="filter-date" className={field} value={draft.dateRange} onChange={(e) => set('dateRange', e.target.value)}>
              {DATE_RANGES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-70">Tags</span>
            {availableTags.length === 0 ? (
              <p className="text-xs text-gray-50">No tags used on this job yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={draft.tags.includes(tag)}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      draft.tags.includes(tag)
                        ? 'bg-brand-blue text-white'
                        : 'border border-gray-20 text-gray-70 hover:bg-gray-5'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-15 px-4 py-3">
          <button
            onClick={() => setDraft(EMPTY_FILTERS)}
            className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70 hover:bg-gray-5"
          >
            Clear all
          </button>
          <button
            onClick={() => { onApply(draft); onClose() }}
            className="rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-info-fg"
          >
            Apply filter
          </button>
        </div>
      </aside>
    </div>
  )
}

