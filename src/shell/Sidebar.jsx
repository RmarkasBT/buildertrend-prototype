import { useState } from 'react'
import { useJob } from '../context/JobContext'
import Badge from '../components/Badge'

// Structure (company name, current-job card, Jobs/Templates toggle, +Job,
// search + filter + sort, "ALL N OPEN JOBS" list) copied from the live
// session's left sidebar / job picker.
export default function Sidebar({ onNewJob }) {
  const { jobs, currentJobId, setCurrentJobId, currentJob } = useJob()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('Jobs')

  const filtered = jobs.filter((j) => j.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-15 bg-white">
      <div className="px-3 pt-3 text-sm font-semibold text-gray-90">Villa Vista Homes LLC</div>

      {currentJob && (
        <div className="mx-3 mt-2 rounded-md border-l-4 border-brand-coral bg-gray-5 p-2">
          <div className="flex items-center justify-between">
            <Badge>{currentJob.status}</Badge>
            <div className="flex gap-1 text-gray-40 text-xs">
              <span title="Info">ⓘ</span>
              <span title="Email">✉</span>
              <span title="Home">⌂</span>
            </div>
          </div>
          <div className="mt-1 text-sm font-semibold text-gray-90">{currentJob.name}</div>
          <div className="text-xs text-gray-60">{currentJob.address}</div>
        </div>
      )}

      <div className="mx-3 mt-3 flex items-center gap-2">
        <div className="flex rounded-sm border border-gray-20 text-xs">
          <button
            onClick={() => setTab('Jobs')}
            className={`px-2 py-1 ${tab === 'Jobs' ? 'bg-gray-15 font-semibold' : ''}`}
          >
            Jobs
          </button>
          <button
            onClick={() => setTab('Templates')}
            className={`px-2 py-1 ${tab === 'Templates' ? 'bg-gray-15 font-semibold' : ''}`}
          >
            Templates
          </button>
        </div>
        <button
          onClick={onNewJob}
          className="ml-auto rounded-sm bg-brand-blue px-2 py-1 text-xs font-semibold text-white"
        >
          + Job
        </button>
      </div>

      <div className="mx-3 mt-2 flex items-center gap-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full rounded-sm border border-gray-20 px-2 py-1 text-xs outline-none"
        />
        <button className="rounded-sm border border-gray-20 px-1.5 py-1 text-xs" title="Filter">▽¹</button>
        <button className="rounded-sm border border-gray-20 px-1.5 py-1 text-xs" title="Sort">⇕</button>
      </div>

      <div className="mx-3 mt-3 text-[11px] font-semibold uppercase text-gray-50">
        All {jobs.length} open jobs
      </div>
      <ul className="mt-1 flex-1 overflow-y-auto px-1 pb-3">
        {filtered.map((j) => (
          <li key={j.id}>
            <button
              onClick={() => setCurrentJobId(j.id)}
              className={`w-full truncate rounded-sm px-2 py-1.5 text-left text-sm ${
                j.id === currentJobId ? 'bg-info-bg text-info-fg font-medium' : 'text-gray-80 hover:bg-gray-5'
              }`}
            >
              {j.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
