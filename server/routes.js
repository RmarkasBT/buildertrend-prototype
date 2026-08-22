import { db, rowToItem, itemToRow, nextScheduleId } from './db.js'

const selectByJob = db.prepare('SELECT * FROM schedule_items WHERE job_id = ? ORDER BY start_date, id')
const selectById = db.prepare('SELECT * FROM schedule_items WHERE id = ?')
const deleteById = db.prepare('DELETE FROM schedule_items WHERE id = ?')

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

const updateStmt = db.prepare(`
  UPDATE schedule_items SET
    title = @title, color = @color, assignees = @assignees,
    start_date = @start_date, end_date = @end_date, work_days = @work_days,
    hourly = @hourly, progress = @progress, reminder = @reminder,
    complete = @complete, phase = @phase, tags = @tags,
    show_on_gantt = @show_on_gantt, show_client = @show_client,
    sub_ids = @sub_ids, notes = @notes, updated_at = @updated_at
  WHERE id = @id
`)

export function listItems(jobId) {
  return selectByJob.all(jobId).map(rowToItem)
}

export function createItem(body) {
  const now = new Date().toISOString()
  const id = nextScheduleId()
  const row = { id, ...itemToRow(body), created_by: 'Ruhaab Markas', created_at: now, updated_at: now }
  insertStmt.run(row)
  return rowToItem(selectById.get(id))
}

export function updateItem(id, body) {
  const existing = selectById.get(id)
  if (!existing) return null
  const row = { id, ...itemToRow({ ...body, jobId: existing.job_id }), updated_at: new Date().toISOString() }
  updateStmt.run(row)
  return rowToItem(selectById.get(id))
}

export function deleteItem(id) {
  const existing = selectById.get(id)
  if (!existing) return false
  deleteById.run(id)
  return true
}
