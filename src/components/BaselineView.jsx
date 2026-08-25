import { useCallback, useEffect, useState } from 'react'
import * as baselineApi from '../api/baselineApi'
import { describeSlip } from '../lib/baseline'
import { fmtDate, fmtDateShort } from '../lib/dates'

// The Schedule page's Baseline tab. A baseline freezes the plan as agreed, and
// this measures the live schedule against it — what BT describes as expected
// vs. actual start dates, durations, and the slips between them.
//
// Slips are CALENDAR days and positive means late, because "three days behind"
// to a builder means three days on the wall calendar. Durations are in WORKING
// days, matching the rest of the app.

const STATUS_STYLE = {
  behind: 'bg-danger-bg text-danger-fg',
  ahead: 'bg-success-bg text-success-fg',
  on_plan: 'bg-gray-10 text-gray-70',
  added: 'bg-info-bg text-brand-blue',
  removed: 'bg-gray-10 text-gray-50',
}
const STATUS_LABEL = {
  behind: 'Behind',
  ahead: 'Ahead',
  on_plan: 'On plan',
  added: 'Added since',
  removed: 'Removed since',
}

function Chip({ label, value, tone = 'text-gray-70' }) {
  return (
    <div className="rounded-md border border-gray-15 bg-white px-3 py-2">
      <div className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs text-gray-50">{label}</div>
    </div>
  )
}

export default function BaselineView({ jobId, setSignal = 0 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    if (!jobId) return
    setLoading(true)
    setError(null)
    baselineApi
      .getBaseline(jobId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => { refresh() }, [refresh])

  // The Set Baseline button lives in the page toolbar (BT keeps one toolbar
  // across tabs), so it reaches in via a counter rather than a callback.
  useEffect(() => {
    if (setSignal > 0) set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSignal])

  const set = () => {
    setBusy(true)
    baselineApi
      .setBaseline(jobId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
  }

  if (loading && !data) return <div className="mt-4 text-sm text-gray-50">Loading baseline…</div>

  const baseline = data?.baseline
  const summary = data?.summary
  const slip = summary?.projectEnd?.slip ?? 0

  return (
    <div className="mt-4">
      {error && (
        <div className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</div>
      )}

      {!baseline ? (
        <div className="rounded-md border border-gray-15 bg-white px-4 py-8 text-center">
          <div className="text-sm font-semibold text-gray-90">No baseline set</div>
          <p className="mx-auto mt-1 max-w-lg text-sm text-gray-60">
            A baseline freezes the schedule as agreed, so you can see where the job has drifted
            from the original plan. Set it once the initial schedule is complete.
          </p>
          {/* No button here: Set Baseline lives in the page toolbar, and two
              identical primary buttons a few inches apart is worse than one. */}
          <p className="mt-3 text-xs text-gray-50">
            {busy ? 'Setting…' : 'Use Set Baseline above to capture the current schedule.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-90">{baseline.name}</div>
              <div className="mt-0.5 text-xs text-gray-50">
                Set by {baseline.createdBy} on {fmtDate(baseline.createdAt.slice(0, 10))} ·{' '}
                {baseline.itemCount} item{baseline.itemCount === 1 ? '' : 's'}
              </div>
            </div>
            {busy && <span className="shrink-0 text-sm text-gray-50">Setting…</span>}
          </div>

          {/* The headline: has the finish date moved? Everything else is detail. */}
          <div className="mt-3 rounded-md border border-gray-15 bg-gray-5 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-50">
              Project finish
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-sm tabular-nums text-gray-60 line-through">
                {fmtDateShort(summary.projectEnd.baseline)}
              </span>
              <span className="text-gray-40">→</span>
              <span className="text-lg font-semibold tabular-nums text-gray-90">
                {fmtDateShort(summary.projectEnd.current)}
              </span>
              <span
                className={`rounded-sm px-1.5 py-0.5 text-xs font-semibold ${
                  slip > 0 ? 'bg-danger-bg text-danger-fg' : slip < 0 ? 'bg-success-bg text-success-fg' : 'bg-gray-10 text-gray-70'
                }`}
              >
                {describeSlip(slip)}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Chip label="Behind" value={summary.behind} tone={summary.behind ? 'text-danger-fg' : 'text-gray-70'} />
            <Chip label="On plan" value={summary.onPlan} />
            <Chip label="Ahead" value={summary.ahead} tone={summary.ahead ? 'text-success-fg' : 'text-gray-70'} />
            <Chip label="Added since" value={summary.added} />
            <Chip label="Removed since" value={summary.removed} />
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] rounded-md border border-gray-15 bg-white text-sm">
              <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Baseline</th>
                  <th className="px-3 py-2">Current</th>
                  <th className="px-3 py-2 text-right">Start</th>
                  <th className="px-3 py-2 text-right">Finish</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.itemId} className="border-t border-gray-15">
                    <td className="px-3 py-2 text-gray-90">{r.title}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-sm px-1.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-60">
                      {r.baseline ? `${fmtDateShort(r.baseline.start)} – ${fmtDateShort(r.baseline.end)}` : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-90">
                      {r.current ? `${fmtDateShort(r.current.start)} – ${fmtDateShort(r.current.end)}` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${r.startSlip > 0 ? 'text-danger-fg' : r.startSlip < 0 ? 'text-success-fg' : 'text-gray-40'}`}>
                      {r.baseline && r.current ? (r.startSlip === 0 ? '—' : `${r.startSlip > 0 ? '+' : ''}${r.startSlip}d`) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${r.endSlip > 0 ? 'text-danger-fg' : r.endSlip < 0 ? 'text-success-fg' : 'text-gray-40'}`}>
                      {r.baseline && r.current ? (r.endSlip === 0 ? '—' : `${r.endSlip > 0 ? '+' : ''}${r.endSlip}d`) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-70">
                      {r.baseline && r.current ? (
                        r.durationDelta === 0
                          ? `${r.current.workDays}d`
                          : `${r.baseline.workDays}d → ${r.current.workDays}d`
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-50">
            Start and Finish columns are the slip in calendar days — positive is late. Durations
            are working days.
          </p>
        </>
      )}
    </div>
  )
}
