// Filter criteria shared by the Daily Logs page and its filter drawer. Kept
// out of the component file so that file exports only components (oxlint's
// react(only-export-components) rule / fast refresh).
export const EMPTY_FILTERS = { sharedWith: 'all', keywords: '', createdBy: '', dateRange: 'all', tags: [] }

export const SHARED_WITH = [
  ['all', 'All'],
  ['internal', 'Internal Users'],
  ['subs', 'Subs/Vendors'],
  ['client', 'Client'],
  ['private', 'Private'],
]

export const DATE_RANGES = [
  ['all', 'All dates'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last7', 'Last 7 days'],
  ['last30', 'Last 30 days'],
  ['thisMonth', 'This month'],
  ['future', 'Future'],
]

// How many non-default criteria are set — drives the little count badge on
// the funnel icon in the page header.
export function activeFilterCount(filters) {
  let count = 0
  if (filters.sharedWith !== 'all') count++
  if (filters.keywords.trim()) count++
  if (filters.createdBy.trim()) count++
  if (filters.dateRange !== 'all') count++
  count += filters.tags.length
  return count
}
