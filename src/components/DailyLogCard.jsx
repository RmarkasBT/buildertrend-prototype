import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconInfoCircle, IconPrinter, IconEdit, IconHeart, IconComment, IconPeopleTwo, IconLock, IconTag } from './icons'
import { PhotoGrid, PhotoLightbox, ViewAllPhotosButton } from './DailyLogPhotos'
import { WeatherSummaryLine } from './DailyLogWeather'
import { cardDateLabel, longDate, initials, shareLabel, splitNoteSections } from '../lib/dailyLogFormat'

// One card in the Daily Logs list. Layout follows the live /app/DailyLogs
// card top to bottom: title link + info/print/edit actions, author avatar and
// audience chip, "View all (N)" over the photo grid, the likes/comments row
// with the weather reading right-aligned, then the Notes sections.
export default function DailyLogCard({ log, jobName, onLike, onPrint, onInfo }) {
  const [lightboxAt, setLightboxAt] = useState(null)
  const sections = splitNoteSections(log.notes)

  return (
    <article className="rounded-md border border-gray-15 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-50">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" aria-hidden />
            {jobName}
            {log.status === 'draft' && (
              <span className="rounded-xs bg-warning-bg px-1.5 py-0.5 font-medium text-warning-fg">Draft</span>
            )}
          </div>
          <Link
            to={`/daily-logs/${log.id}`}
            className="mt-0.5 block truncate text-lg font-bold text-brand-blue underline decoration-1 underline-offset-2 hover:text-info-fg"
          >
            {log.title || cardDateLabel(log.date)}
          </Link>
          {log.title && <div className="text-xs text-gray-50">{longDate(log.date)}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-gray-40">
          <button onClick={() => onInfo?.(log)} title="Log info" className="hover:text-gray-70">
            <IconInfoCircle />
          </button>
          <button onClick={() => onPrint?.(log)} title="Print" className="hover:text-gray-70">
            <IconPrinter />
          </button>
          <Link to={`/daily-logs/${log.id}/edit`} title="Edit" className="hover:text-gray-70">
            <IconEdit />
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-gray-10 py-0.5 pr-2.5 pl-0.5 text-xs text-gray-80">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[9px] font-semibold text-white">
            {initials(log.createdBy)}
          </span>
          {log.createdBy}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-gray-10 px-2.5 py-1 text-xs text-gray-80">
          {log.isPrivate ? <IconLock className="h-3.5 w-3.5" /> : <IconPeopleTwo className="h-3.5 w-3.5" />}
          {shareLabel(log)}
        </span>
        {log.tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-info-bg px-2.5 py-1 text-xs text-info-fg">
            <IconTag className="h-3 w-3" />
            {tag}
          </span>
        ))}
        {log.photos.length > 0 && (
          <span className="ml-auto">
            <ViewAllPhotosButton count={log.photos.length} onClick={() => setLightboxAt(0)} />
          </span>
        )}
      </div>

      <PhotoGrid photos={log.photos} onOpen={setLightboxAt} />

      <div className="mt-3 flex items-center gap-4 border-b border-gray-10 pb-3">
        <button
          onClick={() => onLike?.(log)}
          className={`flex items-center gap-1.5 text-sm ${log.likedByMe ? 'text-brand-coral' : 'text-gray-50 hover:text-gray-70'}`}
          aria-pressed={log.likedByMe}
          aria-label={log.likedByMe ? 'Unlike' : 'Like'}
        >
          <IconHeart filled={log.likedByMe} />
          {log.likeCount}
        </button>
        <Link
          to={`/daily-logs/${log.id}`}
          className="flex items-center gap-1.5 text-sm text-gray-50 hover:text-gray-70"
          aria-label="Comments"
        >
          <IconComment />
          {log.commentCount}
        </Link>
        <WeatherSummaryLine weather={log.weather} />
      </div>

      <div className="mt-3 space-y-3 text-sm">
        {sections.map((section, i) => (
          <div key={section.heading ?? i}>
            {section.heading && <div className="font-semibold text-gray-90">{section.heading}</div>}
            <p className="whitespace-pre-wrap text-gray-70">{section.body || '—'}</p>
          </div>
        ))}
        {log.includeWeatherNotes && log.weatherNotes && (
          <div>
            <div className="font-semibold text-gray-90">Weather Notes</div>
            <p className="whitespace-pre-wrap text-gray-70">{log.weatherNotes}</p>
          </div>
        )}
      </div>

      {lightboxAt !== null && (
        <PhotoLightbox photos={log.photos} startIndex={lightboxAt} onClose={() => setLightboxAt(null)} />
      )}
    </article>
  )
}
