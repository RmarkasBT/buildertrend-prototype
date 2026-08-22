import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import { dashboardByJob } from '../data/dashboard'
import { useSchedule } from '../hooks/useSchedule'
import { colorHex } from '../data/scheduleColors'
import Badge from '../components/Badge'
import ContactChip from '../components/ContactChip'
import ContactModal from '../components/ContactModal'

// Layout (job header, Clients/Project Managers add-cards, Past Due/Due
// Today/Action Items panel, Recent Activity feed, right-rail "updates shared
// with clients" + "This Week's Agenda") copied from the live /app/Landing
// dashboard.
export default function Dashboard() {
  const { currentJob } = useJob()
  const [viewingContact, setViewingContact] = useState(null)
  const { items: scheduleItems } = useSchedule(currentJob?.id)
  if (!currentJob) return null

  const data = dashboardByJob[currentJob.id]
  const upcoming = scheduleItems.slice(0, 6)
  const allClear = data.pastDue === 0 && data.dueToday === 0 && data.actionItems === 0

  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1 space-y-4">
        <div className="rounded-md border border-gray-15 bg-white p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-90">{currentJob.name}</h1>
            <Badge>{currentJob.status}</Badge>
          </div>
          <div className="mt-1 text-sm text-brand-blue">{currentJob.address}</div>
          <div className="mt-3 text-sm text-gray-70">
            <strong>{currentJob.clockedIn}</strong> internal users are clocked in as of{' '}
            {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
          <Link to="/time-clock" className="mt-1 inline-block text-sm text-brand-blue">
            View time sheets
          </Link>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-90">Clients</div>
              <div className="mt-2 flex items-center gap-2">
                {currentJob.clients.map((c) => (
                  <ContactChip key={c.id} contact={c} onViewContact={setViewingContact} />
                ))}
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-gray-30 text-gray-40">+</button>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-90">Project Managers</div>
              <div className="mt-2 flex gap-2">
                {currentJob.projectManagers.map((pm) => (
                  <span key={pm} className="rounded-full bg-gray-15 px-2 py-1 text-xs text-gray-80">{pm}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-15 bg-white p-4">
          <div className="grid grid-cols-3 gap-4 text-xs font-semibold uppercase text-gray-50">
            <div>Past Due</div>
            <div>Due Today</div>
            <div>Action Items</div>
          </div>
          {allClear ? (
            <div className="mt-6 flex flex-col items-center py-6 text-center">
              <div className="text-3xl">👍</div>
              <div className="mt-2 text-sm font-medium text-gray-80">Everything is taken care of. Go you!</div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-4 text-2xl font-bold text-gray-90">
              <div>{data.pastDue}</div>
              <div>{data.dueToday}</div>
              <div>{data.actionItems}</div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-gray-15 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-gray-50">Recent Activity From Your Team</h2>
            <button className="rounded-sm border border-gray-20 px-2 py-1 text-xs text-gray-70">Filter</button>
          </div>
          {data.activity.length === 0 ? (
            <div className="mt-4 text-sm text-gray-50">No recent activity.</div>
          ) : (
            <ul className="mt-3 divide-y divide-gray-15">
              {data.activity.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="text-xs text-gray-50">{currentJob.name} · {a.when}</div>
                  <div className="text-sm text-gray-90">
                    <span className="font-semibold">{a.who}</span> {a.action}
                  </div>
                  <div className="mt-1 text-sm text-brand-blue">{a.detail}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="w-72 shrink-0 space-y-4">
        <div className="rounded-md border border-gray-15 bg-white p-4 text-center">
          <div className="text-3xl font-bold text-gray-90">{data.updatesSharedThisMonth}</div>
          <div className="mt-1 text-xs text-gray-50">Updates shared with clients this month</div>
          <div className="mt-3 flex gap-2">
            <Link to="/client-updates" className="flex-1 rounded-sm border border-gray-20 px-2 py-1.5 text-sm">Client Updates</Link>
            <Link to="/daily-logs" className="flex-1 rounded-sm border border-gray-20 px-2 py-1.5 text-sm">Daily Logs</Link>
          </div>
        </div>

        <div className="rounded-md border border-gray-15 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase text-gray-50">This Week's Agenda</h2>
            <Link to="/schedule" className="text-xs text-brand-blue">View schedule</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="mt-3 text-sm text-gray-50">Nothing scheduled this week.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((item) => (
                <li key={item.id} className="text-sm">
                  <span style={{ color: colorHex(item.color) }}>●</span>{' '}
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {viewingContact && <ContactModal contact={viewingContact} onClose={() => setViewingContact(null)} />}
    </div>
  )
}
