import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { listItems, createItem, updateItem, deleteItem } from './routes.js'
import * as estimates from './estimateRoutes.js'
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
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

const ID_ROUTE = /^\/api\/schedule\/([^/]+)$/
const ESTIMATE_GROUP_ROUTE = /^\/api\/estimate\/groups\/([^/]+)$/
const ESTIMATE_ITEM_ROUTE = /^\/api\/estimate\/items\/([^/]+)$/
const ESTIMATE_ITEM_DUPLICATE_ROUTE = /^\/api\/estimate\/items\/([^/]+)\/duplicate$/

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const { pathname, searchParams } = url

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
      if (!jobId) return send(res, 400, { error: 'jobId query param is required' })
      return send(res, 200, listItems(jobId))
    }

    if (pathname === '/api/schedule' && req.method === 'POST') {
      const body = await readBody(req)
      // start_date/end_date are NOT NULL columns (server/db.js) — validate
      // here so a missing value 400s cleanly instead of throwing past this
      // check into the generic 500 handler below.
      if (!body.jobId || !body.title || !body.start || !body.end) {
        return send(res, 400, { error: 'jobId, title, start, and end are required' })
      }
      return send(res, 201, createItem(body))
    }

    const idMatch = pathname.match(ID_ROUTE)
    if (idMatch && req.method === 'PUT') {
      const body = await readBody(req)
      const updated = updateItem(idMatch[1], body)
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    if (idMatch && req.method === 'DELETE') {
      const ok = deleteItem(idMatch[1])
      if (!ok) return send(res, 404, { error: 'not found' })
      return send(res, 204)
    }

    if (pathname === '/api/estimate' && req.method === 'GET') {
      const jobId = searchParams.get('jobId')
      if (!jobId) return send(res, 400, { error: 'jobId query param is required' })
      return send(res, 200, estimates.getEstimate(jobId))
    }

    if (pathname === '/api/estimate/groups' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.jobId || !body.name) return send(res, 400, { error: 'jobId and name are required' })
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
      if (!body.jobId || !body.name) return send(res, 400, { error: 'jobId and name are required' })
      return send(res, 201, estimates.createItem(body.jobId, body))
    }

    const itemDuplicateMatch = pathname.match(ESTIMATE_ITEM_DUPLICATE_ROUTE)
    if (itemDuplicateMatch && req.method === 'POST') {
      const duplicated = estimates.duplicateItem(itemDuplicateMatch[1])
      if (!duplicated) return send(res, 404, { error: 'not found' })
      return send(res, 201, duplicated)
    }

    const itemIdMatch = pathname.match(ESTIMATE_ITEM_ROUTE)
    if (itemIdMatch && req.method === 'PUT') {
      const body = await readBody(req)
      const updated = estimates.updateItem(itemIdMatch[1], body)
      if (!updated) return send(res, 404, { error: 'not found' })
      return send(res, 200, updated)
    }

    if (itemIdMatch && req.method === 'DELETE') {
      const ok = estimates.deleteItem(itemIdMatch[1])
      if (!ok) return send(res, 404, { error: 'not found' })
      return send(res, 204)
    }

    send(res, 404, { error: 'not found' })
  } catch (err) {
    console.error(err)
    send(res, 500, { error: 'internal server error' })
  }
})

ensureSeeded()
server.listen(PORT, () => {
  console.log(`Schedule API listening on http://localhost:${PORT}`)
})
