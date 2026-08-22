import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import { useDailyLog } from '../hooks/useDailyLogs'
import * as dailyLogApi from '../api/dailyLogApi'
import { PhotoGrid, PhotoLightbox, ViewAllPhotosButton } from '../components/DailyLogPhotos'
import { WeatherBlock } from '../components/DailyLogWeather'
import { longDate, initials, shareLabel, splitNoteSections, relativeTime } from '../lib/dailyLogFormat'
import {
  IconArrowLeft, IconEllipsis, IconHistory, IconShare, IconComment, IconEdit,
  IconHeart, IconPeopleTwo, IconLock, IconInfoCircle, IconPlus, IconTag, IconTrash, IconX,
} from '../components/icons'

// Single daily log, following the live /app/DailyLogView layout: breadcrumb,
// the long-form date as the heading, the audience chip and photo grid, the
// like row, the Notes sections, and a right rail carrying Weather and Tasks.
export default function DailyLogDetail() {
  const { id } = useParams()
  const { currentJob } = useJob()
  const navigate = useNavigate()
  const { log, loading, error, like, addComment, deleteComment } = useDailyLog(id)
  const [lightboxAt, setLightboxAt] = useState(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [showComments, setShowComments] = useState(false)

  if (loading) return <div className="px-6 py-6 text-sm text-gray-50">Loading…</div>
  if (error || !log) {
    return (
      <div className="px-6 py-6">
        <p className="text-sm text-danger-fg">Couldn't load this daily log{error ? `: ${error}` : ''}.</p>
        <Link to="/daily-logs" className="mt-2 inline-block text-sm text-brand-blue hover:underline">Back to Daily Logs</Link>
      </div>
    )
  }

  const sections = splitNoteSections(log.notes)
  const iconButton = 'rounded-sm p-1.5 text-gray-50 hover:bg-gray-10 hover:text-gray-80'

  const submitComment = (e) => {
    e?.preventDefault()
    if (!commentDraft.trim()) return
    addComment(commentDraft.trim()).then(() => setCommentDraft(''))
  }

  const remove = () => {
    if (!window.confirm('Delete this daily log? This cannot be undone.')) return
    dailyLogApi.deleteLog(log.id).then(() => navigate('/daily-logs'))
  }

  return (
    <div className="pb-16">
      <div className="flex items-center justify-between border-b border-gray-15 bg-white px-6 py-3">
        <Link to="/daily-logs" className={iconButton} aria-label="Back to Daily Logs">
          <IconArrowLeft />
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={remove} className={iconButton} title="Delete"><IconTrash /></button>
          <button className={iconButton} title="More"><IconEllipsis /></button>
          <button className={iconButton} title="History"><IconHistory /></button>
          <button className={iconButton} title="Share"><IconShare /></button>
          <button className={iconButton} title="Comments" onClick={() => setShowComments((v) => !v)}>
            <IconComment />
          </button>
          <Link to={`/daily-logs/${log.id}/edit`} className={iconButton} title="Edit"><IconEdit /></Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <nav className="flex gap-1.5 text-xs">
            <span className="text-gray-60">{currentJob?.name}</span>
            <span className="text-gray-40">/</span>
            <Link to="/daily-logs" className="text-brand-blue hover:underline">Daily Logs</Link>
          </nav>

          <h1 className="mt-1.5 text-2xl font-bold text-gray-90">{log.title || longDate(log.date)}</h1>
          {log.title && <div className="text-sm text-gray-50">{longDate(log.date)}</div>}

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
            {log.status === 'draft' && (
              <span className="rounded-xs bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-fg">Draft</span>
            )}
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

          <PhotoGrid photos={log.photos} max={4} size="h-64 w-64" onOpen={setLightboxAt} />

          <div className="mt-3 flex items-center gap-4 border-b border-gray-10 pb-3">
            <button
              onClick={like}
              className={`flex items-center gap-1.5 text-sm ${log.likedByMe ? 'text-brand-coral' : 'text-gray-50 hover:text-gray-70'}`}
              aria-pressed={log.likedByMe}
              aria-label={log.likedByMe ? 'Unlike' : 'Like'}
            >
              <IconHeart filled={log.likedByMe} />
              {log.likeCount}
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-gray-50 hover:text-gray-70"
            >
              <IconComment />
              {log.commentCount}
            </button>
            <span className="ml-auto text-xs text-gray-50">Updated {relativeTime(log.updatedAt)}</span>
          </div>

          <h2 className="mt-4 text-lg font-bold text-gray-90">Notes</h2>
          <div className="mt-2 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {sections.map((section, i) => (
              <div key={section.heading ?? i}>
                {section.heading && <div className="font-semibold text-gray-90">{section.heading}:</div>}
                <p className="whitespace-pre-wrap text-gray-70">{section.body || '—'}</p>
              </div>
            ))}
          </div>

          {log.includeWeatherNotes && log.weatherNotes && (
            <div className="mt-4 text-sm">
              <div className="font-semibold text-gray-90">Weather Notes</div>
              <p className="whitespace-pre-wrap text-gray-70">{log.weatherNotes}</p>
            </div>
          )}

          {(showComments || log.commentCount > 0) && (
            <section className="mt-6 border-t border-gray-15 pt-4">
              <h2 className="text-sm font-semibold text-gray-90">Comments ({log.commentCount})</h2>
              <ul className="mt-3 space-y-3">
                {log.comments.map((comment) => (
                  <li key={comment.id} className="flex gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-20 text-[10px] font-semibold text-gray-70">
                      {initials(comment.author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-90">{comment.author}</span>
                        <span className="text-gray-50">{relativeTime(comment.createdAt)}</span>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="ml-auto text-gray-40 hover:text-danger-fg"
                          aria-label="Delete comment"
                        >
                          <IconX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-sm whitespace-pre-wrap text-gray-70">{comment.body}</p>
                    </div>
                  </li>
                ))}
                {log.comments.length === 0 && <li className="text-sm text-gray-50">No comments yet.</li>}
              </ul>

              <form onSubmit={submitComment} className="mt-3 flex gap-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a comment"
                  aria-label="Add a comment"
                  // Explicit rather than relying on the browser's implicit
                  // form submission, which doesn't reliably fire for this
                  // single-input form.
                  onKeyDown={(e) => { if (e.key === 'Enter') submitComment(e) }}
                  className="flex-1 rounded-sm border border-gray-20 px-3 py-1.5 text-sm outline-none focus:border-brand-blue"
                />
                <button
                  type="submit"
                  disabled={!commentDraft.trim()}
                  className="rounded-sm bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-info-fg disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {log.weather && (
            <div className="relative rounded-md border border-gray-15 bg-white p-4">
              <IconInfoCircle className="absolute top-4 right-4 h-4 w-4 text-gray-40" />
              <WeatherBlock weather={log.weather} />
            </div>
          )}

          <div className="rounded-md border border-gray-15 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-90">Tasks</h2>
              <button className="flex items-center gap-1.5 rounded-sm border border-gray-20 px-2.5 py-1.5 text-xs text-gray-80 hover:bg-gray-5">
                <IconPlus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-50">No tasks on this log.</p>
          </div>
        </aside>
      </div>

      {lightboxAt !== null && (
        <PhotoLightbox photos={log.photos} startIndex={lightboxAt} onClose={() => setLightboxAt(null)} />
      )}
    </div>
  )
}
