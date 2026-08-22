import { useMemo, useState } from 'react'
import { subsVendors } from '../data/subsVendors'
import Badge from '../components/Badge'
import SubVendorModal from '../components/SubVendorModal'

// Company-wide directory copied from /app/Sub: Company name, Sub/vendor
// divisions, Activation, Primary contact, Trade agreement status,
// Liability exp., Worker's comp exp., Cell, Phone. Export/Filter/Import/
// +Sub/vendor toolbar, sortable Company name column, "Standard View" +
// page-size footer.
export default function SubsVendors() {
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [editing, setEditing] = useState(null)

  const sorted = useMemo(() => {
    const copy = [...subsVendors]
    copy.sort((a, b) => {
      const cmp = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [sort])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const Th = ({ k, children }) => (
    <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort(k)}>
      {children}{sort.key === k ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-90">Subs/vendors</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Export">⇪</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Filter">▽</button>
          <button className="rounded-sm border border-gray-20 px-3 py-1">Import</button>
          <button className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white">+ Sub/vendor</button>
        </div>
      </div>

      <table className="mt-4 w-full rounded-md border border-gray-15 bg-white text-sm">
        <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
          <tr>
            <Th k="name">Company name</Th>
            <th className="px-3 py-2">Sub/vendor divisions</th>
            <Th k="activation">Activation</Th>
            <Th k="primaryContact">Primary contact</Th>
            <th className="px-3 py-2">Trade agreement status</th>
            <th className="px-3 py-2">Liability exp.</th>
            <th className="px-3 py-2">Worker's comp exp.</th>
            <th className="px-3 py-2">Cell</th>
            <th className="px-3 py-2">Phone</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((sv) => (
            <tr key={sv.id} className="border-t border-gray-15">
              <td className="px-3 py-2">
                <button onClick={() => setEditing(sv)} className="text-brand-blue">{sv.name}</button>
              </td>
              <td className="px-3 py-2 text-gray-70">{sv.division || '—'}</td>
              <td className="px-3 py-2"><Badge>{sv.activation}</Badge></td>
              <td className="px-3 py-2 text-gray-70">{sv.primaryContact || '—'}</td>
              <td className="px-3 py-2 text-gray-40">—</td>
              <td className="px-3 py-2 text-gray-40">—</td>
              <td className="px-3 py-2 text-gray-40">—</td>
              <td className="px-3 py-2 text-gray-70">{sv.cell || ''}</td>
              <td className="px-3 py-2 text-gray-70">{sv.businessPhone || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-50">
        <select className="rounded-sm border border-gray-20 px-2 py-1" defaultValue="Standard View">
          <option>Standard View</option>
        </select>
        <span>1-{sorted.length} of {sorted.length} items</span>
      </div>

      {editing && <SubVendorModal sub={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
