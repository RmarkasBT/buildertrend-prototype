// Request-body validation for the Estimate and Daily Log write paths.
//
// These check the BODY, not the post-merge result. That distinction matters:
// merge semantics mean a stored value flows through untouched on a partial
// edit, so validating the merged object would reject an unrelated edit because
// of pre-existing bad data — a duration error on a title-only change, with
// nothing the caller can do about it. Validating only what the caller actually
// sent rejects bad input without punishing anyone for history.
//
// Why this exists at all: every one of these used to be a silent coercion that
// returned 200 with the wrong value stored.
//
//   status: "archived"  -> stored "published"  (silently published a draft)
//   tags: "notalist"    -> stored as a string, so DailyLogCard's tags.map()
//                          threw and took the page down
//   quantity: "abc"     -> stored verbatim, and builderCost came back null
//   quantity: -5        -> negative money, no complaint
//
// Messages name the field and the offending value because ADK hands the
// response body back to the model with a retry instruction — that text is the
// agent's only chance to correct itself.

const typeName = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)

const show = (v) => {
  const s = JSON.stringify(v)
  return s === undefined ? String(v) : s.length > 40 ? `${s.slice(0, 40)}…` : s
}

// "got null" rather than "got null null" — for null/undefined the type name
// and the value render identically, so printing both just looks like a bug.
const got = (v) => (v === null || v === undefined ? String(v) : `${typeName(v)} ${show(v)}`)

function checkString(body, field) {
  if (typeof body[field] !== 'string') {
    return `${field} must be a string (got ${got(body[field])})`
  }
  return null
}

function checkBool(body, field) {
  if (typeof body[field] !== 'boolean') {
    return `${field} must be true or false (got ${got(body[field])})`
  }
  return null
}

function checkStringArray(body, field) {
  const v = body[field]
  if (!Array.isArray(v)) return `${field} must be an array (got ${got(v)})`
  const bad = v.findIndex((x) => typeof x !== 'string')
  if (bad !== -1) return `${field}[${bad}] must be a string (got ${got(v[bad])})`
  return null
}

function checkNumber(body, field, { min = null } = {}) {
  const v = body[field]
  // Deliberately strict: "12" is not accepted. A REAL column takes it happily
  // and it silently becomes a string in the response, which is how
  // builderCost started coming back null.
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return `${field} must be a finite number (got ${got(v)})`
  }
  if (min !== null && v < min) return `${field} must be >= ${min} (got ${v})`
  return null
}

function checkEnum(body, field, allowed) {
  if (!allowed.includes(body[field])) {
    return `${field} must be one of ${allowed.map((a) => JSON.stringify(a)).join(', ')} (got ${show(body[field])})`
  }
  return null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validate a daily-log create/update body. Returns a message, or null.
 *
 * `require` lists fields that must be present (create); on update every field
 * is optional and only the ones actually sent are checked.
 */
export function validateDailyLogBody(body, { require: required = [] } = {}) {
  for (const field of required) {
    if (body[field] === undefined) return `${field} is required`
  }

  if (body.date !== undefined) {
    if (typeof body.date !== 'string' || !ISO_DATE.test(body.date)) {
      return `date must be YYYY-MM-DD (got ${show(body.date)})`
    }
    // Catches 2026-02-31 and 2026-13-01, which the regex alone lets through.
    const [y, m, d] = body.date.split('-').map(Number)
    const parsed = new Date(Date.UTC(y, m - 1, d))
    if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
      return `date is not a real calendar date (got ${show(body.date)})`
    }
  }

  for (const field of ['title', 'notes', 'weatherNotes']) {
    if (body[field] !== undefined) {
      const err = checkString(body, field)
      if (err) return err
    }
  }

  if (body.title !== undefined && body.title.length > 50) {
    return `title must be at most 50 characters (got ${body.title.length})`
  }
  if (body.notes !== undefined && body.notes.length > 4000) {
    return `notes must be at most 4000 characters (got ${body.notes.length})`
  }

  for (const field of ['tags', 'notifyUsers']) {
    if (body[field] !== undefined) {
      const err = checkStringArray(body, field)
      if (err) return err
    }
  }

  if (body.photos !== undefined) {
    if (!Array.isArray(body.photos)) {
      return `photos must be an array (got ${got(body.photos)})`
    }
    const bad = body.photos.findIndex((p) => !p || typeof p !== 'object' || Array.isArray(p))
    if (bad !== -1) return `photos[${bad}] must be an object (got ${show(body.photos[bad])})`
  }

  for (const field of [
    'shareInternal', 'shareSubs', 'shareClient', 'isPrivate',
    'includeWeather', 'includeWeatherNotes',
  ]) {
    if (body[field] !== undefined) {
      const err = checkBool(body, field)
      if (err) return err
    }
  }

  if (body.status !== undefined) {
    // Was the worst of the silent coercions: anything other than "draft" fell
    // through to "published", so a bad value published a draft and answered 200.
    const err = checkEnum(body, 'status', ['draft', 'published'])
    if (err) return err
  }

  return null
}

/** Validate an estimate-item create/update body. Returns a message, or null. */
export function validateEstimateItemBody(body, { require: required = [] } = {}) {
  for (const field of required) {
    if (body[field] === undefined) return `${field} is required`
  }

  if (body.name !== undefined) {
    const err = checkString(body, 'name')
    if (err) return err
    if (!body.name.trim()) return 'name must not be blank'
  }

  for (const field of ['costCode', 'description', 'internalNotes', 'unit', 'costType', 'groupId']) {
    if (body[field] !== undefined) {
      const err = checkString(body, field)
      if (err) return err
    }
  }

  // Negative quantities and costs produced negative builderCost/clientPrice
  // without complaint. Zero stays legal — a placeholder line at 0 is normal.
  for (const [field, min] of [['quantity', 0], ['unitCost', 0], ['markupPercent', -100]]) {
    if (body[field] !== undefined) {
      const err = checkNumber(body, field, { min })
      if (err) return err
    }
  }

  if (body.taxable !== undefined) {
    const err = checkBool(body, 'taxable')
    if (err) return err
  }

  if (body.sortOrder !== undefined) {
    const err = checkNumber(body, 'sortOrder')
    if (err) return err
  }

  return null
}
