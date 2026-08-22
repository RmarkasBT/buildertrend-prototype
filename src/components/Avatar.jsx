// Colored-circle initials avatar — matches the style used throughout the
// live session for people and sub/vendor company chips (client contact
// avatar, sub/vendor list rows, the user's own avatar in the top nav).
const COLOR_CLASSES = {
  blue: 'bg-info-bg text-info-fg',
  coral: 'bg-danger-bg text-danger-fg',
  amber: 'bg-warning-bg text-warning-fg',
  green: 'bg-success-bg text-success-fg',
  gray: 'bg-gray-15 text-gray-70',
}

const PALETTE = Object.keys(COLOR_CLASSES)

function colorForName(name) {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return PALETTE[hash % PALETTE.length]
}

function initials(name) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function Avatar({ name, color, size = 'md' }) {
  const cls = COLOR_CLASSES[color ?? colorForName(name)]
  const sizeCls = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-sm'
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeCls} ${cls}`}>
      {initials(name)}
    </span>
  )
}
