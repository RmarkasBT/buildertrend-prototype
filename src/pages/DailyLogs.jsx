import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import { useDailyLogs, useDailyLogSettings } from '../hooks/useDailyLogs'
import * as dailyLogApi from '../api/dailyLogApi'
import DailyLogCard from '../components/DailyLogCard'
import DailyLogFilterPanel from '../components/DailyLogFilterPanel'
import DailyLogSettingsModal from '../components/DailyLogSettingsModal'
import Modal from '../components/Modal'
import { EMPTY_FILTERS, activeFilterCount } from '../lib/dailyLogFilters'
import { longDate, relativeTime, shareLabel } from '../lib/dailyLogFormat'
import {
  IconQuestionCircle, IconGear, IconPrinter, IconFilter, IconPlus,
  IconNotebook, IconExternalLink,
} from '../components/icons'

// The Daily Logs list. Header actions (help, settings, print, filter with a
// count badge, + Daily Log), the empty state, the card list and the
// "1-N of N items" footer all follow the live /app/DailyLogs page.
export default function DailyLogs() {
  const { currentJob } = useJob()
  const navigate = useNavigate()
  // Filters are stored alongside the job they were set on, so switching jobs
  // falls back to EMPTY_FILTERS during render rather than via a reset effect
  // — a criterion set on one job must not silently hide every log on the
  // next, and an effect here would render the stale list for one frame first.
  const [filterState, setFilterState] = useState({ jobId: null, filters: EMPTY_FILTERS })
  const [filterOpen, setFilterOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [infoLog, setInfoLog] = useState(null)
  const [availableTags, setAvailableTags] = useState([])

  const jobId = currentJob?.id
  const filters = filterState.jobId === jobId ? filterState.filters : EMPTY_FILTERS
  const setFilters = (next) => setFilterState({ jobId, filters: next })
  const { logs, loading, error, like } = useDailyLogs(jobId, filters)
  const { settings, save: saveSettings } = useDailyLogSettings()

  // Tag suggestions come from the job's existing logs, so the drawer only
  // ever offers tags that can actually match something.
  useEffect(() => {
    if (!jobId) return
    dailyLogApi.listTags(jobId).then(setAvailableTags).catch(() => setAvailableTags([]))
  }, [jobId, logs])

  if (!currentJob) return null
  const filterCount = activeFilterCount(filters)

  const iconButton = 'rounded-sm p-1.5 text-gray-50 hover:bg-gray-10 hover:text-gray-80'

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-50">{currentJob.name}</div>
          <h1 className="mt-1 text-3xl font-bold text-gray-90">Daily Logs</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className={iconButton} title="Help"><IconQuestionCircle /></button>
          <button className={iconButton} title="Settings" onClick={() => setSettingsOpen(true)}>
            <IconGear />
          </button>
          <button className={iconButton} title="Print" onClick={() => window.print()}>
            <IconPrinter />
          </button>
          <button className={`relative ${iconButton}`} title="Filter" onClick={() => setFilterOpen(true)}>
            <IconFilter />
            {filterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-semibold text-white">
                {filterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/daily-logs/new')}
            className="ml-2 flex items-center gap-1.5 rounded-sm bg-brand-blue px-3 py-2 text-sm font-semibold text-white hover:bg-info-fg"
          >
            <IconPlus className="h-4 w-4" />
            Daily Log
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-danger-bg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          Couldn't load daily logs: {error}
        </div>
      )}

      {loading && logs.length === 0 && <p className="mt-10 text-center text-sm text-gray-50">Loading daily logs…</p>}

      {!loading && logs.length === 0 && (
        <div className="mt-20 flex flex-col items-center text-center">
          <IconNotebook className="h-12 w-12 text-gray-90" />
          <h2 className="mt-4 text-xl font-bold text-gray-90">
            {filterCount > 0 ? 'No daily logs match this filter' : 'Track project progress with daily logs'}
          </h2>
          <p className="mt-1.5 text-sm text-gray-60">
            {filterCount > 0
              ? 'Try clearing a criterion in the filter panel.'
              : 'Document and share project updates with your team, subs, and clients.'}
          </p>
          <div className="mt-5 flex gap-2">
            {filterCount > 0 ? (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="rounded-sm border border-gray-20 bg-white px-3 py-2 text-sm text-gray-80 hover:bg-gray-5"
              >
                Clear filters
              </button>
            ) : (
              <button className="flex items-center gap-1.5 rounded-sm border border-gray-20 bg-white px-3 py-2 text-sm text-gray-80 hover:bg-gray-5">
                <IconExternalLink className="h-4 w-4" />
                Learn How
              </button>
            )}
            <Link
              to="/daily-logs/new"
              className="rounded-sm bg-brand-blue px-3 py-2 text-sm font-semibold text-white hover:bg-info-fg"
            >
              Add a Daily Log
            </Link>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <>
          <div className="mt-4 space-y-4">
            {logs.map((log) => (
              <DailyLogCard
                key={log.id}
                log={log}
                jobName={currentJob.name}
                onLike={like}
                onPrint={() => window.print()}
                onInfo={setInfoLog}
              />
            ))}
          </div>
          <div className="mt-3 text-right text-xs text-gray-50">
            1-{logs.length} of {logs.length} items
          </div>
        </>
      )}

      {filterOpen && (
        <DailyLogFilterPanel
          filters={filters}
          availableTags={availableTags}
          onApply={setFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {settingsOpen && settings && (
        <DailyLogSettingsModal settings={settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />
      )}

      {infoLog && (
        <Modal title="Daily Log info" onClose={() => setInfoLog(null)}>
          <dl className="space-y-2 text-sm">
            {[
              ['Date', longDate(infoLog.date)],
              ['Created by', infoLog.createdBy],
              ['Created', relativeTime(infoLog.createdAt)],
              ['Last updated', relativeTime(infoLog.updatedAt)],
              ['Shared with', shareLabel(infoLog)],
              ['Status', infoLog.status === 'draft' ? 'Draft' : 'Published'],
              ['Tags', infoLog.tags.join(', ') || '—'],
              ['Photos', String(infoLog.photos.length)],
              ['Notified', infoLog.notifyUsers.join(', ') || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-gray-60">{label}</dt>
                <dd className="text-right font-medium text-gray-90">{value}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  )
}
