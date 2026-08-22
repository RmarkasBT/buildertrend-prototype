import { jobs } from './jobs'

// Company-wide "Client Contacts" directory (/app/Contacts — Display Name,
// Activation Status, Primary Phone, Cell Phone, Street Address, City,
// State, Zip Code, Jobs count). Derived from the per-job `clients` data
// rather than duplicated, since every contact observed there was scoped to
// one or more jobs. Address is only shown when the contact has exactly one
// associated job, matching the many blank-address rows seen in the real
// directory for contacts without a single clear job address on file.
function splitAddress(address) {
  const [street, city, stateZip] = address.split(',').map((s) => s.trim())
  const [state, zip] = (stateZip ?? '').split(' ')
  return { street, city: city ?? '', state: state ?? '', zip: zip ?? '' }
}

export function getClientContacts() {
  const byId = new Map()
  for (const job of jobs) {
    for (const client of job.clients) {
      if (!byId.has(client.id)) {
        byId.set(client.id, { ...client, jobs: [] })
      }
      byId.get(client.id).jobs.push(job)
    }
  }
  return [...byId.values()].map((c) => {
    const addr = c.jobs.length === 1 ? splitAddress(c.jobs[0].address) : null
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      lastActive: c.lastActive,
      street: addr?.street ?? '',
      city: addr?.city ?? '',
      state: addr?.state ?? '',
      zip: addr?.zip ?? '',
      jobCount: c.jobs.length,
    }
  })
}
