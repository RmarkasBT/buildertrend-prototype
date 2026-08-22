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
