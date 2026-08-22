// Fictional jobs. Field shape (status badge, address, clocked-in count) matches
// what was observed on the live job dashboard sidebar and job card. `clients`
// shape (name/email/phone/status) matches the Job Info > Clients tab contact
// card and the "Client contact" detail popup — only the values are invented.
// `subIds` reference src/data/subsVendors.js, matching the Job Info >
// Subs/vendors tab (name + avatar only, as observed there).
export const jobs = [
  {
    id: 'j1',
    name: 'Willow Creek Remodel',
    status: 'Open',
    address: '4821 Willow Creek Dr, Round Rock, TX 78664',
    clients: [
      { id: 'c1', name: 'Dana Ferris', email: 'dana.ferris@example.com', phone: '+15125550142', status: 'Active', lastActive: '2026-08-19' },
    ],
    projectManagers: ['Sam Okafor'],
    subIds: ['sv1', 'sv2', 'sv3', 'sv4'],
    clockedIn: 2,
  },
  {
    id: 'j2',
    name: 'Prairie Oak Addition',
    status: 'Open',
    address: '1902 Prairie Oak Ln, Georgetown, TX 78626',
    clients: [
      { id: 'c2', name: 'Marcus Webb', email: 'marcus.webb@example.com', phone: '+15125550198', status: 'Active', lastActive: '2026-08-11' },
    ],
    projectManagers: ['Sam Okafor'],
    subIds: [],
    clockedIn: 0,
  },
  {
    id: 'j3',
    name: 'Sundance Ridge New Build',
    status: 'Open',
    address: '77 Sundance Ridge Ct, Leander, TX 78641',
    clients: [
      { id: 'c3', name: 'Priya Chandran', email: 'priya.chandran@example.com', phone: '+15125550176', status: 'Active', lastActive: '2026-08-19' },
    ],
    projectManagers: ['Ellie Marsh'],
    subIds: ['sv7', 'sv3'],
    clockedIn: 4,
  },
  {
    id: 'j4',
    name: 'Copper Hollow Renovation',
    status: 'Open',
    address: '350 Copper Hollow Rd, Austin, TX 78745',
    clients: [
      { id: 'c4', name: 'Isabel Alvarez', email: 'isabel.alvarez@example.com', phone: '+15125550120', status: 'Active', lastActive: '2026-08-05' },
      { id: 'c5', name: 'Marco Alvarez', email: 'marco.alvarez@example.com', phone: '+15125550121', status: 'Active', lastActive: '2026-08-02' },
    ],
    projectManagers: ['Ellie Marsh'],
    subIds: ['sv5'],
    clockedIn: 0,
  },
  {
    id: 'j5',
    name: 'Birchwood Commons Unit 4',
    status: 'Open',
    address: '12 Birchwood Commons, Pflugerville, TX 78660',
    clients: [
      { id: 'c6', name: 'Nate Holloway', email: 'nate.holloway@example.com', phone: '+15125550163', status: 'Inactive', lastActive: '2026-05-30' },
    ],
    projectManagers: ['Sam Okafor'],
    subIds: ['sv6'],
    clockedIn: 1,
  },
  {
    id: 'j6',
    name: 'Fenwick Lake House',
    status: 'Open',
    address: '900 Fenwick Lake Rd, Dripping Springs, TX 78620',
    clients: [],
    projectManagers: ['Ellie Marsh'],
    subIds: [],
    clockedIn: 0,
  },
]

export const defaultJobId = jobs[0].id
