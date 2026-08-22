import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// better-sqlite3's prebuilt AND from-source-compiled native bindings both
// segfault on this machine (confirmed: reproducible SIGSEGV on `new
// Database(path)` even after a clean `node-gyp rebuild`) — a real, deep
// native/ABI incompatibility in this environment, not a fixable config
// issue. Using Node 22's built-in `node:sqlite` instead (run with
// --experimental-sqlite — see package.json's dev:server script), exactly
// the fallback this plan called out for native-module friction. Zero new
// npm dependencies as a result; the only real cost is the experimental
// flag/warning and a slightly less mature API.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// One table, scoped by job_id — a plain string "soft reference" to
// src/data/jobs.js's static ids ('j1'..'j6'). Jobs/clients/subs-vendors
// stay static fixtures; this DB only ever holds schedule_items.
export const db = new DatabaseSync(path.join(__dirname, 'schedule.db'))
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS schedule_items (
    id            TEXT PRIMARY KEY,
    job_id        TEXT NOT NULL,
    title         TEXT NOT NULL,
    color         TEXT NOT NULL DEFAULT 'Victoria',
    assignees     TEXT NOT NULL DEFAULT '',
    start_date    TEXT NOT NULL,
    end_date      TEXT NOT NULL,
    work_days     INTEGER NOT NULL DEFAULT 1,
    hourly        INTEGER NOT NULL DEFAULT 0,
    progress      INTEGER NOT NULL DEFAULT 0,
    reminder      TEXT NOT NULL DEFAULT 'None',
    complete      INTEGER NOT NULL DEFAULT 0,
    phase         TEXT NOT NULL DEFAULT 'Unassigned',
    tags          TEXT NOT NULL DEFAULT '[]',
    show_on_gantt INTEGER NOT NULL DEFAULT 1,
    show_client   INTEGER NOT NULL DEFAULT 1,
    sub_ids       TEXT NOT NULL DEFAULT '[]',
    notes         TEXT NOT NULL DEFAULT '',
    created_by    TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_schedule_items_job_id ON schedule_items(job_id);

  CREATE TABLE IF NOT EXISTS estimate_groups (
    id         TEXT PRIMARY KEY,
    job_id     TEXT NOT NULL,
    name       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_estimate_groups_job_id ON estimate_groups(job_id);

  CREATE TABLE IF NOT EXISTS estimate_items (
    id             TEXT PRIMARY KEY,
    job_id         TEXT NOT NULL,
    group_id       TEXT NOT NULL,
    name           TEXT NOT NULL,
    cost_code      TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    quantity       REAL NOT NULL DEFAULT 1,
    unit           TEXT NOT NULL DEFAULT '',
    unit_cost      REAL NOT NULL DEFAULT 0,
    cost_type      TEXT NOT NULL DEFAULT 'None',
    markup_percent REAL NOT NULL DEFAULT 0,
    taxable        INTEGER NOT NULL DEFAULT 0,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_by     TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_estimate_items_job_id ON estimate_items(job_id);
  CREATE INDEX IF NOT EXISTS idx_estimate_items_group_id ON estimate_items(group_id);

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

const initCounter = db.prepare(`INSERT INTO meta (key, value) VALUES ('next_schedule_id', '100')
  ON CONFLICT(key) DO NOTHING`)
initCounter.run()

for (const [key, start] of [['next_estimate_group_id', '100'], ['next_estimate_item_id', '100']]) {
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`).run(key, start)
}

// Added after estimate_items already existed in some dev DBs — node:sqlite
// has no "ADD COLUMN IF NOT EXISTS", so guard the migration instead of
// re-running CREATE TABLE (which is a no-op once the table exists).
try {
  db.exec(`ALTER TABLE estimate_items ADD COLUMN internal_notes TEXT NOT NULL DEFAULT ''`)
} catch (err) {
  if (!String(err.message).includes('duplicate column name')) throw err
}

// Predecessors & Links — observed as a real tab on the Schedule Item modal
// (CAPTURE_LOG.md) but originally left unimplemented. Added to support a
// basic finish-to-start dependency model for the Gantt view's dependency
// arrows and Critical Path toggle.
try {
  db.exec(`ALTER TABLE schedule_items ADD COLUMN predecessor_ids TEXT NOT NULL DEFAULT '[]'`)
} catch (err) {
  if (!String(err.message).includes('duplicate column name')) throw err
}

// DB row (snake_case, 0/1 booleans, JSON-text arrays) <-> frontend item
// shape (camelCase, real booleans/arrays) — matches src/data/schedule.js's
// item() fields exactly, so the JSON the frontend sees is unchanged.
export function rowToItem(row) {
  if (!row) return null
  return {
    id: row.id,
    jobId: row.job_id,
    title: row.title,
    color: row.color,
    assignees: row.assignees,
    start: row.start_date,
    end: row.end_date,
    workDays: row.work_days,
    hourly: Boolean(row.hourly),
    progress: row.progress,
    reminder: row.reminder,
    complete: Boolean(row.complete),
    phase: row.phase,
    tags: JSON.parse(row.tags),
    showOnGantt: Boolean(row.show_on_gantt),
    showClient: Boolean(row.show_client),
    subIds: JSON.parse(row.sub_ids),
    predecessorIds: JSON.parse(row.predecessor_ids ?? '[]'),
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function itemToRow(item) {
  return {
    job_id: item.jobId,
    title: item.title,
    color: item.color ?? 'Victoria',
    assignees: item.assignees ?? '',
    start_date: item.start,
    end_date: item.end,
    work_days: item.workDays ?? 1,
    hourly: item.hourly ? 1 : 0,
    progress: item.progress ?? 0,
    reminder: item.reminder ?? 'None',
    complete: item.complete ? 1 : 0,
    phase: item.phase ?? 'Unassigned',
    tags: JSON.stringify(item.tags ?? []),
    show_on_gantt: item.showOnGantt ?? true ? 1 : 0,
    show_client: item.showClient ?? true ? 1 : 0,
    sub_ids: JSON.stringify(item.subIds ?? []),
    predecessor_ids: JSON.stringify(item.predecessorIds ?? []),
    notes: item.notes ?? '',
  }
}

const getCounter = db.prepare(`SELECT value FROM meta WHERE key = 'next_schedule_id'`)
const setCounter = db.prepare(`UPDATE meta SET value = ? WHERE key = 'next_schedule_id'`)

// node:sqlite's DatabaseSync has no built-in `.transaction()` helper (unlike
// better-sqlite3) — wrap manually. Fine for this single-process dev server.
export function nextScheduleId() {
  db.exec('BEGIN')
  try {
    const current = Number(getCounter.get().value)
    setCounter.run(String(current + 1))
    db.exec('COMMIT')
    return `s${current}`
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// DB row <-> frontend shape for estimate groups (the real Estimate screen's
// "Unassigned"-style row groupings — see server/estimateRoutes.js).
export function rowToGroup(row) {
  if (!row) return null
  return { id: row.id, jobId: row.job_id, name: row.name, sortOrder: row.sort_order, createdAt: row.created_at }
}

export function groupToRow(group) {
  return { job_id: group.jobId, name: group.name, sort_order: group.sortOrder ?? 0 }
}

// Estimate item DB row <-> frontend raw shape (no computed financials yet —
// see estimateRoutes.js:withFinancials for Builder Cost/Unit Price/Client
// Price/Margin/Profit, which are derived, not stored, matching the real
// worksheet's live recalculation).
export function rowToEstimateItem(row) {
  if (!row) return null
  return {
    id: row.id,
    jobId: row.job_id,
    groupId: row.group_id,
    name: row.name,
    costCode: row.cost_code,
    description: row.description,
    internalNotes: row.internal_notes,
    quantity: row.quantity,
    unit: row.unit,
    unitCost: row.unit_cost,
    costType: row.cost_type,
    markupPercent: row.markup_percent,
    taxable: Boolean(row.taxable),
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function estimateItemToRow(item) {
  return {
    job_id: item.jobId,
    group_id: item.groupId,
    name: item.name,
    cost_code: item.costCode ?? '',
    description: item.description ?? '',
    internal_notes: item.internalNotes ?? '',
    quantity: item.quantity ?? 1,
    unit: item.unit ?? '',
    unit_cost: item.unitCost ?? 0,
    cost_type: item.costType ?? 'None',
    markup_percent: item.markupPercent ?? 0,
    taxable: item.taxable ? 1 : 0,
    sort_order: item.sortOrder ?? 0,
  }
}

const getGroupCounter = db.prepare(`SELECT value FROM meta WHERE key = 'next_estimate_group_id'`)
const setGroupCounter = db.prepare(`UPDATE meta SET value = ? WHERE key = 'next_estimate_group_id'`)
const getItemCounter = db.prepare(`SELECT value FROM meta WHERE key = 'next_estimate_item_id'`)
const setItemCounter = db.prepare(`UPDATE meta SET value = ? WHERE key = 'next_estimate_item_id'`)

export function nextEstimateGroupId() {
  db.exec('BEGIN')
  try {
    const current = Number(getGroupCounter.get().value)
    setGroupCounter.run(String(current + 1))
    db.exec('COMMIT')
    return `eg${current}`
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function nextEstimateItemId() {
  db.exec('BEGIN')
  try {
    const current = Number(getItemCounter.get().value)
    setItemCounter.run(String(current + 1))
    db.exec('COMMIT')
    return `ei${current}`
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Daily Logs
// ---------------------------------------------------------------------------
// Column set mirrors the live /app/DailyLogAdd form field-for-field: title
// (max 50), job, date, tags, notes (max 4000), Permissions > Share
// (Internal Users / Subs-Vendors / Client / Private), Notify users, and the
// Weather block (Include Weather Conditions + Include Weather Notes). Draft
// vs published is the same two-state the live form's "Draft" chip + Publish
// button imply. Likes/comments back the ♡/💬 counters on the list card.
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_logs (
    id                    TEXT PRIMARY KEY,
    job_id                TEXT NOT NULL,
    title                 TEXT NOT NULL DEFAULT '',
    log_date              TEXT NOT NULL,
    notes                 TEXT NOT NULL DEFAULT '',
    tags                  TEXT NOT NULL DEFAULT '[]',
    share_internal        INTEGER NOT NULL DEFAULT 1,
    share_subs            INTEGER NOT NULL DEFAULT 0,
    share_client          INTEGER NOT NULL DEFAULT 0,
    is_private            INTEGER NOT NULL DEFAULT 0,
    notify_users          TEXT NOT NULL DEFAULT '[]',
    include_weather       INTEGER NOT NULL DEFAULT 1,
    include_weather_notes INTEGER NOT NULL DEFAULT 0,
    weather_notes         TEXT NOT NULL DEFAULT '',
    weather               TEXT NOT NULL DEFAULT 'null',
    photos                TEXT NOT NULL DEFAULT '[]',
    attachments           TEXT NOT NULL DEFAULT '[]',
    status                TEXT NOT NULL DEFAULT 'published',
    likes                 TEXT NOT NULL DEFAULT '[]',
    created_by            TEXT NOT NULL,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_daily_logs_job_id ON daily_logs(job_id);
  CREATE INDEX IF NOT EXISTS idx_daily_logs_log_date ON daily_logs(log_date);

  CREATE TABLE IF NOT EXISTS daily_log_comments (
    id         TEXT PRIMARY KEY,
    log_id     TEXT NOT NULL,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_daily_log_comments_log_id ON daily_log_comments(log_id);

  -- Single row (id = 1). Backs the gear-icon "Daily Logs" settings modal:
  -- Stamp Location, Default Daily Log Notes, the two weather defaults, and
  -- the Default Daily Log Share Settings share/notify grid.
  CREATE TABLE IF NOT EXISTS daily_log_settings (
    id                            INTEGER PRIMARY KEY CHECK (id = 1),
    stamp_location                INTEGER NOT NULL DEFAULT 1,
    default_notes                 TEXT    NOT NULL,
    default_include_weather       INTEGER NOT NULL DEFAULT 1,
    default_include_weather_notes INTEGER NOT NULL DEFAULT 0,
    share_internal                INTEGER NOT NULL DEFAULT 1,
    share_subs                    INTEGER NOT NULL DEFAULT 0,
    share_client                  INTEGER NOT NULL DEFAULT 0,
    notify_internal               INTEGER NOT NULL DEFAULT 0,
    notify_subs                   INTEGER NOT NULL DEFAULT 0,
    notify_client                 INTEGER NOT NULL DEFAULT 0
  );
`)

// The live settings modal ships this exact three-heading template as the
// out-of-the-box "Default Daily Log Notes" value, which is why every new
// log's Notes box opens pre-filled with it.
export const DEFAULT_LOG_NOTES = 'Progress:\n\n\nIssues:\n\n\nMaterials Delivered:\n'

db.prepare(`INSERT INTO daily_log_settings (id, default_notes) VALUES (1, ?)
  ON CONFLICT(id) DO NOTHING`).run(DEFAULT_LOG_NOTES)

for (const [key, start] of [['next_daily_log_id', '100'], ['next_daily_log_comment_id', '100']]) {
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`).run(key, start)
}

function nextId(key, prefix) {
  db.exec('BEGIN')
  try {
    const current = Number(db.prepare('SELECT value FROM meta WHERE key = ?').get(key).value)
    db.prepare('UPDATE meta SET value = ? WHERE key = ?').run(String(current + 1), key)
    db.exec('COMMIT')
    return `${prefix}${current}`
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export const nextDailyLogId = () => nextId('next_daily_log_id', 'dl')
export const nextDailyLogCommentId = () => nextId('next_daily_log_comment_id', 'dlc')

export function rowToDailyLog(row) {
  if (!row) return null
  return {
    id: row.id,
    jobId: row.job_id,
    title: row.title,
    date: row.log_date,
    notes: row.notes,
    tags: JSON.parse(row.tags),
    shareInternal: Boolean(row.share_internal),
    shareSubs: Boolean(row.share_subs),
    shareClient: Boolean(row.share_client),
    isPrivate: Boolean(row.is_private),
    notifyUsers: JSON.parse(row.notify_users),
    includeWeather: Boolean(row.include_weather),
    includeWeatherNotes: Boolean(row.include_weather_notes),
    weatherNotes: row.weather_notes,
    weather: JSON.parse(row.weather),
    photos: JSON.parse(row.photos),
    attachments: JSON.parse(row.attachments),
    status: row.status,
    likes: JSON.parse(row.likes),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function dailyLogToRow(log) {
  return {
    job_id: log.jobId,
    // The live title input caps at 50 characters ("Maximum 50 characters").
    title: String(log.title ?? '').slice(0, 50),
    log_date: log.date,
    // The live Notes box caps at 4000 ("Maximum 4000 characters").
    notes: String(log.notes ?? '').slice(0, 4000),
    tags: JSON.stringify(log.tags ?? []),
    share_internal: log.shareInternal ?? true ? 1 : 0,
    share_subs: log.shareSubs ? 1 : 0,
    share_client: log.shareClient ? 1 : 0,
    is_private: log.isPrivate ? 1 : 0,
    notify_users: JSON.stringify(log.notifyUsers ?? []),
    include_weather: log.includeWeather ?? true ? 1 : 0,
    include_weather_notes: log.includeWeatherNotes ? 1 : 0,
    weather_notes: log.weatherNotes ?? '',
    weather: JSON.stringify(log.weather ?? null),
    photos: JSON.stringify(log.photos ?? []),
    attachments: JSON.stringify(log.attachments ?? []),
    status: log.status === 'draft' ? 'draft' : 'published',
    likes: JSON.stringify(log.likes ?? []),
  }
}

export function rowToSettings(row) {
  return {
    stampLocation: Boolean(row.stamp_location),
    defaultNotes: row.default_notes,
    defaultIncludeWeather: Boolean(row.default_include_weather),
    defaultIncludeWeatherNotes: Boolean(row.default_include_weather_notes),
    share: {
      internal: Boolean(row.share_internal),
      subs: Boolean(row.share_subs),
      client: Boolean(row.share_client),
    },
    notify: {
      internal: Boolean(row.notify_internal),
      subs: Boolean(row.notify_subs),
      client: Boolean(row.notify_client),
    },
  }
}
