// Shared job-id validation.
//
// Jobs are static frontend fixtures (src/data/jobs.js), not database rows, so
// nothing about a job_id column can enforce that a request names a real job.
// Without a check, a typo'd jobId silently succeeds in two bad ways:
//
//   - `GET /api/daily-logs/weather?jobId=j99` returns a confident, fabricated
//     reading, because server/weather.js just hashes whatever string it gets.
//     An agent has no way to tell that from a real forecast and will report it
//     as fact.
//   - `POST /api/schedule` with a bad jobId returns 201 for a row no screen
//     will ever display, so an agent reports success for work that vanished.
//
// server/mcp.js had its own copy of this check; both callers now share this
// one so they can't drift.
import { jobs } from '../src/data/jobs.js'

export const KNOWN_JOB_IDS = jobs.map((j) => j.id)

/**
 * Returns the job, or throws with a message naming the valid ids.
 *
 * The message matters more than it looks: ADK hands a non-2xx response body
 * straight back to the model with a "retry with adjustments" instruction, so
 * listing the ids here is what lets an agent correct itself instead of
 * burning its three retries.
 */
export function requireJob(jobId) {
  const job = jobs.find((j) => j.id === jobId)
  if (!job) {
    throw new Error(`unknown jobId ${JSON.stringify(jobId)}. Known job ids: ${KNOWN_JOB_IDS.join(', ')}`)
  }
  return job
}

/**
 * HTTP-shaped variant: returns an error string, or null when the id is fine.
 * Also covers the missing-parameter case so callers get one check, not two.
 */
export function jobIdError(jobId) {
  if (!jobId) return 'jobId is required'
  if (!jobs.some((j) => j.id === jobId)) {
    return `unknown jobId ${JSON.stringify(jobId)}. Known job ids: ${KNOWN_JOB_IDS.join(', ')}`
  }
  return null
}
