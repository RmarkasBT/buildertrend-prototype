// Column shape (Invoice ID, Title, Status, Total price, Total tax, Retainage)
// matches the real Invoices grid. Only "Paid" and "Draft" status values were
// directly observed in the live session — other statuses likely exist
// (e.g. Sent, Overdue) but are not included since they weren't confirmed.
export const invoicesByJob = {
  j1: [
    { id: '0001', title: 'First Draw', status: 'Paid', totalPrice: 42500, totalTax: 0, retainage: 0 },
    { id: '0002', title: 'Foundation & Framing Draw', status: 'Paid', totalPrice: 68200, totalTax: 0, retainage: 0 },
    { id: '0003', title: 'MEP Rough-In Draw', status: 'Draft', totalPrice: 39750, totalTax: 0, retainage: 0 },
    { id: '0004', title: 'Drywall & Finish Draw', status: 'Draft', totalPrice: 51200, totalTax: 0, retainage: 0 },
  ],
  j3: [
    { id: '0001', title: 'Site Prep & Foundation Draw', status: 'Paid', totalPrice: 96800, totalTax: 0, retainage: 0 },
  ],
  j2: [],
  j4: [],
  j5: [],
  j6: [],
}

export function invoiceTotals(jobId) {
  const list = invoicesByJob[jobId] || []
  const totalRevisedPrice = list.reduce((a, i) => a + i.totalPrice, 0) * 1.6 // contract total is larger than invoiced-to-date
  const payments = list.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.totalPrice, 0)
  return {
    totalRevisedPrice,
    payments,
    remainingBalance: totalRevisedPrice - payments,
  }
}
