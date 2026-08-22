// Small outline-icon set, shaped to match what was observed in each real
// top-nav dropdown (Sales, Jobs, Project Management, Files, Messaging,
// Financial, and the Users menu) — same icon concept per item, redrawn as
// simple stroke SVGs since the original icon asset files weren't available.
function Svg({ children, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  )
}

export const IconCalendar = (p) => <Svg {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></Svg>
export const IconFileLines = (p) => <Svg {...p}><path d="M6.5 2.5h7l4 4v14a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 16h6" /></Svg>
export const IconListChecks = (p) => <Svg {...p}><path d="M4 6l1.5 1.5L8 5" /><path d="M4 12l1.5 1.5L8 11" /><path d="M4 18l1.5 1.5L8 17" /><path d="M12 6h8M12 12h8M12 18h8" /></Svg>
export const IconChangeArrow = (p) => <Svg {...p}><path d="M4 17L17 4" /><path d="M11 4h6v6" /><circle cx="5.5" cy="18.5" r="1.2" fill="currentColor" stroke="none" /></Svg>
export const IconSwatches = (p) => <Svg {...p}><rect x="3" y="8" width="8" height="13" rx="1.5" transform="rotate(-12 7 14.5)" /><rect x="10" y="6" width="8" height="13" rx="1.5" transform="rotate(8 14 12.5)" /></Svg>
export const IconShieldCheck = (p) => <Svg {...p}><path d="M12 2.5l7 3v6.2c0 4.6-3 7.8-7 9.3-4-1.5-7-4.7-7-9.3V5.5z" /><path d="M9 12l2 2 4-4.5" /></Svg>
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></Svg>
export const IconFileRuler = (p) => <Svg {...p}><path d="M6.5 2.5h7l4 4v14a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" /><path d="M9 11h6M9 14h3M9 17h6" /></Svg>
export const IconTarget = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" /></Svg>
export const IconPersonBox = (p) => <Svg {...p}><circle cx="12" cy="6.5" r="3" /><path d="M6 21v-3a6 6 0 0 1 12 0v3" /><rect x="4" y="21" width="4" height="0.1" /></Svg>
export const IconScan = (p) => <Svg {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" /><circle cx="12" cy="12" r="2.3" /></Svg>
export const IconPhone = (p) => <Svg {...p}><path d="M5.5 4.5c1 0 2 .3 2.4 1.1l1 2a1.5 1.5 0 0 1-.3 1.7L7.5 10.4a11 11 0 0 0 6 6l1.1-1.1a1.5 1.5 0 0 1 1.7-.3l2 1c.8.4 1.1 1.4 1.1 2.4 0 1.6-1.3 2.6-2.9 2.4C10.2 20 4 13.8 3.6 7.4 3.4 5.8 4.4 4.5 5.5 4.5z" /></Svg>
export const IconMapPin = (p) => <Svg {...p}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.3" /></Svg>
export const IconClipboard = (p) => <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="1.5" /><rect x="9" y="2" width="6" height="3.5" rx="1" /></Svg>
export const IconInfoCircle = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" /></Svg>
export const IconTag = (p) => <Svg {...p}><path d="M11 3h6a1 1 0 0 1 1 1v6l-8.5 8.5a1.4 1.4 0 0 1-2 0l-5-5a1.4 1.4 0 0 1 0-2z" /><circle cx="14.5" cy="6.5" r="1.2" /></Svg>
export const IconListBullet = (p) => <Svg {...p}><circle cx="4.5" cy="6" r="0.9" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="0.9" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="0.9" fill="currentColor" stroke="none" /><path d="M8.5 6h11M8.5 12h11M8.5 18h11" /></Svg>
export const IconCirclePlus = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Svg>
export const IconFolder = (p) => <Svg {...p}><path d="M3 6.5a1 1 0 0 1 1-1h4.5l2 2H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></Svg>
export const IconDocument = (p) => <Svg {...p}><path d="M6.5 2.5h7l4 4v14a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" /></Svg>
export const IconImage = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="M4.5 17.5L9 13l3 3 4-4.5 3.5 4" /></Svg>
export const IconVideo = (p) => <Svg {...p}><rect x="3" y="5.5" width="14" height="13" rx="1.5" /><path d="M17 10l4-2.5v9L17 14" /></Svg>
export const IconChatBubble = (p) => <Svg {...p}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><path d="M7 9h10M7 12h6" /></Svg>
export const IconEnvelope = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3.5 6l8.5 7 8.5-7" /></Svg>
export const IconQuestionCircle = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.8 9.3a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2.9-1.2 2" /><circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none" /></Svg>
export const IconHistory = (p) => <Svg {...p}><path d="M4 9.5a8.5 8.5 0 1 0 1.3-5.6" /><path d="M2.5 3v4h4" /><path d="M12 8v4.5l3 2" /></Svg>
export const IconClipboardCheck = (p) => <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="1.5" /><rect x="9" y="2" width="6" height="3.5" rx="1" /><path d="M9 13l2 2 4-4.5" /></Svg>
export const IconPresentation = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v5M8 21h8" /><path d="M7 12l3-3 2.5 2L17 7" /></Svg>
export const IconGridDoc = (p) => <Svg {...p}><path d="M6.5 2.5h7l4 4v14a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" /><path d="M8 10h8M8 14h8M11 10v8" /></Svg>
export const IconClipboardPen = (p) => <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="1.5" /><rect x="9" y="2" width="6" height="3.5" rx="1" /><path d="M9 17l1-3.5 5-5 2.5 2.5-5 5z" /></Svg>
export const IconScaleBalance = (p) => <Svg {...p}><path d="M12 3v17M6 20h12" /><path d="M4 8h6M4 8l-2.5 5a3 3 0 0 0 5.5 0zM14 8h6M14 8l-2.5 5a3 3 0 0 0 5.5 0z" /></Svg>
export const IconInboxTray = (p) => <Svg {...p}><path d="M3 12l3-8h12l3 8" /><path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6h-5l-1.5 2.5h-7L9 12H3z" /></Svg>
export const IconEnvelopeDoc = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3.5 6l8.5 7 8.5-7" /></Svg>
export const IconGearDollar = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></Svg>
export const IconPeopleTwo = (p) => <Svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20" /><path d="M16 5.5a3 3 0 0 1 0 6" /><path d="M15 14a5.5 5.5 0 0 1 5.5 5.5V20" /></Svg>
export const IconWrench = (p) => <Svg {...p}><path d="M14.5 6.5a4 4 0 0 0-5.4 5.4L4 17l3 3 5.1-5.1a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-.6-.6-2z" /></Svg>
export const IconHouse = (p) => <Svg {...p}><path d="M4 11l8-7 8 7" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /><path d="M10 20v-5h4v5" /></Svg>

// Gantt toolbar icons, captured live from /app/Schedules/{id} Gantt view's
// right-aligned icon cluster (sliders/share/fullscreen) — redrawn as simple
// stroke SVGs, same convention as the rest of this file.
export const IconSliders = (p) => <Svg {...p}><path d="M4 6h10M17 6h3M4 18h3M10 18h10" /><circle cx="14" cy="6" r="2" /><circle cx="7" cy="18" r="2" /></Svg>
export const IconShare = (p) => <Svg {...p}><circle cx="18" cy="5" r="2.3" /><circle cx="6" cy="12" r="2.3" /><circle cx="18" cy="19" r="2.3" /><path d="M8 10.8l8-4.4M8 13.2l8 4.4" /></Svg>
export const IconExpand = (p) => <Svg {...p}><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" /></Svg>
export const IconChevronDown = (p) => <Svg {...p}><path d="M5.5 8.5l6.5 7 6.5-7" /></Svg>
export const IconCheck = (p) => <Svg {...p}><path d="M4.5 12.5l5 5 10-11" /></Svg>
export const IconXCircle = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></Svg>
export const IconEdit = (p) => <Svg {...p}><path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20z" /><path d="M14 7l3 3" /></Svg>

// --- Daily Logs -----------------------------------------------------------
// Added for the Daily Logs screens: the list-header actions (gear, printer,
// filter funnel), the card actions (heart, comment, pencil, photo grid), and
// the five weather glyphs server/weather.js can return in `icon`.
export const IconGear = (p) => <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></Svg>
export const IconPrinter = (p) => <Svg {...p}><path d="M7 9V3.5h10V9" /><path d="M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" /><rect x="7" y="14.5" width="10" height="6" rx="1" /></Svg>
export const IconFilter = (p) => <Svg {...p}><path d="M3.5 5h17l-6.5 8v6l-4 2v-8z" /></Svg>
export const IconHeart = ({ filled, ...p }) => (
  <Svg {...p}><path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3z" fill={filled ? 'currentColor' : 'none'} /></Svg>
)
export const IconComment = (p) => <Svg {...p}><path d="M21 11.5a7.7 7.7 0 0 1-8.5 7.5 9 9 0 0 1-2.6-.4L4 21l1.4-4.1A7.4 7.4 0 0 1 3.5 11.5 7.7 7.7 0 0 1 12 4a7.7 7.7 0 0 1 9 7.5z" /></Svg>
export const IconPhotoGrid = (p) => <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" /></Svg>
export const IconArrowLeft = (p) => <Svg {...p}><path d="M20 12H4" /><path d="M10 6l-6 6 6 6" /></Svg>
export const IconNotebook = (p) => <Svg {...p}><path d="M7 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7z" /><path d="M7 3.5a2 2 0 0 0 0 4h2v-4z" /><path d="M5 8h2M5 12h2M5 16h2" /><path d="M11 8h5M11 12h5" /></Svg>
export const IconExternalLink = (p) => <Svg {...p}><path d="M14 4h6v6" /><path d="M20 4l-8.5 8.5" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>
export const IconTrash = (p) => <Svg {...p}><path d="M4 6.5h16" /><path d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M10 10.5v6M14 10.5v6" /></Svg>
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconX = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const IconLock = (p) => <Svg {...p}><rect x="4.5" y="10" width="15" height="10.5" rx="1.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>
export const IconPaperclip = (p) => <Svg {...p}><path d="M20 11.5l-8.4 8.4a5 5 0 0 1-7-7l8.8-8.8a3.4 3.4 0 0 1 4.8 4.8l-8.8 8.8a1.8 1.8 0 0 1-2.5-2.5l8.1-8.1" /></Svg>
export const IconEllipsis = (p) => <Svg {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></Svg>
export const IconArrowUp = (p) => <Svg {...p}><path d="M12 20V4" /><path d="M6 10l6-6 6 6" /></Svg>
export const IconArrowDown = (p) => <Svg {...p}><path d="M12 4v16" /><path d="M6 14l6 6 6-6" /></Svg>

// Weather glyphs, keyed to server/weather.js's `icon` values. Coloured
// rather than currentColor so the forecast reads at a glance the way the
// live weather widget's does.
export const IconWeatherSun = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="4.6" fill="#ffc26f" /><g stroke="#ffc26f" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" /></g></svg>
)
export const IconWeatherPartlyCloudy = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className}><circle cx="9" cy="8.5" r="3.6" fill="#ffc26f" /><path d="M8 19.5a3.8 3.8 0 0 1 0-7.6 5 5 0 0 1 9.5 1.1 3.3 3.3 0 0 1-.6 6.5z" fill="#c7d0d9" /></svg>
)
export const IconWeatherCloud = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M7.5 19a4.2 4.2 0 0 1 0-8.4 5.5 5.5 0 0 1 10.4 1.2A3.6 3.6 0 0 1 17.2 19z" fill="#acb8c3" /></svg>
)
export const IconWeatherRain = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M7.5 15.5a4.2 4.2 0 0 1 0-8.4 5.5 5.5 0 0 1 10.4 1.2 3.6 3.6 0 0 1-.7 7.2z" fill="#acb8c3" /><g stroke="#0763fb" strokeWidth="1.8" strokeLinecap="round"><path d="M8.5 18l-1 3M12 18l-1 3M15.5 18l-1 3" /></g></svg>
)
export const IconWeatherStorm = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M7.5 15.5a4.2 4.2 0 0 1 0-8.4 5.5 5.5 0 0 1 10.4 1.2 3.6 3.6 0 0 1-.7 7.2z" fill="#8f9ba8" /><path d="M12.8 16l-3.3 4.4h2.4l-1 3.1 3.6-4.8h-2.4z" fill="#ffc26f" stroke="none" /></svg>
)

// Dispatches on server/weather.js's `icon` value. A component rather than a
// plain lookup map so this file keeps exporting only components (oxlint's
// react(only-export-components) rule / fast-refresh). Falls back to the
// neutral cloud so an unrecognised value still renders something sensible.
export function WeatherIcon({ icon, className }) {
  switch (icon) {
    case 'sun': return <IconWeatherSun className={className} />
    case 'partly-cloudy': return <IconWeatherPartlyCloudy className={className} />
    case 'rain': return <IconWeatherRain className={className} />
    case 'storm': return <IconWeatherStorm className={className} />
    default: return <IconWeatherCloud className={className} />
  }
}
