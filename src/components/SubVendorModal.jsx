import { useState } from 'react'
import Modal from './Modal'
import Badge from './Badge'

// Layout (Activation status row w/ Invite/Disable, Contact information
// fields, Additional information/Notifications/Job access/Trade agreement
// tabs, Preferences checkboxes) copied from the real Sub/Vendor detail
// modal opened from the Subs/vendors directory.
const TABS = ['Additional information', 'Notifications', 'Job access', 'Trade agreement']

export default function SubVendorModal({ sub, onClose }) {
  const [tab, setTab] = useState('Additional information')

  return (
    <Modal title={sub.name} onClose={onClose}>
      <div className="flex items-center justify-between rounded-sm bg-gray-5 px-3 py-2">
        <span className="text-sm text-gray-70">Activation status: <Badge>{sub.activation}</Badge></span>
        <div className="flex gap-2">
          <button className="rounded-sm border border-gray-20 px-2 py-1 text-xs">Invite sub/vendor</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1 text-xs">Disable</button>
        </div>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-90">Contact information</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-gray-50">Company name</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5" defaultValue={sub.name} readOnly />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-50">Division/trade</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5" defaultValue={sub.division} readOnly />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-50">Primary contact</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5" defaultValue={sub.primaryContact} readOnly />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-50">Business phone</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5" defaultValue={sub.businessPhone} readOnly />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-50">Cell phone</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5" defaultValue={sub.cell} readOnly />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-50">Fax</label>
          <input className="w-full rounded-sm border border-gray-20 px-2 py-1.5" defaultValue={sub.fax} readOnly />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-gray-50">Email</label>
        <div className="text-sm text-brand-blue">{sub.email || '—'}</div>
      </div>

      <div className="mt-4 flex gap-3 border-b border-gray-15 text-xs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 ${tab === t ? 'border-b-2 border-brand-blue font-semibold text-brand-blue' : 'text-gray-60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Additional information' ? (
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="text-xs font-semibold text-gray-90">Preferences</div>
          <label className="flex items-center gap-2 text-gray-70"><input type="checkbox" readOnly /> View client information</label>
          <label className="flex items-center gap-2 text-gray-70"><input type="checkbox" readOnly /> Automatically permit access to new jobs</label>
          <label className="flex items-center gap-2 text-gray-70"><input type="checkbox" readOnly /> Share documents with client</label>
        </div>
      ) : (
        <div className="mt-3 text-sm text-gray-50">No {tab.toLowerCase()} to show.</div>
      )}
    </Modal>
  )
}
