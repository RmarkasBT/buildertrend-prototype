import Avatar from './Avatar'

// Sub/vendor chip — name + colored initials avatar only, matching what the
// live "Subs/vendors" tab showed (no contact detail like email/phone was
// observed there, unlike the Clients tab, so none is fabricated here).
export default function SubChip({ sub }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-15 bg-white py-0.5 pl-0.5 pr-2 text-xs text-gray-80">
      <Avatar name={sub.name} color={sub.color} size="sm" />
      {sub.name}
    </span>
  )
}
