import { useState } from 'react'
import Modal from './Modal'

// Cost Type options weren't scrolled to their full list during capture (see
// CAPTURE_LOG.md) — "None" is the only confirmed real value, the rest are
// reasonable construction cost categories, flagged as invented.
const COST_TYPES = ['None', 'Labor', 'Material', 'Sub', 'Equipment', 'Other']

// Cost codes used across the seeded estimates (src/data/estimates.js) plus
// the one real value observed live ("00 Preconstruction Services"). Not a
// captured full catalog — the real "Add"/"Edit" links next to this field
// imply a per-company configurable cost code list, which this prototype
// doesn't model.
const COST_CODES = [
  '00 Preconstruction Services',
  '01 General Conditions',
  '02 Site Work',
  '03 Concrete',
  '06 Wood & Plastics',
  '07 Thermal & Moisture Protection',
  '08 Doors & Windows',
  '09 Finishes',
  '10 Specialties',
  '11 Equipment',
  '12 Furnishings',
  '22 Plumbing',
  '23 HVAC',
  '26 Electrical',
  '32 Exterior Improvements',
]

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// markup% and margin% both describe the same spread between unit cost and
// unit price, just relative to a different base (cost vs. price) — they
// convert directly into each other with no other inputs:
//   margin = markup / (100 + markup); markup = margin / (100 - margin)
function markupToMargin(markupPercent) {
  const m = Number(markupPercent) || 0
  return round2((m / (100 + m)) * 100)
}
function marginToMarkup(marginPercent) {
  const m = Math.min(Number(marginPercent) || 0, 99.99)
  return round2((m / (100 - m)) * 100)
}

function computePreview(form) {
  const quantity = Number(form.quantity) || 0
  const unitCost = Number(form.unitCost) || 0
  const markupPercent = Number(form.markupPercent) || 0
  const builderCost = quantity * unitCost
  const unitPrice = unitCost * (1 + markupPercent / 100)
  const clientPrice = quantity * unitPrice
  return { builderCost: round2(builderCost), clientPrice: round2(clientPrice) }
}

// Field layout, section grouping ("Estimated cost details" / "Cost
// information"), and labels are matched to a screenshot of the real
// "Estimated cost" modal (opened from a line item in /app/Estimate) that
// the user shared directly, replacing this prototype's earlier
// invented modal layout — see CAPTURE_LOG.md.
//
// "Include item in catalog" and "Mark as bid" are visual-only stubs (local
// state, never sent to the backend) — there's no cost-item catalog or bid
// package feature in this prototype (bid packages are explicitly out of
// scope elsewhere too). The Cost Code field's "Add"/"Edit" links and the
// Markup field's unit toggle ("% ▾", real product likely also supports a
// flat $ markup) are similarly non-functional, matching the same
// "structure observed, behavior out of scope" treatment used throughout
// this app.
export default function EstimateItemModal({ item, groups, defaultGroupId, onSave, onDelete, onDuplicate, onClose }) {
  const isEditing = Boolean(item?.id)
  const [form, setForm] = useState(() => ({
    groupId: item?.groupId ?? defaultGroupId ?? (groups[0]?.id ?? 'unassigned'),
    name: item?.name ?? '',
    includeInCatalog: false,
    costCode: item?.costCode ?? '',
    description: item?.description ?? '',
    internalNotes: item?.internalNotes ?? '',
    costType: item?.costType ?? 'None',
    markAsBid: false,
    unitCost: item?.unitCost ?? 0,
    unit: item?.unit ?? '',
    markupPercent: item?.markupPercent ?? 0,
    quantity: item?.quantity ?? 1,
    taxable: item?.taxable ?? false,
  }))
  const [showRequired, setShowRequired] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const preview = computePreview(form)
  const margin = markupToMargin(form.markupPercent)
  const costCodeOptions = form.costCode && !COST_CODES.includes(form.costCode) ? [form.costCode, ...COST_CODES] : COST_CODES

  const handleSave = () => {
    if (!form.name.trim() || !form.costCode) {
      setShowRequired(true)
      return
    }
    onSave({
      ...form,
      id: item?.id,
      quantity: Number(form.quantity) || 0,
      unitCost: Number(form.unitCost) || 0,
      markupPercent: Number(form.markupPercent) || 0,
    })
  }

  const sectionHeader = (label) => (
    <div className="-mx-5 mb-4 bg-gray-5 px-5 py-2 text-sm font-semibold text-gray-90">{label}</div>
  )

  return (
    <Modal
      title="Estimated cost"
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          {isEditing ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-40 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                  <button
                    onClick={() => { setMenuOpen(false); onDuplicate(item) }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-gray-80 hover:bg-gray-5"
                  >
                    Duplicate line item
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmingDelete(true) }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-danger-fg hover:bg-gray-5"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70">
              Cancel
            </button>
            <div className="flex overflow-hidden rounded-sm bg-brand-blue text-white">
              <button onClick={handleSave} className="px-3 py-1.5 text-sm font-semibold">Save</button>
              <button onClick={handleSave} className="border-l border-white/30 px-2 py-1.5 text-sm" aria-label="Save options">▾</button>
            </div>
          </div>
        </div>
      }
    >
      {confirmingDelete ? (
        <div className="py-4 text-center">
          <div className="text-sm font-medium text-gray-90">Delete "{item.name}"?</div>
          <div className="mt-1 text-sm text-gray-50">This can't be undone.</div>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => setConfirmingDelete(false)} className="rounded-sm border border-gray-20 px-3 py-1.5 text-sm text-gray-70">
              Cancel
            </button>
            <button
              onClick={() => onDelete(item)}
              className="rounded-sm bg-danger-fg px-3 py-1.5 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <>
          {sectionHeader('Estimated cost details')}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Title</label>
              <input
                value={form.name}
                onChange={(e) => { setField('name', e.target.value); setShowRequired(false) }}
                className={`w-full rounded-sm border px-2 py-1.5 text-sm ${showRequired && !form.name.trim() ? 'border-danger-fg' : 'border-gray-20'}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Parent group / subgroup</label>
              <select
                value={form.groupId}
                onChange={(e) => setField('groupId', e.target.value)}
                className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              >
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-80">
                <input type="checkbox" checked={form.includeInCatalog} onChange={(e) => setField('includeInCatalog', e.target.checked)} />
                Include item in catalog
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Cost type</label>
              <select
                value={form.costType}
                onChange={(e) => setField('costType', e.target.value)}
                className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              >
                {COST_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Cost code *</label>
              <select
                value={form.costCode}
                onChange={(e) => { setField('costCode', e.target.value); setShowRequired(false) }}
                className={`w-full rounded-sm border px-2 py-1.5 text-sm ${showRequired && !form.costCode ? 'border-danger-fg' : 'border-gray-20'}`}
              >
                <option value="" disabled>Select a cost code</option>
                {costCodeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="mt-1 flex gap-3 text-xs font-medium text-brand-blue">
                <button type="button" className="hover:underline">Add</button>
                <button type="button" className="hover:underline">Edit</button>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-80">
                <input type="checkbox" checked={form.markAsBid} onChange={(e) => setField('markAsBid', e.target.checked)} />
                Mark as bid
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={2}
                className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              />
            </div>
            <div />

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Internal notes</label>
              <textarea
                value={form.internalNotes}
                onChange={(e) => setField('internalNotes', e.target.value)}
                rows={2}
                className="w-full rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {sectionHeader('Cost information')}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Unit cost</label>
              <div className="relative w-40">
                <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-gray-50">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitCost}
                  onChange={(e) => setField('unitCost', e.target.value)}
                  className="w-full rounded-sm border border-gray-20 py-1.5 pl-5 pr-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                className="w-40 rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setField('unit', e.target.value)}
                placeholder="EA, SF, HR…"
                className="w-40 rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-gray-60">Builder cost</div>
              <div className="py-1.5 text-sm font-semibold text-gray-90">${preview.builderCost.toFixed(2)}</div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Markup</label>
              <div className="flex w-40 gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.markupPercent}
                  onChange={(e) => setField('markupPercent', e.target.value)}
                  className="w-0 flex-1 rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                />
                <span className="flex shrink-0 items-center gap-1 rounded-sm border border-gray-20 px-2 py-1.5 text-sm text-gray-70">% ▾</span>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-gray-60">Client price</div>
              <div className="py-1.5 text-sm font-semibold text-gray-90">${preview.clientPrice.toFixed(2)}</div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-60">Margin</label>
              <div className="flex w-40 items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="any"
                  value={margin}
                  onChange={(e) => setField('markupPercent', marginToMarkup(e.target.value))}
                  className="w-0 flex-1 rounded-sm border border-gray-20 px-2 py-1.5 text-sm"
                />
                <span className="shrink-0 text-sm text-gray-70">%</span>
              </div>
            </div>
            <div>
              <label className={`flex items-center gap-2 text-sm ${form.costType === 'None' ? 'text-gray-40' : 'text-gray-80'}`}>
                <input
                  type="checkbox"
                  checked={form.taxable}
                  disabled={form.costType === 'None'}
                  onChange={(e) => setField('taxable', e.target.checked)}
                />
                Taxable
              </label>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
