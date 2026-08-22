import Modal from './Modal'
import { jobs } from '../data/jobs'

// Layout (banner, Contact Information, Lead Opportunities, Jobs table with
// Job Name/Street Address/City/State/Zip Code/Project Manager columns)
// copied from the live "Client contact" detail page.
function splitAddress(address) {
  const [street, city, stateZip] = address.split(',').map((s) => s.trim())
  const [state, zip] = (stateZip ?? '').split(' ')
  return { street, city: city ?? '', state: state ?? '', zip: zip ?? '' }
}

export default function ContactModal({ contact, onClose }) {
  if (!contact) return null
  const relatedJobs = jobs.filter((j) => j.clients.some((c) => c.id === contact.id))

  return (
    <Modal title="Client contact" onClose={onClose}>
      <div className="rounded-sm bg-info-bg px-3 py-2 text-sm text-info-fg">
        This user maintains their contact information.
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-90">Contact Information</h3>
      <div className="mt-2 text-sm text-gray-80">{contact.name}</div>
      <div className="mt-2 text-sm text-gray-70">
        Cell: <a href={`tel:${contact.phone}`} className="text-brand-blue">{contact.phone}</a>
      </div>
      <div className="mt-2 text-xs text-gray-50">Primary email</div>
      <a href={`mailto:${contact.email}`} className="text-sm text-brand-blue">{contact.email}</a>

      <h3 className="mt-4 text-sm font-semibold text-gray-90">Lead Opportunities</h3>
      <div className="mt-1 text-sm text-gray-50">No Lead Opportunities Found</div>

      <h3 className="mt-4 text-sm font-semibold text-gray-90">Jobs</h3>
      <table className="mt-2 w-full text-xs">
        <thead className="text-left text-gray-50">
          <tr>
            <th className="py-1 pr-2">Job Name</th>
            <th className="py-1 pr-2">Street Address</th>
            <th className="py-1 pr-2">City</th>
            <th className="py-1 pr-2">State</th>
            <th className="py-1">Zip Code</th>
          </tr>
        </thead>
        <tbody>
          {relatedJobs.map((j) => {
            const addr = splitAddress(j.address)
            return (
              <tr key={j.id} className="border-t border-gray-15">
                <td className="py-1.5 pr-2 text-brand-blue">{j.name}</td>
                <td className="py-1.5 pr-2 text-gray-70">{addr.street}</td>
                <td className="py-1.5 pr-2 text-gray-70">{addr.city}</td>
                <td className="py-1.5 pr-2 text-gray-70">{addr.state}</td>
                <td className="py-1.5 text-gray-70">{addr.zip}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Modal>
  )
}
