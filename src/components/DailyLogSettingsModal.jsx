import { useState } from 'react'
import Modal from './Modal'
import { IconInfoCircle, IconPersonBox, IconWrench, IconHouse } from './icons'

// The gear-icon "Daily Logs" settings modal. Sections and controls match the
// live /app/DailyLogs/DailyLogSettings dialog: Daily Log Setup (Stamp
// Location + Default Daily Log Notes), Weather defaults, the Default Daily
// Log Share Settings share/notify grid, and the custom-fields empty state.
const AUDIENCES = [
  ['internal', 'Internal Users', IconPersonBox],
  ['subs', 'Subs/Vendors', IconWrench],
  ['client', 'Client', IconHouse],
]

function Check({ checked, onChange, disabled, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="h-4 w-4 accent-brand-blue disabled:opacity-40"
    />
  )
}

export default function DailyLogSettingsModal({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const setGrid = (group, key, value) => setDraft((d) => ({ ...d, [group]: { ...d[group], [key]: value } }))

  const save = () => {
    setSaving(true)
    Promise.resolve(onSave(draft)).finally(() => { setSaving(false); onClose() })
  }

  return (
    <Modal
      title="Daily Logs"
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <button
          onClick={save}
          disabled={saving}
          className="rounded-sm bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-info-fg disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <section className="rounded-md bg-gray-5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-90">Daily Log Setup</h3>
          <label className="flex items-center gap-2 text-sm text-gray-80">
            <Check checked={draft.stampLocation} onChange={(v) => set('stampLocation', v)} label="Stamp Location" />
            Stamp Location
            <IconInfoCircle className="h-3.5 w-3.5 text-gray-40" />
          </label>
          <label htmlFor="default-notes" className="mt-3 mb-1 block text-xs font-medium text-gray-70">
            Default Daily Log Notes
          </label>
          <textarea
            id="default-notes"
            rows={7}
            value={draft.defaultNotes}
            onChange={(e) => set('defaultNotes', e.target.value)}
            className="w-full rounded-sm border border-gray-20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
          />
        </section>

        <section className="rounded-md bg-gray-5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-90">Weather</h3>
          <label className="flex items-center gap-2 text-sm text-gray-80">
            <Check
              checked={draft.defaultIncludeWeather}
              onChange={(v) => set('defaultIncludeWeather', v)}
              label="Include Weather Conditions (Default)"
            />
            Include Weather Conditions (Default)
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-80">
            <Check
              checked={draft.defaultIncludeWeatherNotes}
              onChange={(v) => set('defaultIncludeWeatherNotes', v)}
              label="Include Weather Condition Notes (Default)"
            />
            Include Weather Condition Notes (Default)
          </label>
        </section>

        <section className="rounded-md bg-gray-5 p-4">
          <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-gray-90">
            Default Daily Log Share Settings
            <IconInfoCircle className="h-3.5 w-3.5 text-gray-40" />
          </h3>
          <table className="text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-60">
                <th className="w-44" />
                <th className="px-6 pb-1">Share</th>
                <th className="px-6 pb-1">Notify</th>
              </tr>
            </thead>
            <tbody>
              {AUDIENCES.map(([key, label, Icon]) => (
                <tr key={key} className="border-t border-gray-15">
                  <td className="flex items-center gap-2 py-2 text-gray-80">
                    <Icon className="h-4 w-4 text-gray-50" />
                    {label}
                  </td>
                  <td className="px-6 text-center">
                    {/* Internal Users is checked-and-disabled live: every log
                        is at minimum visible internally. */}
                    <Check
                      checked={key === 'internal' ? true : draft.share[key]}
                      disabled={key === 'internal'}
                      onChange={(v) => setGrid('share', key, v)}
                      label={`Share with ${label}`}
                    />
                  </td>
                  <td className="px-6 text-center">
                    <Check checked={draft.notify[key]} onChange={(v) => setGrid('notify', key, v)} label={`Notify ${label}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-md bg-gray-5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-90">Daily Logs custom fields</h3>
          <button className="rounded-sm border border-gray-20 bg-white px-3 py-1.5 text-sm text-gray-70 hover:bg-gray-5">
            Custom field
          </button>
          <div className="mt-3 rounded-sm border border-dashed border-gray-20 px-4 py-6 text-center">
            <div className="text-sm font-medium text-gray-80">No custom fields</div>
            <p className="mt-1 text-xs text-gray-50">
              Custom fields have not been added. Add data to your Daily Logs using custom fields.
            </p>
          </div>
        </section>
      </div>
    </Modal>
  )
}
