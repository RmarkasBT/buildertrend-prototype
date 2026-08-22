import { useJob } from '../context/JobContext'
import { budgetByJob, budgetTotals } from '../data/budget'

const money = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dash = (n) => (n === 0 ? '--' : money(n))

// Header stat row (Total revised price / Revised price - Projected cost =
// Projected profit, with lower-profit / profit-margin badges), grouped
// "NN Cost codes" table with Original/Revised/Pending/Committed/Actual/
// Projected/Cost to complete/Revised vs Projected columns, and the
// "Standard view" footer selector copied from /app/JobCostingBudget.
export default function JobCostingBudget() {
  const { currentJob } = useJob()
  if (!currentJob) return null
  const job = budgetByJob[currentJob.id]
  const totals = budgetTotals(job)
  const lowerProfit = totals.profitMargin < 15

  return (
    <div className="p-4">
      <div className="text-xs text-gray-50">{currentJob.name}</div>
      <h1 className="text-xl font-bold text-gray-90">Job Costing Budget</h1>

      <div className="mt-3 flex flex-wrap items-end gap-6">
        <div>
          <div className="text-xs text-gray-50">Total revised price</div>
          <div className="text-lg font-bold text-gray-90">{money(totals.totalRevisedPrice)}</div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <div className="text-xs text-gray-50">Revised price</div>
            <div className="text-lg font-bold text-gray-90">{money(totals.totalRevisedPrice)}</div>
          </div>
          <span className="pb-1 text-gray-40">-</span>
          <div>
            <div className="text-xs text-gray-50">Projected cost</div>
            <div className="text-lg font-bold text-gray-90">{money(totals.projected)}</div>
          </div>
          <span className="pb-1 text-gray-40">=</span>
          <div>
            <div className="text-xs text-gray-50">Projected profit</div>
            <div className="text-lg font-bold text-gray-90">{money(totals.projectedProfit)}</div>
          </div>
        </div>
      </div>
      <div className="mt-1 flex gap-3 text-xs">
        {lowerProfit && <span className="rounded-sm bg-danger-bg px-2 py-0.5 text-danger-fg">↓ {Math.round(100 - totals.profitMargin)}% lower profit</span>}
        <span className="rounded-sm bg-gray-15 px-2 py-0.5 text-gray-70">{totals.profitMargin.toFixed(0)}% profit margin</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-gray-15 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase text-gray-50">
              <th className="px-3 pt-2">Cost categories</th>
              <th className="px-3 pt-2" colSpan={5}>Job costing</th>
              <th className="px-3 pt-2" colSpan={2}>Profit</th>
            </tr>
            <tr className="border-b border-gray-15 text-left text-xs font-semibold text-gray-70">
              <th className="px-3 py-2">Cost codes</th>
              <th className="px-3 py-2">Original budget</th>
              <th className="px-3 py-2">Revised budget</th>
              <th className="px-3 py-2">Pending costs</th>
              <th className="px-3 py-2">Committed costs</th>
              <th className="px-3 py-2">Actual costs</th>
              <th className="px-3 py-2">Projected costs</th>
              <th className="px-3 py-2">Cost to complete</th>
              <th className="px-3 py-2">Revised vs projected</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-15 bg-gray-5 font-semibold text-gray-90">
              <td className="px-3 py-2">{job.groupLabel}</td>
              <td className="px-3 py-2">{money(job.rows.reduce((a, r) => a + r.original, 0))}</td>
              <td className="px-3 py-2">{money(job.rows.reduce((a, r) => a + r.revised, 0))}</td>
              <td className="px-3 py-2">{dash(totals.pending)}</td>
              <td className="px-3 py-2">{dash(totals.committed)}</td>
              <td className="px-3 py-2">{dash(totals.actual)}</td>
              <td className="px-3 py-2">{money(totals.projected)}</td>
              <td className="px-3 py-2">{money(totals.costToComplete)}</td>
              <td className={`px-3 py-2 ${totals.revisedVsProjected < 0 ? 'bg-danger-bg text-danger-fg' : ''}`}>
                {totals.revisedVsProjected < 0 ? '-' : ''}{money(Math.abs(totals.revisedVsProjected))}
              </td>
            </tr>
            {job.rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-50">No budget line items yet.</td></tr>
            ) : job.rows.map((r) => (
              <tr key={r.code} className="border-b border-gray-15 last:border-b-0">
                <td className="px-3 py-2 font-medium text-gray-90">{r.code} {r.name}</td>
                <td className="px-3 py-2">{dash(r.original)}</td>
                <td className="px-3 py-2">{dash(r.revised)}</td>
                <td className="px-3 py-2">{dash(r.pending)}</td>
                <td className="px-3 py-2">{dash(r.committed)}</td>
                <td className="px-3 py-2">{dash(r.actual)}</td>
                <td className="px-3 py-2 text-brand-blue">{dash(r.projected)}</td>
                <td className="px-3 py-2">{dash(r.costToComplete)}</td>
                <td className={`px-3 py-2 ${r.revisedVsProjected < 0 ? 'bg-danger-bg text-danger-fg' : ''}`}>
                  {r.revisedVsProjected < 0 ? '-' : ''}{dash(Math.abs(r.revisedVsProjected))}
                </td>
              </tr>
            ))}
          </tbody>
          {job.rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-5 font-semibold text-gray-90">
                <td className="px-3 py-2">Totals</td>
                <td className="px-3 py-2">{money(job.rows.reduce((a, r) => a + r.original, 0))}</td>
                <td className="px-3 py-2">{money(job.rows.reduce((a, r) => a + r.revised, 0))}</td>
                <td className="px-3 py-2">{dash(totals.pending)}</td>
                <td className="px-3 py-2">{dash(totals.committed)}</td>
                <td className="px-3 py-2">{dash(totals.actual)}</td>
                <td className="px-3 py-2">{money(totals.projected)}</td>
                <td className="px-3 py-2">{money(totals.costToComplete)}</td>
                <td className="px-3 py-2">{money(totals.revisedVsProjected)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-gray-70">
        <select className="rounded-sm border border-gray-20 px-2 py-1 text-sm" defaultValue="Standard view">
          <option>Standard view</option>
        </select>
        <button className="text-gray-40">⋯</button>
      </div>
    </div>
  )
}
