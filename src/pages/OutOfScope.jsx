// Real nav item, not yet captured/built — out of this recreation's scope
// (PM: Schedule/Daily Logs; Financial: Job Costing Budget/Invoices/Purchase
// Orders + the shell around them). Placeholder only, not a fabricated screen.
export default function OutOfScope({ label }) {
  return (
    <div className="p-8 text-center">
      <div className="text-sm font-semibold uppercase text-gray-40">Not built yet</div>
      <h1 className="mt-1 text-xl font-bold text-gray-90">{label}</h1>
      <p className="mt-2 text-sm text-gray-50">
        This nav item exists in the real product but is outside this recreation's scope
        (Project Management dashboard/schedule/daily logs + Financial budget/invoices/POs).
      </p>
    </div>
  )
}
