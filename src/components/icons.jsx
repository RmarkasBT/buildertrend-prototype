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
