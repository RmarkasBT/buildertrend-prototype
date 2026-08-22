import { useState } from 'react'
import Avatar from './Avatar'

// Hover/click card (status badge, name, last-active, email, Send message /
// Call / Chat / View contact actions) copied from the live client-contact
// popover on the job dashboard's Clients section.
export default function ContactChip({ contact, onViewContact }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title={contact.name}>
        <Avatar name={contact.name} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border border-gray-15 bg-white p-3 text-sm shadow-lg" onMouseLeave={() => setOpen(false)}>
          <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${contact.status === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-gray-15 text-gray-70'}`}>
            {contact.status}
          </span>
          <div className="mt-1 font-semibold text-gray-90">{contact.name}</div>
          <div className="text-xs text-gray-50">
            Last active: {new Date(contact.lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="mt-2 space-y-1.5">
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-brand-blue">✉ {contact.email}</a>
            <button className="flex items-center gap-2 text-gray-70">➤ Send message</button>
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-gray-70">📞 Call</a>
            <button className="flex items-center gap-2 text-gray-70">💬 Chat</button>
            <button
              onClick={() => { setOpen(false); onViewContact?.(contact) }}
              className="flex items-center gap-2 text-gray-70"
            >
              👤 View contact
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
