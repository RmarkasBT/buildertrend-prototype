// Column shape (PO #, Title, PO Status, Work Status, Performed By, Created
// Date) matches the real Purchase Orders grid. Only "Draft" (PO Status) and
// "Not Complete" (Work Status) were directly observed — other values likely
// exist (e.g. Sent, Complete) but aren't included since they weren't confirmed.
export const purchaseOrdersByJob = {
  j1: [
    { po: '0012', title: 'Lumber Package — Framing', poStatus: 'Draft', workStatus: 'Not Complete', performedBy: '', createdDate: '2026-07-28' },
    { po: '0011', title: 'Windows & Exterior Doors', poStatus: 'Draft', workStatus: 'Not Complete', performedBy: '', createdDate: '2026-07-25' },
    { po: '0010', title: 'Concrete & Rebar', poStatus: 'Draft', workStatus: 'Not Complete', performedBy: 'Round Rock Ready-Mix', createdDate: '2026-07-10' },
  ],
  j3: [
    { po: '0002', title: 'Site Grading & Excavation', poStatus: 'Draft', workStatus: 'Not Complete', performedBy: 'Chandran Earthworks', createdDate: '2026-07-30' },
  ],
  j2: [],
  j4: [],
  j5: [],
  j6: [],
}
