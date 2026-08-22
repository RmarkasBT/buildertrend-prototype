import { useJob } from '../context/JobContext'
import { dailyLogsByJob } from '../data/dailyLogs'

// Empty state (notebook icon, "Track project progress with daily logs",
// Learn How / Add a Daily Log buttons) and populated card layout (author,
// crew tag, photo grid + "View all (N)", likes/comments, weather, Notes/
// Issues/Materials Delivered) copied from the live /app/DailyLogs page.
export default function DailyLogs() {
  const { currentJob } = useJob()
  if (!currentJob) return null
  const logs = dailyLogsByJob[currentJob.id] || []

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-50">{currentJob.name}</div>
          <h1 className="text-xl font-bold text-gray-90">Daily Logs</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Help">❓</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Settings">⚙</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1" title="Print">🖨</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1">▽¹</button>
          <button className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white">+ Daily Log</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="text-4xl">📓</div>
          <div className="mt-3 text-lg font-semibold text-gray-90">Track project progress with daily logs</div>
          <div className="mt-1 text-sm text-gray-50">Document and share project updates with your team, subs, and clients.</div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm">↗ Learn How</button>
            <button className="rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white">Add a Daily Log</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border border-gray-15 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-50">● {currentJob.name}</div>
                  <div className="font-semibold text-brand-blue underline">{log.dayLabel}</div>
                </div>
                <div className="flex gap-2 text-gray-40">
                  <span title="Info">ⓘ</span>
                  <span title="Print">🖨</span>
                  <span title="Edit">✎</span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-20 text-[10px] font-semibold text-gray-70">
                  {log.author.split(' ').map((n) => n[0]).join('')}
                </span>
                <span className="text-gray-80">{log.author}</span>
                <span className="rounded-sm bg-gray-15 px-1.5 py-0.5 text-xs text-gray-70">{log.crew}</span>
                {log.photoCount > 0 && (
                  <button className="ml-auto rounded-sm border border-gray-20 px-2 py-0.5 text-xs">
                    ▦ View all ({log.photoCount})
                  </button>
                )}
              </div>

              {log.photoCount > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-sm bg-gray-15" />
                  ))}
                  <div className="flex aspect-square items-center justify-center rounded-sm bg-gray-60 text-sm font-semibold text-white">
                    +{Math.max(log.photoCount - 4, 0)}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4 text-sm text-gray-50">
                <span>♡ {log.likes}</span>
                <span>💬 {log.comments}</span>
                <span className="ml-auto">☀ {log.weatherHigh}°F↑ {log.weatherLow}°F↓</span>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <div className="font-semibold text-gray-90">Notes</div>
                  <div className="text-gray-70">{log.notes || '—'}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-90">Issues</div>
                  <div className="text-gray-70">{log.issues || '—'}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-90">Materials Delivered</div>
                  <div className="text-gray-70">{log.materialsDelivered || '—'}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="text-right text-xs text-gray-50">1-{logs.length} of {logs.length} items</div>
        </div>
      )}
    </div>
  )
}
