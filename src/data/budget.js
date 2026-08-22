// Column shape (Original/Revised budget, Pending/Committed/Actual costs,
// Projected costs, Cost to complete, Revised vs Projected, Projected profit)
// and the "NN Cost Code Name" row format match the real Job Costing Budget
// grid. Dollar figures and cost code labels are invented.
function row(code, name, original, actual, projectionRef = 'Budgeted costs') {
  const revised = original
  const committed = actual > 0 ? Math.round(actual * 0.15) : 0
  const projected = projectionRef === 'Current costs' ? actual : revised
  const costToComplete = Math.max(projected - actual, 0)
  const revisedVsProjected = revised - projected
  return {
    code,
    name,
    original,
    revised,
    pending: 0,
    committed,
    actual,
    projectionRef,
    projected,
    costToComplete,
    revisedVsProjected,
  }
}

export const budgetByJob = {
  j1: {
    groupLabel: '00-99 General Costs',
    rows: [
      row('00', 'Preconstruction Services', 0, 3450),
      row('04', 'Jobsite Cleanliness/Final Deep Clean', 4200, 30, 'Current costs'),
      row('05', 'Demolition', 5800, 5800),
      row('06', 'Concrete', 61200, 42500),
      row('07', 'Framing/Cornice Labor', 58900, 0),
      row('07.5', 'Framing/Cornice Material', 49700, 9200),
      row('09.5', 'Windows/Exterior Doors Material', 51200, 0),
      row('11', 'Roofing', 31000, 0),
      row('11.5', 'Gutters', 5900, 0),
    ],
  },
  j3: {
    groupLabel: '00-99 General Costs',
    rows: [
      row('01', 'Site Prep/Grading', 12800, 12800),
      row('02', 'Foundation', 84000, 79500),
      row('07', 'Framing/Cornice Labor', 72500, 4100),
    ],
  },
  j2: { groupLabel: '00-99 General Costs', rows: [] },
  j4: { groupLabel: '00-99 General Costs', rows: [] },
  j5: { groupLabel: '00-99 General Costs', rows: [] },
  j6: { groupLabel: '00-99 General Costs', rows: [] },
}

export function budgetTotals(job) {
  const rows = job.rows
  const sum = (key) => rows.reduce((acc, r) => acc + r[key], 0)
  const totalRevisedPrice = sum('revised') * 1.04 // rough revenue-over-cost markup for the header stat
  const projectedCost = sum('projected')
  const projectedProfit = totalRevisedPrice - projectedCost
  return {
    original: sum('original'),
    revised: sum('revised'),
    pending: sum('pending'),
    committed: sum('committed'),
    actual: sum('actual'),
    projected: projectedCost,
    costToComplete: sum('costToComplete'),
    revisedVsProjected: sum('revisedVsProjected'),
    totalRevisedPrice,
    projectedProfit,
    profitMargin: totalRevisedPrice ? (projectedProfit / totalRevisedPrice) * 100 : 0,
  }
}
