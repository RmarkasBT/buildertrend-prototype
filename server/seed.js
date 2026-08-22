import { db, itemToRow, groupToRow, estimateItemToRow, dailyLogToRow } from './db.js'
import { scheduleByJob } from '../src/data/schedule.js'
import { estimatesByJob } from '../src/data/estimates.js'
import { dailyLogsByJob } from '../src/data/dailyLogs.js'
import { weatherFor } from './weather.js'

const insertStmt = db.prepare(`
  INSERT INTO schedule_items (
    id, job_id, title, color, assignees, start_date, end_date, work_days,
    hourly, progress, reminder, complete, phase, tags, show_on_gantt,
    show_client, sub_ids, predecessor_ids, notes, created_by, created_at, updated_at
  ) VALUES (
    @id, @job_id, @title, @color, @assignees, @start_date, @end_date, @work_days,
    @hourly, @progress, @reminder, @complete, @phase, @tags, @show_on_gantt,
    @show_client, @sub_ids, @predecessor_ids, @notes, @created_by, @created_at, @updated_at
  )
`)

const countStmt = db.prepare('SELECT COUNT(*) AS n FROM schedule_items')
const clearItems = db.prepare('DELETE FROM schedule_items')
const resetCounter = db.prepare(`UPDATE meta SET value = '100' WHERE key = 'next_schedule_id'`)

function seed() {
  // node:sqlite's DatabaseSync has no `.transaction()` helper — wrap manually.
  db.exec('BEGIN')
  try {
    for (const [jobId, items] of Object.entries(scheduleByJob)) {
      for (const item of items) {
        const row = {
          id: item.id,
          ...itemToRow({ ...item, jobId }),
          notes: item.notes ?? '',
          created_by: item.createdBy,
          created_at: item.createdAt,
          updated_at: item.createdAt,
        }
        insertStmt.run(row)
      }
    }
    resetCounter.run()
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

const insertGroupStmt = db.prepare(`
  INSERT INTO estimate_groups (id, job_id, name, sort_order, created_at)
  VALUES (@id, @job_id, @name, @sort_order, @created_at)
`)
const insertEstimateItemStmt = db.prepare(`
  INSERT INTO estimate_items (
    id, job_id, group_id, name, cost_code, description, internal_notes,
    quantity, unit, unit_cost, cost_type, markup_percent, taxable, sort_order,
    created_by, created_at, updated_at
  ) VALUES (
    @id, @job_id, @group_id, @name, @cost_code, @description, @internal_notes,
    @quantity, @unit, @unit_cost, @cost_type, @markup_percent, @taxable, @sort_order,
    @created_by, @created_at, @updated_at
  )
`)
const countEstimateGroupsStmt = db.prepare('SELECT COUNT(*) AS n FROM estimate_groups')
const clearEstimateGroups = db.prepare('DELETE FROM estimate_groups')
const clearEstimateItems = db.prepare('DELETE FROM estimate_items')
const resetGroupCounter = db.prepare(`UPDATE meta SET value = '100' WHERE key = 'next_estimate_group_id'`)
const resetItemCounter = db.prepare(`UPDATE meta SET value = '100' WHERE key = 'next_estimate_item_id'`)

function seedEstimates() {
  db.exec('BEGIN')
  try {
    const now = new Date().toISOString()
    for (const [jobId, estimate] of Object.entries(estimatesByJob)) {
      estimate.groups.forEach((group, groupIndex) => {
        insertGroupStmt.run({ ...groupToRow({ jobId, name: group.name, sortOrder: groupIndex }), id: group.id, created_at: now })
        group.items.forEach((item, itemIndex) => {
          insertEstimateItemStmt.run({
            id: item.id,
            ...estimateItemToRow({ ...item, jobId, groupId: group.id, sortOrder: itemIndex }),
            created_by: 'Ruhaab Markas',
            created_at: now,
            updated_at: now,
          })
        })
      })
    }
    resetGroupCounter.run()
    resetItemCounter.run()
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

const insertDailyLogStmt = db.prepare(`
  INSERT INTO daily_logs (
    id, job_id, title, log_date, notes, tags, share_internal, share_subs,
    share_client, is_private, notify_users, include_weather, include_weather_notes,
    weather_notes, weather, photos, attachments, status, likes, created_by,
    created_at, updated_at
  ) VALUES (
    @id, @job_id, @title, @log_date, @notes, @tags, @share_internal, @share_subs,
    @share_client, @is_private, @notify_users, @include_weather, @include_weather_notes,
    @weather_notes, @weather, @photos, @attachments, @status, @likes, @created_by,
    @created_at, @updated_at
  )
`)
const insertDailyLogCommentStmt = db.prepare(`
  INSERT INTO daily_log_comments (id, log_id, author, body, created_at)
  VALUES (?, ?, ?, ?, ?)
`)
const countDailyLogsStmt = db.prepare('SELECT COUNT(*) AS n FROM daily_logs')
const clearDailyLogs = db.prepare('DELETE FROM daily_logs')
const clearDailyLogComments = db.prepare('DELETE FROM daily_log_comments')
const resetDailyLogCounter = db.prepare(`UPDATE meta SET value = '100' WHERE key = 'next_daily_log_id'`)
const resetDailyLogCommentCounter = db.prepare(`UPDATE meta SET value = '100' WHERE key = 'next_daily_log_comment_id'`)

function seedDailyLogs() {
  db.exec('BEGIN')
  try {
    let commentSeq = 1
    for (const [jobId, logs] of Object.entries(dailyLogsByJob)) {
      for (const log of logs) {
        // Same snapshot-at-write rule the API uses (dailyLogRoutes.createLog),
        // so a seeded log and a UI-created one are indistinguishable on read.
        const weather = log.includeWeather ? weatherFor(jobId, log.date) : null
        insertDailyLogStmt.run({
          id: log.id,
          ...dailyLogToRow({ ...log, jobId, weather }),
          created_by: log.createdBy,
          created_at: log.createdAt,
          updated_at: log.createdAt,
        })
        for (const comment of log.comments ?? []) {
          insertDailyLogCommentStmt.run(`dlc${commentSeq++}`, log.id, comment.author, comment.body, comment.createdAt)
        }
      }
    }
    resetDailyLogCounter.run()
    resetDailyLogCommentCounter.run()
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// Called once at server startup so a fresh clone's first `npm run dev`
// just works with no manual seed step. Safe to call repeatedly — no-ops
// once the tables have any rows.
export function ensureSeeded() {
  if (countStmt.get().n === 0) {
    seed()
    console.log('Seeded schedule_items from src/data/schedule.js')
  }
  if (countEstimateGroupsStmt.get().n === 0) {
    seedEstimates()
    console.log('Seeded estimate_groups/estimate_items from src/data/estimates.js')
  }
  if (countDailyLogsStmt.get().n === 0) {
    seedDailyLogs()
    console.log('Seeded daily_logs/daily_log_comments from src/data/dailyLogs.js')
  }
}

// Manual entry point: `node server/seed.js` (idempotent) or
// `node server/seed.js --reset` (clears and reseeds).
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--reset')) {
    clearItems.run()
    clearEstimateItems.run()
    clearEstimateGroups.run()
    clearDailyLogComments.run()
    clearDailyLogs.run()
    seed()
    seedEstimates()
    seedDailyLogs()
    console.log('Reset and reseeded schedule_items, estimate_groups/estimate_items and daily_logs.')
  } else {
    ensureSeeded()
    console.log('Done (no-op if already seeded).')
  }
}
