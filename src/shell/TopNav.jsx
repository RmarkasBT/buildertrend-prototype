import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconCalendar, IconFileLines, IconListChecks, IconChangeArrow, IconSwatches,
  IconShieldCheck, IconClock, IconFileRuler, IconTarget, IconPersonBox,
  IconScan, IconPhone, IconMapPin, IconClipboard, IconInfoCircle, IconTag,
  IconListBullet, IconCirclePlus, IconFolder, IconDocument, IconImage,
  IconVideo, IconChatBubble, IconEnvelope, IconQuestionCircle, IconHistory,
  IconClipboardCheck, IconPresentation, IconGridDoc, IconClipboardPen,
  IconScaleBalance, IconInboxTray, IconEnvelopeDoc, IconGearDollar,
  IconPeopleTwo, IconWrench, IconHouse,
} from '../components/icons'

// Menu labels, routes, and icons copied from the live session's top nav
// (Sales, Jobs, Project Management, Files, Messaging, Financial, Reports)
// and the Users icon menu (Internal Users/Subs-Vendors/Client Contacts).
// Icons are redrawn stroke SVGs matched to each item's real icon shape, not
// the original icon asset files (unavailable outside the live app).
const NAV = [
  {
    label: 'Sales',
    items: [
      { label: 'Lead Opportunities', to: '/lead-opportunities', icon: IconScan },
      { label: 'Lead Activities', to: '/lead-activities', icon: IconPhone },
      { label: 'Lead Proposals', to: '/lead-proposals', icon: IconFileLines },
      { label: 'Lead Activity Calendar', to: '/lead-calendar', icon: IconCalendar },
      { label: 'Lead Map', to: '/lead-map', icon: IconMapPin },
    ],
  },
  {
    label: 'Jobs',
    items: [
      { label: 'Summary', to: '/', icon: IconClipboard },
      { label: 'Job Info', to: '/job-info', icon: IconInfoCircle },
      { label: 'Job Price Summary', to: '/job-price-summary', icon: IconTag },
      { label: 'Jobs List', to: '/jobs-list', icon: IconListBullet },
      { label: 'Jobs Map', to: '/jobs-map', icon: IconMapPin },
      { label: 'New Job From Scratch', to: '/new-job-scratch', icon: IconCirclePlus },
      { label: 'New Job From Template', to: '/new-job-template', icon: IconFolder },
    ],
  },
  {
    label: 'Project Management',
    items: [
      { label: 'Schedule', to: '/schedule', icon: IconCalendar },
      { label: 'Daily Logs', to: '/daily-logs', icon: IconFileLines },
      { label: 'Tasks', to: '/tasks', icon: IconListChecks, badge: 'New' },
      { label: 'Change Orders', to: '/change-orders', icon: IconChangeArrow },
      { label: 'Selections', to: '/selections', icon: IconSwatches },
      { label: 'Warranties', to: '/warranties', icon: IconShieldCheck },
      { label: 'Time Clock', to: '/time-clock', icon: IconClock },
      { label: 'Plans and Specs', to: '/plans', icon: IconFileRuler, badge: 'New' },
      { label: 'Client Updates', to: '/client-updates', icon: IconTarget },
      { label: 'Submittals', to: '/submittals', icon: IconPersonBox, badge: 'New' },
    ],
  },
  {
    label: 'Files',
    items: [
      { label: 'Documents', to: '/documents', icon: IconDocument },
      { label: 'Photos', to: '/photos', icon: IconImage },
      { label: 'Videos', to: '/videos', icon: IconVideo },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { label: 'Comments', to: '/comments', icon: IconChatBubble },
      { label: 'Messages', to: '/messages', icon: IconEnvelope },
      { label: 'RFIs', to: '/rfis', icon: IconQuestionCircle },
      { label: 'Notification History', to: '/notification-history', icon: IconHistory },
      { label: 'Surveys', to: '/surveys', icon: IconClipboardCheck },
    ],
  },
  {
    label: 'Financial',
    items: [
      { label: 'Bids', to: '/bids', icon: IconPresentation },
      { label: 'Estimate', to: '/estimate', icon: IconGridDoc },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: IconClipboardPen },
      { label: 'Bills', to: '/bills', icon: IconFileLines },
      { label: 'Job Costing Budget', to: '/job-costing-budget', icon: IconScaleBalance },
      { label: 'Cost Inbox', to: '/cost-inbox', icon: IconInboxTray },
      { label: 'Invoices', to: '/invoices', icon: IconEnvelopeDoc },
      { label: 'Accept Online Payments', to: '/accept-online-payments', icon: IconGearDollar },
    ],
  },
  { label: 'Reports', to: '/reports' },
]

const USERS_MENU = [
  { label: 'Internal Users', to: '/internal-users', icon: IconPeopleTwo },
  { label: 'Subs/Vendors', to: '/subs-vendors', icon: IconWrench },
  { label: 'Client Contacts', to: '/client-contacts', icon: IconHouse },
]

function Dropdown({ label, items, icon: TriggerIcon, align = 'left' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 rounded-sm">
        {TriggerIcon ? <TriggerIcon className="h-5 w-5" /> : label}
      </button>
      {open && (
        <div className={`absolute top-full z-40 w-64 rounded-md bg-white py-1 text-gray-90 shadow-lg ring-1 ring-black/5 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((sub) => {
            const Icon = sub.icon
            return (
              <Link
                key={sub.label}
                to={sub.to}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-80 hover:bg-gray-5"
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-50" />}
                <span className="flex-1">{sub.label}</span>
                {sub.badge && (
                  <span className="rounded-sm bg-info-bg px-1.5 py-0.5 text-[10px] font-semibold text-info-fg">
                    {sub.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NavItem({ item }) {
  if (!item.items) {
    return (
      <Link
        to={item.to}
        className="flex items-center px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 rounded-sm"
      >
        {item.label}
      </Link>
    )
  }
  return (
    <div className="relative">
      <Dropdown label={item.label} items={item.items} />
    </div>
  )
}

export default function TopNav({ onQuickAdd }) {
  return (
    <header className="flex h-12 items-center gap-1 bg-navy-900 px-3 text-white">
      <Link to="/" className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-sm font-bold">
        b
      </Link>
      <nav className="flex items-center gap-1">
        {NAV.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}
      </nav>

      <div className="ml-6 flex-1 max-w-md">
        <input
          type="search"
          placeholder="Search"
          className="w-full rounded-sm bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/60 outline-none focus:bg-white/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-3 text-white/90">
        <button title="Quick add" onClick={onQuickAdd} className="hover:text-white">+</button>
        <button title="Notifications" className="hover:text-white">🔔</button>
        <Link to="/chat" title="Chat" className="hover:text-white">💬</Link>
        <Dropdown label="Users" items={USERS_MENU} icon={IconPeopleTwo} align="right" />
        <button title="Help" className="hover:text-white">❓</button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-navy-900">
          RM
        </div>
      </div>
    </header>
  )
}
