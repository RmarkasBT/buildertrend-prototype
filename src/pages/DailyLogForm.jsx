import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import { useDailyLogSettings } from '../hooks/useDailyLogs'
import * as dailyLogApi from '../api/dailyLogApi'
import { WeatherBlock } from '../components/DailyLogWeather'
import { longDate, todayIso } from '../lib/dailyLogFormat'
import { IconArrowLeft, IconComment, IconPlus, IconX, IconInfoCircle, IconPaperclip, IconTrash } from '../components/icons'

// Add / edit a daily log. Field order and wording follow the live
// /app/DailyLogAdd page: title (max 50) + Draft chip, a two-column body with
// Job / Date / Tags on the left and Attachments / Notes (max 4000) on the
// right, then Permissions > Share, Notify users, and the Weather block.
// The header carries Cancel and Publish, exactly as live.
const TITLE_MAX = 50
const NOTES_MAX = 4000

const field =
  'w-full rounded-sm border border-gray-20 bg-white px-2.5 py-1.5 text-sm text-gray-90 outline-none focus:border-brand-blue'

const SHARE_OPTIONS = [
  ['shareInternal', 'Internal Users'],
  ['shareSubs', 'Subs/Vendors'],
  ['shareClient', 'Client'],
  ['isPrivate', 'Private'],
]

export default function DailyLogForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { currentJob, jobs, setCurrentJobId } = useJob()
  const { settings } = useDailyLogSettings()
  const navigate = useNavigate()

  const [form, setForm] = useState(null)
  const [tagDraft, setTagDraft] = useState('')
  const [notifyDraft, setNotifyDraft] = useState('')
  const [weather, setWeather] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Edit loads the existing log. Keyed on `id` alone: settings and
  // currentJob arrive asynchronously, and including them here would re-run
  // the fetch mid-edit and silently discard the user's unsaved changes.
  useEffect(() => {
    if (!isEdit) return
    dailyLogApi.getLog(id).then((log) => { setForm(log); setWeather(log.weather) }).catch((e) => setError(e.message))
  }, [id, isEdit])

  // Add seeds Notes, the weather toggles and the share checkboxes from
  // company settings — what makes a new log open pre-filled with the
  // "Progress: / Issues: / Materials Delivered:" template on the live form.
  // Guarded on `form` so a later settings refresh can't wipe a part-typed
  // log back to the template.
  useEffect(() => {
    if (isEdit || form || !settings || !currentJob) return
    setForm({
      jobId: currentJob.id,
      title: '',
      date: todayIso(),
      notes: settings.defaultNotes,
      tags: [],
      shareInternal: true,
      shareSubs: settings.share.subs,
      shareClient: settings.share.client,
      isPrivate: false,
      notifyUsers: [],
      includeWeather: settings.defaultIncludeWeather,
      includeWeatherNotes: settings.defaultIncludeWeatherNotes,
      weatherNotes: '',
      photos: [],
      status: 'published',
    })
  }, [isEdit, form, settings, currentJob])

  // The live form shows the forecast for the chosen day as soon as the date
  // changes, before the log is ever saved — so preview from the same
  // endpoint the server snapshots from on save.
  const formJobId = form?.jobId
  const formDate = form?.date
  const wantsWeather = form?.includeWeather
  useEffect(() => {
    if (!wantsWeather || !formJobId || !formDate) return
    dailyLogApi.getWeather(formJobId, formDate).then(setWeather).catch(() => setWeather(null))
  }, [wantsWeather, formJobId, formDate])

  if (error) return <div className="px-6 py-6 text-sm text-danger-fg">Couldn't load this daily log: {error}</div>
  if (!form) return <div className="px-6 py-6 text-sm text-gray-50">Loading…</div>

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Private is exclusive: ticking it clears the three audiences, and ticking
  // any audience clears Private — matching the live form's behaviour.
  const setShare = (key, checked) => {
    if (key === 'isPrivate') {
      setForm((f) => ({
        ...f,
        isPrivate: checked,
        ...(checked ? { shareInternal: false, shareSubs: false, shareClient: false } : { shareInternal: true }),
      }))
      return
    }
    setForm((f) => ({ ...f, [key]: checked, ...(checked ? { isPrivate: false } : {}) }))
  }

  const addTag = () => {
    const tag = tagDraft.trim()
    if (!tag || form.tags.includes(tag)) return setTagDraft('')
    set('tags', [...form.tags, tag])
    setTagDraft('')
  }

  const addNotifyUser = () => {
    const user = notifyDraft.trim()
    if (!user || form.notifyUsers.includes(user)) return setNotifyDraft('')
    set('notifyUsers', [...form.notifyUsers, user])
    setNotifyDraft('')
  }

  const submit = (status) => {
    setSaving(true)
    setError(null)
    const payload = { ...form, status }
    const request = isEdit ? dailyLogApi.updateLog(id, payload) : dailyLogApi.createLog(form.jobId, payload)
    request
      .then((saved) => {
        // Creating a log against another job would otherwise land the user on
        // a list still scoped to the job they started from.
        if (saved.jobId !== currentJob.id) setCurrentJobId(saved.jobId)
        navigate(`/daily-logs/${saved.id}`)
      })
      .catch((e) => { setError(e.message); setSaving(false) })
  }

  const remove = () => {
    if (!window.confirm('Delete this daily log? This cannot be undone.')) return
    dailyLogApi.deleteLog(id).then(() => navigate('/daily-logs')).catch((e) => setError(e.message))
  }

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-15 bg-white px-6 py-3">
        <Link to="/daily-logs" className="rounded-sm p-1.5 text-gray-60 hover:bg-gray-10" aria-label="Back to Daily Logs">
          <IconArrowLeft />
        </Link>
        <div className="flex items-center gap-2">
          {isEdit && (
            <button onClick={remove} className="rounded-sm p-1.5 text-gray-50 hover:bg-danger-bg hover:text-danger-fg" title="Delete">
              <IconTrash />
            </button>
          )}
          <button className="rounded-sm p-1.5 text-gray-50 hover:bg-gray-10" title="Comments"><IconComment /></button>
          <button
            onClick={() => navigate(isEdit ? `/daily-logs/${id}` : '/daily-logs')}
            className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-80 hover:bg-gray-5"
          >
            Cancel
          </button>
          <button
            onClick={() => submit(form.status === 'draft' && isEdit ? 'draft' : 'published')}
            disabled={saving}
            className="rounded-sm bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-info-fg disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pt-4">
        <nav className="flex gap-1.5 text-xs text-brand-blue">
          <span className="text-gray-60">{currentJob?.name}</span>
          <span className="text-gray-40">/</span>
          <Link to="/daily-logs" className="hover:underline">Daily Logs</Link>
        </nav>

        <input
          value={form.title}
          maxLength={TITLE_MAX}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Add Daily Log title"
          aria-label="Daily Log title"
          className="mt-2 w-full rounded-sm border border-gray-15 px-3 py-2 text-2xl font-medium text-gray-90 placeholder-gray-40 outline-none focus:border-brand-blue"
        />
        <div className="mt-1 text-xs text-gray-50">Maximum {TITLE_MAX} characters</div>
        {form.status === 'draft' && (
          <span className="mt-2 inline-block rounded-xs bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-fg">
            Draft
          </span>
        )}

        <div className="mt-5 grid gap-8 md:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label htmlFor="log-job" className="mb-1 block text-sm font-semibold text-gray-90">Job</label>
              <select
                id="log-job"
                className={field}
                value={form.jobId}
                disabled={isEdit}
                onChange={(e) => set('jobId', e.target.value)}
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
              {isEdit && <p className="mt-1 text-xs text-gray-50">A log can't be moved to another job after it's created.</p>}
            </div>

            <div>
              <label htmlFor="log-date" className="mb-1 block text-sm font-semibold text-gray-90">
                Date <span className="text-brand-coral">*</span>
              </label>
              <input id="log-date" type="date" className={field} value={form.date} onChange={(e) => set('date', e.target.value)} />
              <p className="mt-1 text-xs text-gray-50">{longDate(form.date)}</p>
            </div>

            <div>
              <span className="mb-1 block text-sm font-semibold text-gray-90">Tags</span>
              <div className="flex gap-2">
                <input
                  className={field}
                  value={tagDraft}
                  aria-label="Add a tag"
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                />
                <button
                  onClick={addTag}
                  aria-label="Add tag"
                  className="rounded-sm border border-gray-20 px-2 text-gray-60 hover:bg-gray-5"
                >
                  <IconPlus className="h-4 w-4" />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-info-bg px-2.5 py-1 text-xs text-info-fg">
                      {tag}
                      <button
                        onClick={() => set('tags', form.tags.filter((t) => t !== tag))}
                        aria-label={`Remove tag ${tag}`}
                        className="hover:text-danger-fg"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-90">Attachments</h2>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-80 hover:bg-gray-5">
                  <IconPaperclip className="h-4 w-4" />
                  Add
                </button>
                <button className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-80 hover:bg-gray-5">
                  Create new doc
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="log-notes" className="mb-2 block text-sm font-semibold text-gray-90">Notes</label>
              <textarea
                id="log-notes"
                rows={10}
                maxLength={NOTES_MAX}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="w-full rounded-sm border border-gray-20 bg-white px-3 py-2 text-sm text-gray-90 outline-none focus:border-brand-blue"
              />
              <div className="mt-1 text-xs text-gray-50">
                Maximum {NOTES_MAX} characters ({NOTES_MAX - form.notes.length} remaining)
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-gray-90">Permissions</h2>
          <div className="mt-2 text-xs font-medium text-gray-70">Share</div>
          <div className="mt-1.5 space-y-1.5">
            {SHARE_OPTIONS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-80">
                {/* Unlike the settings modal's grid, the live add form lets
                    Internal Users be unticked — it's just checked by default. */}
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-blue"
                  checked={form[key]}
                  onChange={(e) => setShare(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="flex items-center gap-1 text-sm font-semibold text-gray-90">
            Notify users
            <IconInfoCircle className="h-3.5 w-3.5 text-gray-40" />
          </h2>
          <div className="mt-1.5 flex max-w-md gap-2">
            <input
              className={field}
              value={notifyDraft}
              aria-label="Notify user"
              placeholder="Add a name"
              onChange={(e) => setNotifyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNotifyUser() } }}
            />
            <button
              onClick={addNotifyUser}
              aria-label="Add user to notify"
              className="rounded-sm border border-gray-20 px-2 text-gray-60 hover:bg-gray-5"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
          {form.notifyUsers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.notifyUsers.map((user) => (
                <span key={user} className="flex items-center gap-1 rounded-full bg-gray-10 px-2.5 py-1 text-xs text-gray-80">
                  {user}
                  <button
                    onClick={() => set('notifyUsers', form.notifyUsers.filter((u) => u !== user))}
                    aria-label={`Remove ${user}`}
                    className="hover:text-danger-fg"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-90">Weather</h2>
          <label className="mt-1.5 flex items-center gap-2 text-sm text-gray-80">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-blue"
              checked={form.includeWeather}
              onChange={(e) => set('includeWeather', e.target.checked)}
            />
            Include Weather Conditions
          </label>

          {form.includeWeather && weather && (
            <div className="mt-3 max-w-lg">
              <WeatherBlock
                weather={weather}
                capturedLabel={new Date(weather.capturedAt).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              />
            </div>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-80">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-blue"
              checked={form.includeWeatherNotes}
              onChange={(e) => set('includeWeatherNotes', e.target.checked)}
            />
            Include Weather Notes
          </label>
          {form.includeWeatherNotes && (
            <textarea
              rows={3}
              aria-label="Weather notes"
              value={form.weatherNotes}
              onChange={(e) => set('weatherNotes', e.target.value)}
              placeholder="e.g. Crew broke early — heat index over 105°F by 2pm."
              className="mt-2 w-full max-w-lg rounded-sm border border-gray-20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          )}
        </section>

        {error && <p className="mt-6 text-sm text-danger-fg">Couldn't save: {error}</p>}
      </div>
    </div>
  )
}
