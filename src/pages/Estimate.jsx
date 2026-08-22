import { useMemo, useState } from 'react'
import { useJob } from '../context/JobContext'
import { useEstimate } from '../hooks/useEstimate'
import EstimateItemModal from '../components/EstimateItemModal'

const money = (n) => `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n) => `${((n ?? 0) * 100).toFixed(2)}%`

// Header (Builder cost + Profit % + Tax = Total price), toolbar (All
// Proposals/Collapse all/search, Export/Lock estimate/Send to budget/+
// Proposal), Add Group, per-group rows with +Item/+Allowance and totals,
// and the line-item column set (Items+cost code/Description/Quantity/Unit/
// Unit cost/Cost type/Builder Cost/Markup/Unit Price/Client Price/Margin/
// Profit/Tax) are copied from the live /app/Estimate worksheet (job "Test")
// — see CAPTURE_LOG.md. The far-right vertical icon toolbar (settings/
// filter/etc.) seen there is intentionally left out per this recreation's
// scope. Editing a line item here opens a modal (EstimateItemModal) instead
// of the real grid's inline cell editing — a deliberate simplification, not
// an observed screen. All Proposals/Export/Lock estimate/Send to budget/
// Proposal are static, non-functional buttons, matching the same
// "structure observed, behavior out of scope" treatment as other toolbar
// buttons elsewhere in this app (e.g. Purchase Orders' help/share icons).
export default function Estimate() {
  const { currentJob } = useJob()
  const { groups, totals, loading, error, addGroup, removeGroup, saveItem, removeItem, duplicateItem } = useEstimate(currentJob?.id)
  const [collapsed, setCollapsed] = useState(new Set())
  const [query, setQuery] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [modalState, setModalState] = useState(null) // { item, defaultGroupId } | null

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.id))
  const toggleCollapseAll = () => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.id)))
  const toggleGroup = (id) => setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const q = query.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!q) return groups
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => `${it.name} ${it.costCode} ${it.description}`.toLowerCase().includes(q)) }))
      .filter((g) => g.name.toLowerCase().includes(q) || g.items.length > 0)
  }, [groups, q])

  const openNewItem = (groupId) => setModalState({ item: null, defaultGroupId: groupId })
  const openEditItem = (item) => setModalState({ item, defaultGroupId: item.groupId })
  const closeModal = () => setModalState(null)

  const handleSave = (form) => { saveItem(form); closeModal() }
  const handleDelete = (item) => { removeItem(item); closeModal() }
  const handleDuplicate = (item) => { duplicateItem(item); closeModal() }

  const submitGroup = () => {
    if (groupName.trim()) addGroup(groupName.trim())
    setGroupName('')
    setAddingGroup(false)
  }

  if (!currentJob) return null

  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-50">{currentJob.name}</div>
          <h1 className="text-xl font-bold text-gray-90">Estimate</h1>
        </div>
        {totals && (
          <div className="flex items-center gap-1.5 text-sm text-gray-70">
            <div className="text-center">
              <div className="text-[11px] text-gray-50">Builder cost</div>
              <div className="font-semibold text-gray-90">{money(totals.builderCost)}</div>
            </div>
            <span className="mx-1 text-gray-40">+</span>
            <div className="text-center">
              <div className="text-[11px] text-gray-50">Profit ({pct(totals.margin)})</div>
              <div className="font-semibold text-gray-90">{money(totals.profit)}</div>
            </div>
            <span className="mx-1 text-gray-40">+</span>
            <div className="text-center">
              <div className="text-[11px] text-gray-50">Tax</div>
              <div className="font-semibold text-gray-90">{money(totals.tax)}</div>
            </div>
            <span className="mx-1 text-gray-40">=</span>
            <div className="text-center">
              <div className="text-[11px] text-gray-50">Total price</div>
              <div className="font-semibold text-gray-90">{money(totals.totalPrice)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button className="flex items-center gap-1 rounded-sm border border-gray-20 px-2 py-1 text-gray-60" title="Not built yet">
            All Proposals ▾
          </button>
          <button onClick={toggleCollapseAll} className="rounded-sm border border-gray-20 px-2 py-1 text-gray-70">
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to line items or groups…"
            className="w-64 rounded-sm border border-gray-20 px-2 py-1 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-sm border border-gray-20 px-2 py-1 text-gray-60" title="Not built yet">Export</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1 text-gray-60" title="Not built yet">Lock estimate</button>
          <button className="rounded-sm border border-gray-20 px-2 py-1 text-gray-60" title="Not built yet">Send to budget</button>
          <button onClick={() => openNewItem(groups[0]?.id)} className="rounded-sm bg-brand-blue px-3 py-1 font-semibold text-white">
            + New Item
          </button>
        </div>
      </div>

      {loading && <div className="mt-3 text-sm text-gray-50">Loading estimate…</div>}
      {error && (
        <div className="mt-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          Couldn't load the estimate: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-3 overflow-hidden rounded-md border border-gray-15 bg-white">
          <div className="mt-1 px-2 pt-2">
            <button
              onClick={() => setAddingGroup(true)}
              className="flex items-center gap-1 rounded-sm px-1 py-1 text-sm font-medium text-brand-blue"
            >
              <span className="text-lg leading-none">+</span> Add Group
            </button>
            {addingGroup && (
              <div className="mt-1 flex items-center gap-2 pb-2">
                <input
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitGroup(); if (e.key === 'Escape') setAddingGroup(false) }}
                  placeholder="Group name"
                  className="w-56 rounded-sm border border-gray-20 px-2 py-1 text-sm outline-none"
                />
                <button onClick={submitGroup} className="rounded-sm bg-brand-blue px-2 py-1 text-xs font-semibold text-white">Add</button>
                <button onClick={() => { setAddingGroup(false); setGroupName('') }} className="text-xs text-gray-50">Cancel</button>
              </div>
            )}
          </div>

          <table className="w-full text-left text-sm">
            <thead className="border-y border-gray-15 bg-gray-5 text-xs font-semibold text-gray-60">
              <tr>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Unit cost</th>
                <th className="px-3 py-2">Cost type</th>
                <th className="px-3 py-2">Builder Cost</th>
                <th className="px-3 py-2">Markup</th>
                <th className="px-3 py-2">Unit Price</th>
                <th className="px-3 py-2">Client Price</th>
                <th className="px-3 py-2">Margin</th>
                <th className="px-3 py-2">Profit</th>
                <th className="px-3 py-2">Tax</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr><td colSpan={14} className="px-3 py-8 text-center text-gray-50">No line items yet. Add a group and your first item to get started.</td></tr>
              ) : filteredGroups.map((group) => (
                <GroupRows
                  key={group.id}
                  group={group}
                  collapsedGroup={collapsed.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  onAddItem={() => openNewItem(group.id)}
                  onDeleteGroup={!group.virtual ? () => removeGroup(group.id) : null}
                  onEditItem={openEditItem}
                />
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="border-t-2 border-gray-20 font-semibold text-gray-90">
                  <td className="px-3 py-2" colSpan={6}>Totals</td>
                  <td className="px-3 py-2">{money(totals.builderCost)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">{money(totals.clientPrice)}</td>
                  <td className="px-3 py-2">{pct(totals.margin)}</td>
                  <td className="px-3 py-2">{money(totals.profit)}</td>
                  <td className="px-3 py-2" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {modalState && (
        <EstimateItemModal
          item={modalState.item}
          groups={groups}
          defaultGroupId={modalState.defaultGroupId}
          onSave={handleSave}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

function GroupRows({ group, collapsedGroup, onToggle, onAddItem, onDeleteGroup, onEditItem }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <tr className="border-t border-gray-15 bg-gray-5/60 font-semibold text-gray-90">
        <td className="px-3 py-2" colSpan={2}>
          <div className="flex items-center gap-1.5">
            <button onClick={onToggle} className="text-gray-50">{collapsedGroup ? '▸' : '▾'}</button>
            <span>{group.name}</span>
            <button onClick={onAddItem} className="ml-1 text-gray-50 hover:text-brand-blue" title="Add item">+</button>
            {onDeleteGroup && (
              <div className="relative ml-auto">
                <button onClick={() => setMenuOpen((o) => !o)} className="px-1 text-xs font-normal text-gray-40">⋯</button>
                {menuOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md bg-white py-1 text-xs font-normal shadow-lg ring-1 ring-black/5">
                    <button
                      onClick={() => { setMenuOpen(false); onDeleteGroup() }}
                      className="block w-full px-3 py-1.5 text-left text-danger-fg hover:bg-gray-5"
                    >
                      Delete group
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </td>
        <td className="px-3 py-2" colSpan={4} />
        <td className="px-3 py-2">{money(group.totals.builderCost)}</td>
        <td className="px-3 py-2" />
        <td className="px-3 py-2" />
        <td className="px-3 py-2">{money(group.totals.clientPrice)}</td>
        <td className="px-3 py-2">{pct(group.totals.margin)}</td>
        <td className="px-3 py-2">{money(group.totals.profit)}</td>
        <td className="px-3 py-2" colSpan={2} />
      </tr>
      {!collapsedGroup && group.items.map((it) => (
        <ItemRow key={it.id} item={it} onEdit={() => onEditItem(it)} />
      ))}
      {!collapsedGroup && group.items.length === 0 && (
        <tr className="border-t border-gray-15">
          <td colSpan={14} className="px-3 py-3 pl-9 text-gray-50">No items in this group yet.</td>
        </tr>
      )}
    </>
  )
}

function ItemRow({ item, onEdit }) {
  return (
    <tr className="cursor-pointer border-t border-gray-15 hover:bg-gray-5" onClick={onEdit}>
      <td className="px-3 py-2">
        <div className="font-medium text-brand-blue">{item.name}</div>
        {item.costCode && <div className="text-xs text-gray-50">{item.costCode}</div>}
      </td>
      <td className="px-3 py-2 text-gray-70">{item.description || '--'}</td>
      <td className="px-3 py-2">{item.quantity.toFixed(4)}</td>
      <td className="px-3 py-2">{item.unit || '--'}</td>
      <td className="px-3 py-2">{money(item.unitCost)}</td>
      <td className="px-3 py-2">{item.costType}</td>
      <td className="px-3 py-2">{money(item.builderCost)}</td>
      <td className="px-3 py-2">{item.markupPercent.toFixed(2)}%</td>
      <td className="px-3 py-2">{item.unitPrice.toFixed(4)}</td>
      <td className="px-3 py-2">{money(item.clientPrice)}</td>
      <td className="px-3 py-2">{pct(item.margin)}</td>
      <td className="px-3 py-2">{money(item.profit)}</td>
      <td className="px-3 py-2 text-gray-60">{item.taxable ? 'Taxable' : 'Non-taxable'}</td>
      <td className="px-3 py-2 text-gray-40">✎</td>
    </tr>
  )
}
