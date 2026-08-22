// Shape matches the real company-wide "Subs/vendors" directory
// (/app/Sub — Company name, Sub/vendor divisions, Activation, Primary
// contact, Trade agreement status, Liability exp., Worker's comp exp.,
// Cell, Phone) and its detail modal (Division/trade, Business phone, Fax,
// Cell phone, email, address, Activation status w/ Invite/Disable).
// Only "Ready for Invite", "No Email", and "Pending" activation values were
// observed — no other statuses are used. Trade agreement status and the two
// expiration date columns were blank on every row checked in this session,
// so they stay blank here too rather than inventing sample values. Company
// and contact names are fictional.
export const subsVendors = [
  {
    id: 'sv1', name: 'Lonestar Concrete & Masonry', color: 'amber',
    division: 'Concrete', activation: 'Ready for Invite', primaryContact: 'Reyes Ibarra',
    businessPhone: '(512) 555-0142', fax: '', cell: '', email: 'reyes@lonestarconcrete.example.com',
  },
  {
    id: 'sv2', name: 'Hill Country Electric', color: 'coral',
    division: 'Electrical', activation: 'Ready for Invite', primaryContact: 'Wendy Trask',
    businessPhone: '(512) 555-0187', fax: '', cell: '+15125550187', email: 'wendy@hillcountryelectric.example.com',
  },
  {
    id: 'sv3', name: 'Precision Framing Co.', color: 'green',
    division: 'Framing', activation: 'Ready for Invite', primaryContact: 'Not specified',
    businessPhone: '', fax: '', cell: '(512) 555-0163', email: '',
  },
  {
    id: 'sv4', name: 'Round Rock Ready-Mix', color: 'blue',
    division: 'Concrete', activation: 'No Email', primaryContact: '',
    businessPhone: '(512) 555-0119', fax: '', cell: '', email: '',
  },
  {
    id: 'sv5', name: 'BlueBonnet Roofing', color: 'gray',
    division: 'Roofing', activation: 'Pending', primaryContact: 'Marcus Oduya',
    businessPhone: '', fax: '', cell: '+15125550171', email: 'marcus@bluebonnetroofing.example.com',
  },
  {
    id: 'sv6', name: 'Apex HVAC Solutions', color: 'coral',
    division: 'HVAC', activation: 'Ready for Invite', primaryContact: 'Not specified',
    businessPhone: '(512) 555-0155', fax: '', cell: '', email: '',
  },
  {
    id: 'sv7', name: 'Chandran Earthworks', color: 'green',
    division: 'Site Work', activation: 'Ready for Invite', primaryContact: 'Devon Chandran',
    businessPhone: '', fax: '', cell: '(512) 555-0176', email: 'devon@chandranearthworks.example.com',
  },
]

export function findSub(name) {
  return subsVendors.find((s) => s.name === name) ?? null
}
