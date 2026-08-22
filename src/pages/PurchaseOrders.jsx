import { useMemo, useState } from 'react'
import { useJob } from '../context/JobContext'
import { purchaseOrdersByJob } from '../data/purchaseOrders'
import { findSub } from '../data/subsVendors'
import Badge from '../components/Badge'
import SubChip from '../components/SubChip'

// Sub-tabs (Purchase Orders/Bills), grid columns (Job/PO #/Title/PO Status/
// Work Status/Performed By/Created Date/Actions), and footer ("Standard
// View" + page-size selector + item count) copied from /app/PurchaseOrders.
// The "Bills" tab body was not opened during capture — it renders as a
// placeholder here (flagged in CAPTURE_LOG.md) rather than invented content.
export default function PurchaseOrders() {
  const { currentJob } = useJob()
  const [tab, setTab] = useState('Purchase Orders')
  const [sort, setSort] = useState({ key: 'createdDate', dir: 'desc' })

  if (!currentJob) return null
  const list = purchaseOrdersByJob[currentJob.id] || []

  const sorted = useMemo(() => {
    const copy = [...list]
    copy.sort((a, b) => {
      const cmp = String(a[sort.key]).localeCompare(String(b[sort.key]))
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
        <h1 className="text-xl font-bold text-gray-90">Purchase Orders</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Help">❓</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Share">⇪</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Filter">▽</button>
          <div className="flex overflow-hidden rounded-sm bg-brand-blue text-white">
            <button className="px-3 py-1 font-semibold">+ Purchase Order</button>
            <button className="border-l border-white/30 px-2 py-1">▾</button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 border-b border-gray-15 text-sm">
        {['Purchase Orders', 'Bills'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 ${tab === t ? 'border-b-2 border-brand-blue font-semibold text-brand-blue' : 'text-gray-60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== 'Purchase Orders' ? (
        <div className="mt-6 text-sm text-gray-50">No bills yet.</div>
      ) : (
        <>
          <table className="mt-3 w-full rounded-md border border-gray-15 bg-white text-sm">
            <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
              <tr>
                <th className="px-3 py-2">Job</th>
                <Th k="po">PO #</Th>
                <Th k="title">Title</Th>
                <Th k="poStatus">PO Status</Th>
                <Th k="workStatus">Work Status</Th>
                <Th k="performedBy">Performed By</Th>
                <Th k="createdDate">Created Date</Th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-50">No purchase orders yet.</td></tr>
              ) : sorted.map((po) => (
                <tr key={po.po} className="border-t border-gray-15">
                  <td className="px-3 py-2 text-gray-70">{currentJob.name}</td>
                  <td className="px-3 py-2 text-brand-blue">{po.po}</td>
                  <td className="px-3 py-2">{po.title}</td>
                  <td className="px-3 py-2"><Badge>{po.poStatus}</Badge></td>
                  <td className="px-3 py-2"><Badge>{po.workStatus}</Badge></td>
                  <td className="px-3 py-2">
                    {po.performedBy ? (
                      findSub(po.performedBy)
                        ? <SubChip sub={findSub(po.performedBy)} />
                        : po.performedBy
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2">{new Date(po.createdDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-3 py-2 text-gray-40">✎</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-50">
            <select className="rounded-sm border border-gray-20 px-2 py-1" defaultValue="Standard View">
              <option>Standard View</option>
            </select>
            <div className="flex items-center gap-3">
              <span>1-{sorted.length} of {sorted.length} items</span>
              <select className="rounded-sm border border-gray-20 px-2 py-1" defaultValue="50">
                <option>50 / page</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
