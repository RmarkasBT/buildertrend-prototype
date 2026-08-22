#!/usr/bin/env node
// MCP server exposing the job-site weather service (server/weather.js) as
// callable tools, so agents outside this app — Claude Code, the ADK agent in
// agent/, or any other MCP client — can ask for the conditions behind a
// daily log instead of re-deriving them.
//
// Runs over stdio. Register it with:
//   claude mcp add buildertrend-weather -- node <repo>/server/mcp.js
// or via the .mcp.json checked in at the repo root.
//
// Reads nothing from the database and holds no state: weather is a pure
// function of (jobId, date), which is what makes it safe to expose.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { weatherFor } from './weather.js'
import { jobs } from '../src/data/jobs.js'
import { requireJob } from './jobs.js'

const server = new McpServer({ name: 'buildertrend-weather', version: '1.0.0' })

const ISO_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD form')

const JOB_ID = z
  .string()
  .describe("Job id, e.g. 'j1'. Call list_jobs to see the valid ids and their names.")

// Returned alongside the structured payload: MCP clients that only surface
// text content still show something readable, and the ones that read
// structuredContent get the machine-usable object.
const asResult = (data, text) => ({
  content: [{ type: 'text', text: text ?? JSON.stringify(data, null, 2) }],
  structuredContent: data,
})

const summarise = (jobName, date, w) =>
  `${jobName} — ${date}: ${w.summary}, high ${w.high}°F / low ${w.low}°F, ` +
  `wind ${w.wind} mph, humidity ${w.humidity}%, precipitation ${w.precipitation}"`

// requireJob lives in server/jobs.js so this server and the HTTP API can't
// drift on what counts as a valid job — they used to have separate copies,
// and only this one actually checked.

server.registerTool(
  'list_jobs',
  {
    title: 'List jobs',
    description:
      'List the job sites weather can be reported for, with their ids, names and addresses. ' +
      'Call this first to turn a job name into the jobId the weather tools expect.',
    inputSchema: {},
  },
  async () => {
    const data = jobs.map((j) => ({ jobId: j.id, name: j.name, address: j.address }))
    return asResult(
      { jobs: data },
      data.map((j) => `${j.jobId}  ${j.name} — ${j.address}`).join('\n'),
    )
  },
)

server.registerTool(
  'get_jobsite_weather',
  {
    title: 'Get job-site weather',
    description:
      'Weather conditions at a job site on a given day — the same reading a Buildertrend daily log ' +
      'records when "Include Weather Conditions" is checked. Returns the conditions summary, high and ' +
      'low temperature in °F, wind speed in mph, relative humidity, and total precipitation in inches.',
    inputSchema: {
      jobId: JOB_ID,
      date: ISO_DATE.describe('The day to report on, YYYY-MM-DD.'),
    },
  },
  async ({ jobId, date }) => {
    const job = requireJob(jobId)
    const weather = weatherFor(jobId, date)
    return asResult({ jobId, jobName: job.name, date, weather }, summarise(job.name, date, weather))
  },
)

server.registerTool(
  'get_jobsite_weather_range',
  {
    title: 'Get job-site weather over a date range',
    description:
      'Weather conditions at a job site for every day in an inclusive date range. Use this to spot ' +
      'weather days across a stretch of schedule work rather than calling get_jobsite_weather per day.',
    inputSchema: {
      jobId: JOB_ID,
      startDate: ISO_DATE.describe('First day of the range, YYYY-MM-DD (inclusive).'),
      endDate: ISO_DATE.describe('Last day of the range, YYYY-MM-DD (inclusive).'),
    },
  },
  async ({ jobId, startDate, endDate }) => {
    const job = requireJob(jobId)
    if (endDate < startDate) throw new Error('endDate must not be before startDate')

    // Capped so a typo like 1926-01-01 can't spin out tens of thousands of
    // days — a year of readings is far more than any caller needs at once.
    const MAX_DAYS = 366
    const days = []
    // Parsed as UTC and stepped in UTC: these are calendar dates, not
    // instants, so a local-time cursor would skip or repeat a day across a
    // daylight-saving boundary.
    const cursor = new Date(`${startDate}T00:00:00Z`)
    const last = new Date(`${endDate}T00:00:00Z`)
    while (cursor <= last) {
      if (days.length >= MAX_DAYS) throw new Error(`Range too large — request at most ${MAX_DAYS} days.`)
      const date = cursor.toISOString().slice(0, 10)
      days.push({ date, weather: weatherFor(jobId, date) })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return asResult(
      { jobId, jobName: job.name, startDate, endDate, days },
      days.map((d) => summarise(job.name, d.date, d.weather)).join('\n'),
    )
  },
)

await server.connect(new StdioServerTransport())
