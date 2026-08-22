import { useMemo, useState } from 'react'
import { getClientContacts } from '../data/clientContacts'
import Badge from '../components/Badge'
import ContactModal from '../components/ContactModal'

// Company-wide directory copied from /app/Contacts: Display Name,
// Activation Status, Primary Phone, Cell Phone, Street Address, City,
// State, Zip Code, Jobs count. Export/Filter/+Contact toolbar, sortable
// Display Name column, "Standard View" + page-size footer.
export default function ClientContacts() {
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [viewing, setViewing] = useState(null)
  const contacts = useMemo(() => getClientContacts(), [])

  const sorted = useMemo(() => {
    const copy = [...contacts]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = typeof av === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [contacts, sort])

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
        <h1 className="text-xl font-bold text-gray-90">Client Contacts</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Export">⇪</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Filter">▽</button>
          <button className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white">+ Contact</button>
        </div>
      </div>

      <table className="mt-4 w-full rounded-md border border-gray-15 bg-white text-sm">
        <thead className="bg-gray-5 text-left text-xs font-semibold text-gray-60">
          <tr>
            <Th k="name">Display Name</Th>
            <Th k="status">Activation Status</Th>
            <th className="px-3 py-2">Primary Phone</th>
            <th className="px-3 py-2">Cell Phone</th>
            <th className="px-3 py-2">Street Address</th>
            <th className="px-3 py-2">City</th>
            <th className="px-3 py-2">State</th>
            <th className="px-3 py-2">Zip Code</th>
            <Th k="jobCount">Jobs</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="border-t border-gray-15">
              <td className="px-3 py-2">
                <button onClick={() => setViewing(c)} className="text-brand-blue">{c.name}</button>
              </td>
              <td className="px-3 py-2"><Badge>{c.status}</Badge></td>
              <td className="px-3 py-2 text-gray-40">—</td>
              <td className="px-3 py-2 text-gray-70">{c.phone}</td>
              <td className="px-3 py-2 text-gray-70">{c.street || '—'}</td>
              <td className="px-3 py-2 text-gray-70">{c.city || '—'}</td>
              <td className="px-3 py-2 text-gray-70">{c.state || '—'}</td>
              <td className="px-3 py-2 text-gray-70">{c.zip || '—'}</td>
              <td className="px-3 py-2 text-gray-70">{c.jobCount}</td>
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

      {viewing && <ContactModal contact={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
