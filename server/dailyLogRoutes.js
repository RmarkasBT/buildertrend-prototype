import {
  db,
  rowToDailyLog,
  dailyLogToRow,
  rowToSettings,
  nextDailyLogId,
  nextDailyLogCommentId,
} from './db.js'
import { weatherFor } from './weather.js'

// The signed-in user. Static here for the same reason jobs/subs are static
// fixtures — there is no auth layer in this mock. Used for created_by, for
// comment authorship, and as the identity a like is toggled for.
export const CURRENT_USER = 'Ruhaab Markas'

const selectById = db.prepare('SELECT * FROM daily_logs WHERE id = ?')
const deleteById = db.prepare('DELETE FROM daily_logs WHERE id = ?')
const deleteCommentsForLog = db.prepare('DELETE FROM daily_log_comments WHERE log_id = ?')
const selectComments = db.prepare('SELECT * FROM daily_log_comments WHERE log_id = ? ORDER BY created_at, id')
const countComments = db.prepare('SELECT COUNT(*) AS n FROM daily_log_comments WHERE log_id = ?')
const insertComment = db.prepare(
  'INSERT INTO daily_log_comments (id, log_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)',
)
const deleteCommentById = db.prepare('DELETE FROM daily_log_comments WHERE id = ?')

const COLUMNS = `id, job_id, title, log_date, notes, tags, share_internal, share_subs,
  share_client, is_private, notify_users, include_weather, include_weather_notes,
  weather_notes, weather, photos, attachments, status, likes, created_by, created_at, updated_at`

const insertStmt = db.prepare(`
  INSERT INTO daily_logs (${COLUMNS}) VALUES (
    @id, @job_id, @title, @log_date, @notes, @tags, @share_internal, @share_subs,
    @share_client, @is_private, @notify_users, @include_weather, @include_weather_notes,
    @weather_notes, @weather, @photos, @attachments, @status, @likes, @created_by,
    @created_at, @updated_at
  )
`)

const updateStmt = db.prepare(`
  UPDATE daily_logs SET
    title = @title, log_date = @log_date, notes = @notes, tags = @tags,
    share_internal = @share_internal, share_subs = @share_subs,
    share_client = @share_client, is_private = @is_private,
    notify_users = @notify_users, include_weather = @include_weather,
    include_weather_notes = @include_weather_notes, weather_notes = @weather_notes,
    weather = @weather, photos = @photos, attachments = @attachments,
    status = @status, updated_at = @updated_at
  WHERE id = @id
`)

// Comment count is derived rather than stored so it can never drift from the
// comments table; likedByMe saves every caller from re-deriving it.
function decorate(log) {
  if (!log) return null
  return {
    ...log,
    commentCount: countComments.get(log.id).n,
    likeCount: log.likes.length,
    likedByMe: log.likes.includes(CURRENT_USER),
  }
}

// Mirrors the live filter drawer's "Date" select. Ranges are inclusive and
// resolved against the server's today, matching how the live list behaves
// when you leave a filter applied overnight.
function dateBounds(range, today = new Date()) {
  const iso = (d) => d.toISOString().slice(0, 10)
  const shift = (days) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return iso(d)
  }
  switch (range) {
    case 'today': return [iso(today), iso(today)]
    case 'yesterday': return [shift(-1), shift(-1)]
    case 'last7': return [shift(-6), iso(today)]
    case 'last30': return [shift(-29), iso(today)]
    case 'thisMonth': return [`${iso(today).slice(0, 7)}-01`, iso(today)]
    case 'future': return [shift(1), '9999-12-31']
    default: return null
  }
}

export function listLogs(jobId, filters = {}) {
  const where = ['job_id = ?']
  const params = [jobId]

  // "Shared with" in the live drawer filters by audience, not by author.
  // Private logs are their own audience and are excluded from the others.
  if (filters.sharedWith && filters.sharedWith !== 'all') {
    const column = { internal: 'share_internal', subs: 'share_subs', client: 'share_client', private: 'is_private' }[
      filters.sharedWith
    ]
    if (column) where.push(`${column} = 1`)
    if (column && column !== 'is_private') where.push('is_private = 0')
  }

  if (filters.keywords) {
    where.push('(LOWER(title) LIKE ? OR LOWER(notes) LIKE ? OR LOWER(tags) LIKE ?)')
    const needle = `%${filters.keywords.toLowerCase()}%`
    params.push(needle, needle, needle)
  }

  if (filters.createdBy) {
    where.push('LOWER(created_by) LIKE ?')
    params.push(`%${filters.createdBy.toLowerCase()}%`)
  }

  const bounds = dateBounds(filters.dateRange)
  if (bounds) {
    where.push('log_date >= ? AND log_date <= ?')
    params.push(bounds[0], bounds[1])
  }

  if (filters.startDate) { where.push('log_date >= ?'); params.push(filters.startDate) }
  if (filters.endDate) { where.push('log_date <= ?'); params.push(filters.endDate) }
  if (filters.status) { where.push('status = ?'); params.push(filters.status) }

  const rows = db
    .prepare(`SELECT * FROM daily_logs WHERE ${where.join(' AND ')} ORDER BY log_date DESC, id DESC`)
    .all(...params)

  let logs = rows.map(rowToDailyLog)

  // Tags live in a JSON text column, so an exact per-tag match has to happen
  // after parsing — a LIKE on the raw JSON would match substrings across
  // tag boundaries ("Roof" hitting "Roofing").
  if (filters.tags?.length) {
    const wanted = filters.tags.map((t) => t.toLowerCase())
    logs = logs.filter((log) => log.tags.some((t) => wanted.includes(t.toLowerCase())))
  }

  return logs.map(decorate)
}

export function getLog(id) {
  const log = rowToDailyLog(selectById.get(id))
  if (!log) return null
  return { ...decorate(log), comments: selectComments.all(id).map(rowToComment) }
}

function rowToComment(row) {
  return { id: row.id, logId: row.log_id, author: row.author, body: row.body, createdAt: row.created_at }
}

export function createLog(body) {
  const now = new Date().toISOString()
  const id = nextDailyLogId()
  // Weather is snapshotted at save time, not looked up on read: the live
  // detail view keeps showing the conditions as of the logged day even
  // months later, and an unchecked "Include Weather Conditions" means the
  // log genuinely has no weather rather than a hidden one.
  const weather = body.includeWeather ?? true ? weatherFor(body.jobId, body.date) : null
  const row = {
    id,
    ...dailyLogToRow({ ...body, weather }),
    created_by: body.createdBy || CURRENT_USER,
    created_at: now,
    updated_at: now,
  }
  insertStmt.run(row)
  return getLog(id)
}

export function updateLog(id, body) {
  const existing = selectById.get(id)
  if (!existing) return null
  // Partial update: merge over the stored log so omitted fields keep their
  // value rather than falling back to dailyLogToRow's defaults. Before this,
  // a notes-only edit reset photos and tags, and — because `status` defaults
  // to 'published' — silently promoted a draft.
  const previous = rowToDailyLog(existing)
  const merged = { ...previous, ...body, jobId: existing.job_id }

  // Re-snapshot only when the date changed or weather was just turned on —
  // otherwise an unrelated edit (fixing a typo in Notes) would silently
  // rewrite the recorded conditions. Read from `merged`, not `body`: an edit
  // that omits `date` must compare against the stored date, not undefined.
  let weather = previous.weather
  if (!merged.includeWeather) weather = null
  else if (!previous.weather || previous.date !== merged.date) weather = weatherFor(existing.job_id, merged.date)

  // node:sqlite rejects named parameters a statement doesn't declare, so
  // drop the two dailyLogToRow fields updateStmt deliberately never sets:
  // job_id (a log can't move jobs after creation) and likes (owned solely
  // by toggleLike, and an edit must not clobber other people's likes).
  const { job_id: _job_id, likes: _likes, ...updatable } = dailyLogToRow({ ...merged, weather })
  updateStmt.run({ id, ...updatable, updated_at: new Date().toISOString() })
  return getLog(id)
}

export function deleteLog(id) {
  if (!selectById.get(id)) return false
  deleteCommentsForLog.run(id)
  deleteById.run(id)
  return true
}

// Toggle, matching the live heart button: clicking again un-likes.
export function toggleLike(id) {
  const log = rowToDailyLog(selectById.get(id))
  if (!log) return null
  const likes = log.likes.includes(CURRENT_USER)
    ? log.likes.filter((u) => u !== CURRENT_USER)
    : [...log.likes, CURRENT_USER]
  db.prepare('UPDATE daily_logs SET likes = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(likes),
    new Date().toISOString(),
    id,
  )
  return getLog(id)
}

export function addComment(logId, bodyText) {
  if (!selectById.get(logId)) return null
  const id = nextDailyLogCommentId()
  insertComment.run(id, logId, CURRENT_USER, bodyText, new Date().toISOString())
  return getLog(logId)
}

export function deleteComment(commentId) {
  const row = db.prepare('SELECT * FROM daily_log_comments WHERE id = ?').get(commentId)
  if (!row) return null
  deleteCommentById.run(commentId)
  return getLog(row.log_id)
}

// Powers the tag autocomplete on the add/edit form and the filter drawer's
// Tags field — the live app suggests tags already used on the job.
export function listTags(jobId) {
  const rows = db.prepare('SELECT tags FROM daily_logs WHERE job_id = ?').all(jobId)
  const seen = new Set()
  for (const row of rows) for (const tag of JSON.parse(row.tags)) seen.add(tag)
  return [...seen].sort((a, b) => a.localeCompare(b))
}

export function getSettings() {
  return rowToSettings(db.prepare('SELECT * FROM daily_log_settings WHERE id = 1').get())
}

export function updateSettings(body) {
  const current = getSettings()
  const merged = { ...current, ...body, share: { ...current.share, ...body.share }, notify: { ...current.notify, ...body.notify } }
  db.prepare(`
    UPDATE daily_log_settings SET
      stamp_location = ?, default_notes = ?, default_include_weather = ?,
      default_include_weather_notes = ?, share_internal = ?, share_subs = ?,
      share_client = ?, notify_internal = ?, notify_subs = ?, notify_client = ?
    WHERE id = 1
  `).run(
    merged.stampLocation ? 1 : 0,
    String(merged.defaultNotes ?? ''),
    merged.defaultIncludeWeather ? 1 : 0,
    merged.defaultIncludeWeatherNotes ? 1 : 0,
    // Internal Users is checked-and-disabled in the live settings grid —
    // every log is at minimum visible internally, so this can't be cleared.
    1,
    merged.share.subs ? 1 : 0,
    merged.share.client ? 1 : 0,
    merged.notify.internal ? 1 : 0,
    merged.notify.subs ? 1 : 0,
    merged.notify.client ? 1 : 0,
  )
  return getSettings()
}

export { weatherFor }
