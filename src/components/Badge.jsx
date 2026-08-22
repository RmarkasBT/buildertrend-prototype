const styles = {
  Open: 'bg-info-bg text-info-fg',
  Paid: 'bg-success-bg text-success-fg',
  Draft: 'bg-gray-15 text-gray-70',
  'Not Complete': 'bg-gray-15 text-gray-70',
  Active: 'bg-success-bg text-success-fg',
  Inactive: 'bg-gray-15 text-gray-70',
  'Ready for Invite': 'bg-info-bg text-info-fg',
  'No Email': 'bg-gray-15 text-gray-70',
  Pending: 'bg-warning-bg text-warning-fg',
}

export default function Badge({ children }) {
  const cls = styles[children] ?? 'bg-gray-15 text-gray-70'
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}
