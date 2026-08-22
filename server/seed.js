import { db, itemToRow, groupToRow, estimateItemToRow } from './db.js'
import { scheduleByJob } from '../src/data/schedule.js'
import { estimatesByJob } from '../src/data/estimates.js'

const insertStmt = db.prepare(`
  INSERT INTO schedule_items (
    id, job_id, title, color, assignees, start_date, end_date, work_days,
    hourly, progress, reminder, complete, phase, tags, show_on_gantt,
    show_client, sub_ids, notes, created_by, created_at, updated_at
  ) VALUES (
    @id, @job_id, @title, @color, @assignees, @start_date, @end_date, @work_days,
    @hourly, @progress, @reminder, @complete, @phase, @tags, @show_on_gantt,
    @show_client, @sub_ids, @notes, @created_by, @created_at, @updated_at
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
}

// Manual entry point: `node server/seed.js` (idempotent) or
// `node server/seed.js --reset` (clears and reseeds).
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--reset')) {
    clearItems.run()
    clearEstimateItems.run()
    clearEstimateGroups.run()
    seed()
    seedEstimates()
    console.log('Reset and reseeded schedule_items and estimate_groups/estimate_items.')
  } else {
    ensureSeeded()
    console.log('Done (no-op if already seeded).')
  }
}
