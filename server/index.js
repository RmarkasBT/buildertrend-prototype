import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  validateItem,
  validateBody,
  mergedItem,
  preparedNewItem,
} from './routes.js'
import * as estimates from './estimateRoutes.js'
import * as dailyLogs from './dailyLogRoutes.js'
import { jobIdError } from './jobs.js'
import { applyBatch, undoChangeSet, getChangeSet, listChangeSets } from './changeSets.js'
import * as workdays from './workdayRoutes.js'
import * as baselines from './baselineRoutes.js'
import { cascade, analyze } from '../src/lib/cascade.js'
import { isISODate, todayIso } from '../src/lib/dates.js'
import { validateDailyLogBody, validateEstimateItemBody } from './validate.js'
import { ensureSeeded } from './seed.js'

// Port must match vite.config.js's server.proxy target.
const PORT = 4000

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OPENAPI_PATH = path.join(__dirname, '..', 'openapi', 'schedule-estimate.yaml')

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch {
        // Tagged so the catch-all below answers 400 instead of 500. A
        // malformed body is the caller's mistake, and "internal server error"
        // tells an agent nothing it can act on — it just burns its retries.
        reject(Object.assign(new Error('request body is not valid JSON'), { statusCode: 400 }))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Validate a `changes` array for cascade-preview and batch. Shared so the two
 * cannot drift — a body the preview accepts must be one the batch accepts, or
 * an agent gets a clean preview and then a 400 on apply.
 * Returns an error string, or null.
 */
function validateCascadeChanges(changes) {
  const list = changes ?? []
  if (!Array.isArray(list)) {
    return 'changes must be an array of { itemId, shiftDays } or { itemId, start, workDays }'
  }
  for (const [i, r] of list.entries()) {
    if (!r || typeof r !== 'object') return `changes[${i}] must be an object`
    if (typeof r.itemId !== 'string' || !r.itemId) return `changes[${i}].itemId is required`
    if (r.start !== undefined && !isISODate(r.start)) {
      return `changes[${i}].start must be YYYY-MM-DD (got ${JSON.stringify(r.start)})`
    }
    if (r.shiftDays !== undefined && !Number.isInteger(Number(r.shiftDays))) {
      return `changes[${i}].shiftDays must be a whole number of work days (got ${JSON.stringify(r.shiftDays)})`
    }
    if (r.workDays !== undefined && (!Number.isInteger(Number(r.workDays)) || Number(r.workDays) < 1)) {
      return `changes[${i}].workDays must be an integer >= 1 (got ${JSON.stringify(r.workDays)})`
    }
    if (r.start === undefined && r.shiftDays === undefined && r.workDays === undefined) {
      return `changes[${i}] needs at least one of shiftDays, start or workDays`
    }
  }
  return null
}

const ID_ROUTE = /^\/api\/schedule\/([^/]+)$/
// /undo is matched before the bare /:id below, same reason the daily-log block
// puts its fixed sub-paths first.
const CHANGE_SET_UNDO_ROUTE = /^\/api\/change-sets\/([^/]+)\/undo$/
const CHANGE_SET_ID_ROUTE = /^\/api\/change-sets\/([^/]+)$/
// /calendar is a fixed sub-path and is matched before this, same rule as the
// rest of the file.
const WORKDAY_EXCEPTION_ROUTE = /^\/api\/workday-exceptions\/([^/]+)$/
const BASELINE_ID_ROUTE = /^\/api\/baselines\/([^/]+)$/
const ESTIMATE_GROUP_ROUTE = /^\/api\/estimate\/groups\/([^/]+)$/
const ESTIMATE_ITEM_ROUTE = /^\/api\/estimate\/items\/([^/]+)$/
const ESTIMATE_ITEM_DUPLICATE_ROUTE = /^\/api\/estimate\/items\/([^/]+)\/duplicate$/
const DAILY_LOG_ID_ROUTE = /^\/api\/daily-logs\/([^/]+)$/
const DAILY_LOG_LIKE_ROUTE = /^\/api\/daily-logs\/([^/]+)\/like$/
const DAILY_LOG_COMMENTS_ROUTE = /^\/api\/daily-logs\/([^/]+)\/comments$/
const DAILY_LOG_COMMENT_ROUTE = /^\/api\/daily-logs\/comments\/([^/]+)$/

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const { pathname, searchParams } = url
  // Opt-in request log — `LOG_REQUESTS=1 npm run dev:server`. Off by
  // default so normal runs don't bury the startup line in noise.
  if (process.env.LOG_REQUESTS) console.log(`${req.method} ${req.url}`)

  try {
    // Served fresh from disk on every request (not cached at startup) so
    // editing the YAML is visible on reload without restarting the server —
    // fine for a local dev-only mock. Lets an ADK agent point at one URL
    // (http://localhost:4000/openapi.yaml) instead of a filesystem path.
    if (pathname === '/openapi.yaml' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/yaml' })
      res.end(readFileSync(OPENAPI_PATH, 'utf8'))
      return
    }

    if (pathname === '/api/schedule' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 200, listItems(jobId))
    }

    if (pathname === '/api/schedule' && req.method === 'POST') {
      const body = await readBody(req)
      // start_date/end_date are NOT NULL columns (server/db.js) — validate
      // here so a missing value 400s cleanly instead of throwing past this
      // check into the generic 500 handler below.
      if (!body.title || !body.start) {
        return send(res, 400, { error: 'title and start are required' })
      }
      // A typo'd jobId used to 201 for a row no screen could ever render, so
      // an agent would report success for work that had effectively vanished.
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })
      const badField = validateBody(body)
      if (badField) return send(res, 400, { error: badField })
      const invalid = validateItem(preparedNewItem(body), body.jobId, null)
      if (invalid) return send(res, 400, { error: invalid })
      return send(res, 201, createItem(body))
    }

    // Fixed sub-path, so it MUST be matched before ID_ROUTE below or
    // "cascade-preview" gets read as a schedule item id. (It happens to be safe
    // today only because ID_ROUTE is guarded to PUT/PATCH/DELETE — exactly the
    // kind of accidental safety that breaks when someone adds GET /:id.)
    if (pathname === '/api/schedule/cascade-preview' && req.method === 'POST') {
      const body = await readBody(req)
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })

      const requests = body.changes ?? []
      const badChanges = validateCascadeChanges(body.changes)
      if (badChanges) return send(res, 400, { error: badChanges })

      const items = listItems(body.jobId)
      const calendar = workdays.calendarFor(body.jobId)
      const plan = cascade(items, requests, { mode: body.mode, today: todayIso(), calendar })

      if (!plan.ok) {
        if (plan.error === 'unknown_item') {
          return send(res, 400, {
            error: `unknown schedule item(s) for this job: ${plan.unknownIds.join(', ')}`,
            unknownIds: plan.unknownIds,
          })
        }
        if (plan.error === 'cycle') {
          const name = (id) => items.find((i) => i.id === id)?.title ?? id
          // 422, not 400: the request is well-formed, the stored graph isn't.
          return send(res, 422, {
            error: `this job's dependencies contain a loop, so nothing can be scheduled from them: ${plan.cycleIds.map(name).join(' -> ')}`,
            cycleIds: plan.cycleIds,
          })
        }
        return send(res, 400, { error: plan.error })
      }

      // Per-item float is what lets a caller say "absorbs into 5 days of slack"
      // instead of reporting every slip as a delay. Opt-in because it roughly
      // doubles the payload, and payload is tokens for an agent.
      let analysis
      if (body.includeAnalysis) {
        const base = analyze(items, { calendar })
        analysis = base.ok
          ? [...base.nodes.values()].map((n) => ({
              itemId: n.id,
              totalFloat: n.totalFloat,
              freeFloat: n.freeFloat,
              critical: n.critical,
            }))
          : []
      }

      return send(res, 200, { ...plan, ...(analysis ? { analysis } : {}) })
    }

    // Atomic multi-item write. Also a fixed sub-path, so it goes above ID_ROUTE.
    if (pathname === '/api/schedule/batch' && req.method === 'POST') {
      const body = await readBody(req)
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })
      const badChanges = validateCascadeChanges(body.changes)
      if (badChanges) return send(res, 400, { error: badChanges })

      // All awaits are done. From here it's plan -> reserve ids -> BEGIN.
      const result = applyBatch(body.jobId, body.changes ?? [], {
        mode: body.mode,
        origin: body.origin,
        originRef: body.originRef,
        reason: body.reason,
      })

      if (result.error === 'unknown_item') {
        return send(res, 400, {
          error: `unknown schedule item(s) for this job: ${result.unknownIds.join(', ')}`,
          unknownIds: result.unknownIds,
        })
      }
      if (result.error === 'cycle') {
        return send(res, 422, {
          error: `this job's dependencies contain a loop, so nothing was changed: ${result.cycleIds.join(' -> ')}`,
          cycleIds: result.cycleIds,
        })
      }
      if (result.noop) {
        // A drag that lands where it started. Nothing written, nothing to undo.
        return send(res, 200, { changeSet: null, items: result.items, plan: result.plan })
      }
      return send(res, 200, result)
    }

    const idMatch = pathname.match(ID_ROUTE)
    // PATCH and PUT are the same handler: updateItem merges over the stored row
    // either way. PATCH is the honest name for those semantics and is what the
    // spec points agents at; PUT stays for the existing callers.
    if (idMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
      const body = await readBody(req)
      const badField = validateBody(body)
      if (badField) return send(res, 400, { error: badField })
      const merged = mergedItem(idMatch[1], body)
      if (!merged) return send(res, 404, { error: 'not found' })
      const invalid = validateItem(merged, merged.jobId, idMatch[1])
      if (invalid) return send(res, 400, { error: invalid })
      const updated = updateItem(idMatch[1], body)
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    if (idMatch && req.method === 'DELETE') {
      const ok = deleteItem(idMatch[1])
      if (!ok) return send(res, 404, { error: 'not found' })
      return send(res, 204)
    }

    // --- Workday Exceptions ---------------------------------------------
    // The calendar route is read-only and exists so the browser derives dates
    // the same way the server does. Without it the Gantt would shade weekends
    // from a hardcoded Mon-Fri while the API cascaded around real holidays.
    if (pathname === '/api/workday-exceptions/calendar' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      const cal = workdays.calendarFor(jobId)
      return send(res, 200, { jobId, workWeek: cal.workWeek, exceptions: cal.exceptions })
    }

    if (pathname === '/api/workday-exceptions' && req.method === 'GET') {
      // jobId is optional here: omitting it lists every exception, which is
      // what the management tab shows.
      const jobId = searchParams.get('jobId')
      if (jobId) {
        const badJob = jobIdError(jobId)
        if (badJob) return send(res, 400, { error: badJob })
      }
      return send(res, 200, workdays.listExceptions(jobId || null))
    }

    if (pathname === '/api/workday-exceptions' && req.method === 'POST') {
      const body = await readBody(req)
      const bad = workdays.validateException(body)
      if (bad) return send(res, 400, { error: bad })
      return send(res, 201, workdays.createException(body))
    }

    const wxMatch = pathname.match(WORKDAY_EXCEPTION_ROUTE)
    if (wxMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
      const body = await readBody(req)
      const bad = workdays.validateException(body, { partial: true })
      if (bad) return send(res, 400, { error: bad })
      const updated = workdays.updateException(wxMatch[1], body)
      if (!updated) return send(res, 404, { error: 'workday exception not found' })
      return send(res, 200, updated)
    }

    if (wxMatch && req.method === 'DELETE') {
      if (!workdays.deleteException(wxMatch[1])) {
        return send(res, 404, { error: 'workday exception not found' })
      }
      return send(res, 204)
    }

    // --- Baseline -------------------------------------------------------
    if (pathname === '/api/baselines' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      // The active baseline plus a live comparison. `baseline: null` when none
      // has been set — a normal state, not an error.
      return send(res, 200, baselines.getComparison(jobId))
    }

    if (pathname === '/api/baselines/history' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 200, baselines.listBaselines(jobId))
    }

    if (pathname === '/api/baselines' && req.method === 'POST') {
      const body = await readBody(req)
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })
      if (body.name !== undefined && typeof body.name !== 'string') {
        return send(res, 400, { error: 'name must be a string' })
      }
      return send(res, 201, baselines.setBaseline(body.jobId, body.name))
    }

    const baselineMatch = pathname.match(BASELINE_ID_ROUTE)
    if (baselineMatch && req.method === 'DELETE') {
      if (!baselines.clearBaseline(baselineMatch[1])) {
        return send(res, 404, { error: 'baseline not found' })
      }
      return send(res, 204)
    }

    // --- Change sets (schedule history + undo) --------------------------
    if (pathname === '/api/change-sets' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 200, listChangeSets(jobId, searchParams.get('limit')))
    }

    const undoMatch = pathname.match(CHANGE_SET_UNDO_ROUTE)
    if (undoMatch && req.method === 'POST') {
      const body = await readBody(req)
      const result = undoChangeSet(undoMatch[1], { force: body.force === true })
      if (result.error === 'not_found') return send(res, 404, { error: 'change set not found' })
      if (result.error === 'already_undone') {
        return send(res, 409, {
          error: `already undone by ${result.undoneBy}`,
          undoneBy: result.undoneBy,
        })
      }
      if (result.error === 'stale') {
        return send(res, 409, {
          error: `these items changed since this was applied, so undoing would discard that work: ${result.itemIds.join(', ')}. Re-send with force:true to undo anyway.`,
          itemIds: result.itemIds,
        })
      }
      if (result.error === 'items_deleted') {
        return send(res, 409, {
          error: `these items no longer exist: ${result.itemIds.join(', ')}. Re-send with force:true to undo the rest.`,
          itemIds: result.itemIds,
        })
      }
      return send(res, 200, result)
    }

    const changeSetMatch = pathname.match(CHANGE_SET_ID_ROUTE)
    if (changeSetMatch && req.method === 'GET') {
      const set = getChangeSet(changeSetMatch[1])
      if (!set) return send(res, 404, { error: 'change set not found' })
      return send(res, 200, set)
    }

    if (pathname === '/api/estimate' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 200, estimates.getEstimate(jobId))
    }

    if (pathname === '/api/estimate/groups' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.name) return send(res, 400, { error: 'name is required' })
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 201, estimates.createGroup(body.jobId, body.name))
    }

    const groupIdMatch = pathname.match(ESTIMATE_GROUP_ROUTE)
    if (groupIdMatch && req.method === 'DELETE') {
      const ok = estimates.deleteGroup(groupIdMatch[1])
      if (!ok) return send(res, 404, { error: 'not found' })
      return send(res, 204)
    }

    if (pathname === '/api/estimate/items' && req.method === 'POST') {
      const body = await readBody(req)
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })
      const badField = validateEstimateItemBody(body, { require: ['name'] })
      if (badField) return send(res, 400, { error: badField })
      return send(res, 201, estimates.createItem(body.jobId, body))
    }

    const itemDuplicateMatch = pathname.match(ESTIMATE_ITEM_DUPLICATE_ROUTE)
    if (itemDuplicateMatch && req.method === 'POST') {
      const duplicated = estimates.duplicateItem(itemDuplicateMatch[1])
      if (!duplicated) return send(res, 404, { error: 'not found' })
      return send(res, 201, duplicated)
    }

    const itemIdMatch = pathname.match(ESTIMATE_ITEM_ROUTE)
    // PATCH alongside PUT, matching the schedule and daily-log routes:
    // updateItem merges over the stored row either way, so both verbs are
    // honest here and an agent can't guess the wrong one.
    if (itemIdMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
      const body = await readBody(req)
      // Body-level, not merged: a non-numeric quantity used to be stored
      // verbatim and made builderCost come back null on a 200.
      const badField = validateEstimateItemBody(body)
      if (badField) return send(res, 400, { error: badField })
      const updated = estimates.updateItem(itemIdMatch[1], body)
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    if (itemIdMatch && req.method === 'DELETE') {
      const ok = estimates.deleteItem(itemIdMatch[1])
      if (!ok) return send(res, 404, { error: 'not found' })
      return send(res, 204)
    }

    // --- Daily Logs ---------------------------------------------------
    // Fixed sub-paths (/weather, /tags, /comments/:id) are matched before
    // the generic /:id route below so an id regex can't swallow them.
    if (pathname === '/api/daily-logs' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 200, dailyLogs.listLogs(jobId, {
        sharedWith: searchParams.get('sharedWith') || undefined,
        keywords: searchParams.get('keywords') || undefined,
        createdBy: searchParams.get('createdBy') || undefined,
        dateRange: searchParams.get('dateRange') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        status: searchParams.get('status') || undefined,
        tags: searchParams.getAll('tag'),
      }))
    }

    if (pathname === '/api/daily-logs' && req.method === 'POST') {
      const body = await readBody(req)
      // log_date is NOT NULL — validate here so a missing date 400s cleanly
      // instead of falling through to the generic 500 handler.
      const badJob = jobIdError(body.jobId)
      if (badJob) return send(res, 400, { error: badJob })
      const badField = validateDailyLogBody(body, { require: ['date'] })
      if (badField) return send(res, 400, { error: badField })
      return send(res, 201, dailyLogs.createLog(body))
    }

    if (pathname === '/api/daily-logs/weather' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const date = searchParams.get('date')
      // The jobId check matters most on this route: weatherFor just hashes
      // whatever string it's handed, so an unvalidated typo returns a
      // confident, entirely invented forecast rather than an error.
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return send(res, 400, { error: `date query param must be YYYY-MM-DD (got ${JSON.stringify(date)})` })
      }
      return send(res, 200, dailyLogs.weatherFor(jobId, date))
    }

    if (pathname === '/api/daily-logs/tags' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      const badJob = jobIdError(jobId)
      if (badJob) return send(res, 400, { error: badJob })
      return send(res, 200, dailyLogs.listTags(jobId))
    }

    const logCommentMatch = pathname.match(DAILY_LOG_COMMENT_ROUTE)
    if (logCommentMatch && req.method === 'DELETE') {
      const updated = dailyLogs.deleteComment(logCommentMatch[1])
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    const logLikeMatch = pathname.match(DAILY_LOG_LIKE_ROUTE)
    if (logLikeMatch && req.method === 'POST') {
      const updated = dailyLogs.toggleLike(logLikeMatch[1])
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    const logCommentsMatch = pathname.match(DAILY_LOG_COMMENTS_ROUTE)
    if (logCommentsMatch && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.body?.trim()) return send(res, 400, { error: 'body is required' })
      const updated = dailyLogs.addComment(logCommentsMatch[1], body.body.trim())
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 201, updated)
    }

    const logIdMatch = pathname.match(DAILY_LOG_ID_ROUTE)
    if (logIdMatch && req.method === 'GET') {
      const log = dailyLogs.getLog(logIdMatch[1])
      if (!log) return send(res, 404, { error: 'not found' })
      return send(res, 200, log)
    }

    // PATCH and PUT share the handler: updateLog merges over the stored log
    // either way, so `date` is deliberately NOT required here — it comes from
    // the stored row. Requiring it made every partial edit 400.
    if (logIdMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
      const body = await readBody(req)
      // Body-level, not merged: `status: "archived"` used to fall through to
      // "published" and answer 200, silently publishing a draft, and a
      // non-array `tags` was stored as a string that then crashed the card.
      const badField = validateDailyLogBody(body)
      if (badField) return send(res, 400, { error: badField })
      const updated = dailyLogs.updateLog(logIdMatch[1], body)
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    if (logIdMatch && req.method === 'DELETE') {
      if (!dailyLogs.deleteLog(logIdMatch[1])) return send(res, 404, { error: 'not found' })
      return send(res, 204)
    }

    if (pathname === '/api/daily-log-settings' && req.method === 'GET') {
      return send(res, 200, dailyLogs.getSettings())
    }

    if (pathname === '/api/daily-log-settings' && req.method === 'PUT') {
      return send(res, 200, dailyLogs.updateSettings(await readBody(req)))
    }

    send(res, 404, { error: 'not found' })
  } catch (err) {
    // Errors tagged with a statusCode (see readBody) are the caller's fault
    // and answer as themselves; anything else is a genuine bug and stays a
    // 500. Keeps "internal server error" meaning what it says.
    if (err?.statusCode) return send(res, err.statusCode, { error: err.message })
    console.error(err)
    send(res, 500, { error: 'internal server error' })
  }
})

ensureSeeded()
server.listen(PORT, () => {
  console.log(`Schedule API listening on http://localhost:${PORT}`)
})
