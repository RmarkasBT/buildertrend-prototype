import { useMemo, useState } from 'react'
import { useJob } from '../context/JobContext'
import { invoicesByJob, invoiceTotals } from '../data/invoices'
import Badge from '../components/Badge'

const money = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Sub-tabs (Invoices/Payments/Credit memos/Deposits), header stat row (Total
// revised price - Payments = Remaining balance), grid columns (Job/Invoice
// ID/Title/Status/Total price/Total tax/Retainage), and empty state
// ("No invoices yet") copied from /app/OwnerInvoices. Payments/Credit
// memos/Deposits tab bodies were not opened during capture — they render as
// a placeholder here (flagged in CAPTURE_LOG.md) rather than invented content.
export default function Invoices() {
  const { currentJob } = useJob()
  const [tab, setTab] = useState('Invoices')
  const [sort, setSort] = useState({ key: 'id', dir: 'asc' })

  if (!currentJob) return null
  const list = invoicesByJob[currentJob.id] || []
  const totals = invoiceTotals(currentJob.id)

  const sorted = useMemo(() => {
    const copy = [...list]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [list, sort])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const Th = ({ k, children }) => (
    <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort(k)}>
      {children}{sort.key === k ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <div className="p-4">
      <div className="text-xs text-gray-50">{currentJob.name}</div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-90">Invoices</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Help">❓</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Share">⇪</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Filter">▽</button>
          <button className="rounded-sm border border-gray-20 px-3 py-1">+ Payment schedule</button>
          <div className="flex overflow-hidden rounded-sm bg-brand-blue text-white">
            <button className="px-3 py-1 font-semibold">+ Invoice</button>
            <button className="border-l border-white/30 px-2 py-1">▾</button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 border-b border-gray-15 text-sm">
        {['Invoices', 'Payments', 'Credit memos', 'Deposits'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 ${tab === t ? 'border-b-2 border-brand-blue font-semibold text-brand-blue' : 'text-gray-60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== 'Invoices' ? (
        <div className="mt-6 text-sm text-gray-50">No {tab.toLowerCase()} yet.</div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <div>
              <div className="text-xs text-gray-50">Total revised price</div>
              <div className="font-semibold text-gray-90">{money(totals.totalRevisedPrice)}</div>
            </div>
            <span className="text-gray-40">-</span>
            <div>
              <div className="text-xs text-gray-50">Payments</div>
              <div className="font-semibold text-gray-90">{money(totals.payments)}</div>
            </div>
            <span className="text-gray-40">=</span>
            <div>
              <div className="text-xs text-gray-50">Remaining balance</div>
              <div className="font-semibold text-gray-90">{money(totals.remainingBalance)}</div>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="text-4xl">📧</div>
              <div className="mt-3 text-lg font-semibold text-gray-90">No invoices yet</div>
              <div className="mt-1 text-sm text-gray-50">Create and send invoices to your clients quickly and efficiently for more reliable revenue planning.</div>
              <button className="mt-4 rounded-sm border border-gray-20 px-3 py-1.5 text-sm">↗ Learn How</button>
            </div>
          ) : (
            <>
              <table className="mt-4 w-full rounded-md border border-gray-15 bg-white text-sm">
                <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
                  <tr>
                    <th className="px-3 py-2">Job</th>
                    <Th k="id">Invoice ID</Th>
                    <Th k="title">Title</Th>
                    <Th k="status">Status</Th>
                    <Th k="totalPrice">Total price</Th>
                    <Th k="totalTax">Total tax</Th>
                    <Th k="retainage">Retainage</Th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((inv) => (
                    <tr key={inv.id} className="border-t border-gray-15">
                      <td className="px-3 py-2 text-gray-70">{currentJob.name}</td>
                      <td className="px-3 py-2 text-brand-blue">{inv.id}</td>
                      <td className="px-3 py-2">{inv.title}</td>
                      <td className="px-3 py-2"><Badge>{inv.status}</Badge></td>
                      <td className="px-3 py-2">{money(inv.totalPrice)}</td>
                      <td className="px-3 py-2">{money(inv.totalTax)}</td>
                      <td className="px-3 py-2">{money(inv.retainage)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-15 bg-gray-5 font-semibold text-gray-90">
                    <td className="px-3 py-2" colSpan={4}>Totals</td>
                    <td className="px-3 py-2">{money(sorted.reduce((a, i) => a + i.totalPrice, 0))}</td>
                    <td className="px-3 py-2">{money(sorted.reduce((a, i) => a + i.totalTax, 0))}</td>
                    <td className="px-3 py-2">{money(sorted.reduce((a, i) => a + i.retainage, 0))}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-50">
                <select className="rounded-sm border border-gray-20 px-2 py-1" defaultValue="Standard View">
                  <option>Standard View</option>
                </select>
                <span>1-{sorted.length} of {sorted.length} items</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
