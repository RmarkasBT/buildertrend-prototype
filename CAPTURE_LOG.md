# Capture Log

What structural decisions in this recreation trace back to, screen by screen.
Session: live authenticated session at `buildertrend.net`, company "Villa Vista
Homes LLC", captured 2026-08-20. Dollar amounts, job names, addresses, people,
and dates throughout the app are invented — only structure/labels/fields below
are observed.

## Backend note: OpenAPI spec for agent tool-calling

`openapi/schedule-estimate.yaml` (OpenAPI 3.0.3) documents all 11 Schedule
and Estimate API operations, written for consumption by an agent
framework's OpenAPI-to-tool machinery (e.g. Google ADK's
`OpenAPIToolset`) — every operation has a unique `operationId`, and
descriptions call out real side effects and gaps (estimate group
auto-materialization, PUT-replaces-the-whole-row semantics, the synthetic
"unassigned" group's absent `createdAt`, etc.), not just field names.
No `security` scheme anywhere — confirmed local-only, no auth. Served live
at `GET http://localhost:4000/openapi.yaml` (re-read from disk on every
request, so editing the YAML doesn't need a server restart).

Enums in the spec (schedule `color`/`reminder`, estimate `costCode`/
`costType`) carry the same "observed vs. invented" flags already used
throughout this file — e.g. schedule `phase` is spec'd but explicitly
marked invented, matching its status elsewhere in this log.

One real bug fixed alongside the spec: `POST /api/schedule` previously
500'd (uncaught exception) if `start`/`end` were omitted, since those
DB columns are `NOT NULL` but the handler only validated `jobId`/`title`.
Now returns a clean `400` instead — `server/index.js`'s validation for
that route. `costCode` on estimate items was deliberately left
server-unenforced (UI-only convention, not a DB constraint) — the spec
marks it required to match the *intended* contract but says so in its
description rather than silently enforcing new behavior.

Validate the spec anytime with `npx @redocly/cli lint
openapi/schedule-estimate.yaml --skip-rule security-defined --skip-rule
info-license --skip-rule no-server-example.com` (those three skips are
expected/intentional for a local, unauthenticated dev spec).

## Backend note: Schedule now has a real SQLite database

Schedule items (only — jobs/clients/subs-vendors stay static frontend
fixtures) are now backed by a real database instead of in-memory React
state: `server/` (a plain `node:http` server + one `schedule_items` table),
with `src/api/scheduleApi.js` + `src/hooks/useSchedule.js` as the frontend's
data-access layer, used by both `Schedule.jsx` and `Dashboard.jsx` — which
also fixes a pre-existing bug where Dashboard's "This Week's Agenda" read a
separate static import that never reflected Schedule-page edits.

**Implementation note, not a product-capture note**: the original plan
called for `better-sqlite3`. On this machine, `better-sqlite3`'s native
binding segfaults on `new Database(...)` — reproduced with both the
downloaded prebuilt binary and a clean from-source `node-gyp rebuild`, so
it's a real native/ABI incompatibility in this environment, not a
config/signing issue. Switched to Node 22's built-in `node:sqlite`
(`--experimental-sqlite` flag, see `package.json`'s `dev:server`/`seed`
scripts) instead — zero native dependencies, same SQL/schema, only
`server/db.js`'s connection layer and the two `.transaction()` call sites
(replaced with manual `BEGIN`/`COMMIT`) differ from what was originally
planned.

Run `npm run dev` (starts both the API on :4000 and Vite on :5173 via
`concurrently`) — first run auto-seeds from `src/data/schedule.js`. Or
`npm run seed -- --reset` any time to wipe ad-hoc test data and restore the
pristine seed state.

## Source note on design system

The goal called for inspecting Blueprint in Figma directly. No Figma file URL
was provided and one wasn't guessed. Instead, the real Blueprint token values
were pulled from `@buildertrend/components`' compiled CSS
(`node_modules/@buildertrend/components/index.esm.css`, present locally in the
`~/workshop` repo) — the same tokens Figma Blueprint defines, sourced from the
shipped package rather than the design file. Colors, border radii, and font
family (Inter for body text) in `src/index.css` are copied verbatim from
`--bds-token-*` variables, not eyeballed from screenshots. **Gap:** GT
Walsheim Pro (Blueprint's display typeface, per the same CSS) is not loaded —
no license/asset available in this environment — so headings fall back to
Inter/system sans. This is the one typography deviation from source.

## Shell

- **Top nav** (Sales, Jobs, Project Management, Files, Messaging, Financial,
  Reports) — observed directly, including exact submenu items for Project
  Management, Messaging, and Financial (captured via accessibility-tree
  dump, which surfaced all mounted dropdown panels at once).
  - **Gap:** Sales, Jobs, and Files submenus never opened during capture
    (they may not have dropdowns, or the interaction to reveal them wasn't
    found). They render as plain links to placeholder pages rather than
    invented submenus.
- **Left sidebar / job switcher** (company name, current-job card with status
  badge + info/email/home icons, Jobs/Templates toggle, + Job button, search
  + filter + sort row, "ALL N OPEN JOBS" list) — observed directly.
- **Top-right icon cluster** (Quick add, Notifications, Chat, Users, Help,
  avatar) — observed directly; only Chat's destination route was confirmed
  (`/app/Chat`). Notifications/Users/Help/avatar are non-functional stubs
  here — their real panels were not opened.
- **Global search** — observed as present; its results/behavior were not
  explored (not implemented beyond a visual input).

## Dashboard (`/app/Landing`)

Observed directly on Haggans Lane Home Addition: job header (name, status
badge, address, clocked-in count, "View time sheets" link), Clients/Project
Managers add-cards, Past Due/Due Today/Action Items panel (captured in its
**empty state** — "Everything is taken care of. Go you!"), Recent Activity
feed with Filter control, right rail "Updates shared with clients this
month" + Client Updates/Daily Logs buttons, and "This Week's Agenda" list.

- **Gap:** a populated (non-zero) Past Due/Due Today/Action Items state was
  not found on any job checked — this recreation's populated variant (see
  Sundance Ridge in the mock data) is a plausible layout guess, not observed.

## Schedule (`/app/Schedules/0`)

Observed directly: Schedule/Baseline/Workday Exceptions tabs, "schedule is
offline" banner, Calendar/List/Gantt view toggle, toolbar (gear, undo,
"Schedule Offline" checkbox, More Actions, Filter, "+ New Schedule Item"),
month navigation, and the Calendar grid (weekday headers, milestone bars in
dark navy, phase bars in amber/orange, "+N more" overflow).

- **Gap:** only the Calendar view was actually opened. List and Gantt tabs
  exist in the real UI but their layouts were not captured — this
  recreation's List (plain sortable table) and Gantt (proportional bars) are
  reasonable inventions for those two, not observed screens.
- **Gap:** Baseline and Workday Exceptions tab contents were not opened.

## Daily Logs (`/app/DailyLogs`)

Observed **both** empty and populated states directly:
- Empty (Haggans Lane, no logs yet): notebook icon, "Track project progress
  with daily logs" heading, subtext, Learn How + Add a Daily Log buttons.
- Populated (a job with logs): entry card with job name, date link, author
  avatar + name, crew tag, photo thumbnail row with "+N" overflow tile and
  "View all (N)" button, likes/comments counts, weather high/low, and
  Notes / Issues / Materials Delivered sections. Pagination footer
  ("1-N of N items").
- Toolbar (help, settings, print, filter, "+ Daily Log") observed directly.

## Job Costing Budget (`/app/JobCostingBudget`)

Observed directly: "No Job selected" state when navigating without a job
picked; header stat row (Total revised price; Revised price − Projected cost
= Projected profit; "N% lower profit" / "N% profit margin" badges); grouped
two-tier column headers ("Cost categories" / "Job costing" / "Profit"); row
columns (Cost codes, Original budget, Revised budget, Pending costs,
Committed costs, Actual costs, Projected costs, Projection reference,
Cost to complete, Revised vs projected); group-total and grand-total rows;
"Standard view" footer selector.

- **Gap:** the "Projection reference" per-row dropdown (Current costs vs.
  Budgeted costs) is represented in the mock data model but rendered as
  plain text, not as an interactive dropdown, in this build.
- **Gap:** additional columns existed further right than what was
  scrolled/captured (the grid extended past the viewport); only the columns
  listed above were confirmed.

## Invoices (`/app/OwnerInvoices`)

Observed directly: Invoices/Payments/Credit memos/Deposits sub-tabs; header
stat row (Total revised price − Payments = Remaining balance); empty state
("No invoices yet", envelope icon, Learn How button); populated grid columns
(Job, Invoice ID, Title, Status, Total price, Total tax, Retainage, and at
least one more column further right that was cut off); totals row; toolbar
(help, share, filter, "+ Payment schedule", "+ Invoice" split button);
"Standard View" + item-count footer.

- Only **"Paid"** and **"Draft"** status values were directly observed. Other
  plausible statuses (Sent, Overdue, Partial) are **not** included in the
  mock data or the `Badge` component's style map, per the no-fabrication
  rule — only what was seen is represented.
- **Gap:** Payments, Credit memos, and Deposits tab bodies were not opened;
  they render as a plain "No … yet" placeholder here rather than invented
  layouts.

## Purchase Orders (`/app/PurchaseOrders`)

Observed directly: Purchase Orders/Bills sub-tabs; grid columns (Job, PO #,
Title, PO Status, Work Status, Performed By, Created Date, Actions);
sortable Created Date column (observed sorted descending by default); footer
("Standard View" selector, item count, page-size selector).

- Only **"Draft"** (PO Status) and **"Not Complete"** (Work Status) were
  directly observed — no job checked had a PO in any other status. Other
  values are not included, per the no-fabrication rule.
- **Gap:** the Bills tab body was not opened; renders as a placeholder here.

## Subs and clients' contacts (added after initial build)

Observed directly on the Job Info page (`/app/JobPage/{id}/1`, reached via the
job card's info icon → "View user" on a client avatar, and via the
Clients/Subs/vendors tabs):

- **Client contact hover card** (on the dashboard's Clients avatar): "Active"/
  "Inactive" badge, name, "Last active" date, email, and Send message / Call /
  Chat / View contact actions — implemented as `ContactChip.jsx`.
- **"Client contact" detail page**, opened via "View contact": banner ("This
  user maintains their contact information."), Contact Information (name,
  cell, primary email), Lead Opportunities ("No Lead Opportunities Found" in
  the observed case — no job in this mock has lead data, so it always reads
  that way here, which matches every job actually checked), and a Jobs table
  (Job Name/Street Address/City/State/Zip Code/Project Manager) listing every
  job that contact is attached to — implemented as `ContactModal.jsx`,
  computed live from the mock job list rather than hardcoded.
- **Job Info → Subs/vendors tab**: a plain list of company names with colored
  initials avatars — no contact detail (email/phone) was shown for subs in
  this session, unlike clients. `SubChip.jsx` intentionally renders name +
  avatar only, with no invented email/phone, to match that asymmetry.
- **Gap:** the real client-contact popover's "Last active" value is a genuine
  timestamp; per the goal's own rule that dates may be invented, each mock
  contact was given a fabricated `lastActive` date.
- **Gap:** Project Managers on the dashboard were left as plain text pills
  (unchanged) — no PM-specific contact card/popover was observed this
  session, so none was added, even though it would be a reasonable visual
  extension of the same avatar pattern used elsewhere in the app.
- **Gap:** the Job Info page itself (Job details/Clients/Internal users/
  Subs-vendors/Advanced settings tabs, and the "New sub/vendor" / "Reassign
  items" flows) was not built as a screen — only the contact-card and
  contact-modal fragments it revealed were extracted and reused in the
  Dashboard and Purchase Orders screens already in scope.
- Company names in `subsVendors.js` are fictional, not the real subcontractor
  names seen in the session.

## Subs/Vendors and Client Contacts directories, and nav dropdown icons

The Users icon in the top-right (previously a non-functional stub) was
checked live and opens a dropdown: Internal Users, Subs/Vendors, Client
Contacts. Built out:

- **Subs/Vendors directory** (`/app/Sub`, company-wide — no job sidebar):
  Company name, Sub/vendor divisions, Activation, Primary contact, Trade
  agreement status, Liability exp., Worker's comp exp., Cell, Phone columns,
  Export/Filter/Import/+Sub/vendor toolbar. Only "Ready for Invite", "No
  Email", and "Pending" activation values were observed; Trade agreement
  status and both expiration-date columns were blank on every row checked,
  so they stay blank rather than inventing sample values.
- **Sub/Vendor detail modal**, opened from a company name: Activation status
  row (Invite sub/vendor / Disable), Contact information fields (company
  name, division/trade, primary contact, business/cell phone, fax, email),
  and Additional information/Notifications/Job access/Trade agreement tabs
  with a Preferences checkbox group under "Additional information". The
  other three tabs' content was not opened, so they render a placeholder.
- **Client Contacts directory** (`/app/Contacts`, also company-wide):
  Display Name, Activation Status (Active/Inactive — confirms the values
  already used in the per-job contact card), Primary Phone, Cell Phone,
  Street Address, City, State, Zip Code, Jobs count. Implemented as a
  derived view over the per-job `clients` data rather than a separate
  master list, to avoid duplicating contact records.
- Both pages render full-width with no job sidebar, matching the real
  product — a deviation from every other screen in this app, which are all
  job-scoped.

**Nav dropdown icons**: every top-nav dropdown (Sales, Jobs, Project
Management, Files, Messaging, Financial) and the Users menu were reopened
live and each item's icon shape was inspected via zoomed screenshots, then
redrawn as simple stroke SVGs in `src/components/icons.jsx`. These are
close visual matches to the real icon concepts (calendar, document, wrench,
scale, etc.) — not pixel-perfect reproductions of the original icon asset
files, which weren't accessible outside the live app. Sales and Jobs, which
were earlier left as plain links (their submenus hadn't been opened), are
now real dropdowns with the observed items: Sales → Lead Opportunities/
Activities/Proposals/Activity Calendar/Map; Jobs → Summary/Job Info/Job
Price Summary/Jobs List/Jobs Map/New Job From Scratch/New Job From
Template. Files' submenu (Documents/Photos/Videos) was also captured and
added. All of these route to the `OutOfScope` placeholder except Summary
(→ the dashboard), since building them out is beyond this recreation's PM/
Financials scope.

## Schedule made fully functional (create/edit/delete)

The Schedule page was previously read-only/display-only against static mock
data. Went back to the live session's "+ New Schedule Item" button and an
existing item's edit view to capture the real create/edit form, then made
the mock page's Calendar/List/Gantt views actually create, edit, copy, and
delete items against React state (`Schedule.jsx`), via a new
`ScheduleItemModal.jsx` matching the real modal's layout.

Captured directly from the live "Schedule Item" modal:
- **Create form**: Title* (required, shows a red "Required" error), Display
  Color (named-color dropdown — see below), Assignees, Start Date*/Work
  Days*/End Date* (linked fields), Hourly toggle, Progress slider + % input,
  Reminder dropdown, and tabs Predecessors & Links / Phases & Tags / Viewing
  / Notes / Files.
- **Edit form** (opened from an existing item) adds: a "Complete" checkbox,
  two more tabs ("Shifts", "RFIs") plus a "Related Items" top-level tab, a
  "Created by {name} on {date}" audit line, and a "⋯" menu with **Copy**
  and **Delete** (Delete opens a "Delete "{title}"? This can't be undone."
  confirmation before actually removing it).
- **Display Color** named palette: Maroon, Merlot, Tuscan Red, Rose,
  Victoria, Brown, Coffee, Amber, Alarm Lime — confirmed by opening the
  dropdown; the list likely continues (oranges/greens/blues/purples never
  scrolled to). Victoria's hex (#c78888) was confirmed exactly from the job
  list's per-job color swatch; the other 8 names are close visual
  approximations, not exact extracted hex values.
- **Reminder** options confirmed before the list was cut off: None, 1 Hour
  Before, 2 Hours Before, 4 Hours Before, 8 Hours Before, 12 Hours Before,
  1 Day Before, 2 Days Before.
- **Viewing tab**: Show on Gantt / Show Client (Full schedule) checkboxes,
  plus removable chips for every sub/vendor with viewing access on the job
  — confirmed to be exactly the job's Subs/vendors tab list, so the mock
  reuses each job's `subIds` for this.

**What was simplified or omitted** (all flagged so they read as gaps, not
silent fabrication):
- **Predecessors & Links**, **Files**, **Shifts**, **RFIs**, and **Related
  Items** were all observed in the real modal but are not implemented —
  scheduling dependencies and file/shift/RFI linking were judged out of
  scope for this pass.
- **Notes** is a single free-text field here, instead of the real
  All Notes/Internal Notes/Sub Notes/Client Notes four-way split.
  **Phases & Tags**: the Phase list (Unassigned, Site Work, Foundation,
  Framing, MEP Rough-In, Finishes) is invented — the real dropdown's "Add"/
  "Edit" links imply it's configured per job, and no populated phase list
  was observed.
- **Work Days ↔ End Date** linkage uses plain calendar-day arithmetic. The
  real product likely respects each job's configured work week (the Job
  Info page's "Work days" field, e.g. Mon–Fri only) — not implemented here.
- The **Assignees** field and the picker/send-icon next to it are a plain
  text input — the real assignee-picker UI (likely an internal-user search)
  wasn't explored.
- Calendar bars are now colored by each item's actual `color` field (hex
  approximated per the palette above) instead of the earlier hardcoded
  milestone/phase two-color scheme — a more accurate model of the real
  product, where color is a per-item user choice, not a fixed category.

## Estimate made real and functional (`/app/Estimate`)

Estimate was previously an `OutOfScope` placeholder reached via the
Financial nav dropdown's "Estimate" item. Went to the live session (job
"Test") and captured the real worksheet, then built it out with a SQLite
backend (`estimate_groups`/`estimate_items` tables, `server/estimateRoutes.js`)
the same way Schedule was, plus a modal-based create/edit/duplicate/delete
flow — see `EstimateItemModal.jsx`.

Observed directly: header summary (Builder cost + Profit (margin %) + Tax =
Total price), toolbar (All Proposals, Collapse all, "Jump to line items or
groups…" search, Export, Lock estimate, Send to budget, + Proposal), "+ Add
Group", a group row (checkbox, expand/collapse chevron, name, "+" Item/
Allowance add menu, per-group Builder Cost/Client Price/Margin/Profit
totals), the line-item column set (Items name + a cost-code subtext like "00
Preconstruction Services" / Description / Quantity / Unit / Unit cost / Cost
type / Builder Cost / Markup / Unit Price / Client Price / Margin / Profit /
Tax), a Totals footer row, and the row "…" menu (Create bid package/Convert
to allowance/Create purchase order/Add to existing purchase order/Create
invoice/Replace line item/Duplicate line item/Delete). The financial formulas
were reverse-engineered from the one real sample row and confirmed exactly:
Builder Cost = qty × unit cost; Unit Price = unit cost × (1 + markup%);
Client Price = qty × Unit Price; Profit = Client Price − Builder Cost; Margin
= Profit / Client Price (this is also what the header's "Profit (N%)" is —
overall margin, not markup-on-cost).

**What was simplified, invented, or left out** (flagged per this file's own
rule, not silently fabricated):

- **Editing is modal-based here** (`EstimateItemModal.jsx`), not the real
  grid's inline cell editing (clicking a row's "…" turned its cells into
  editable inputs directly in place). A modal was built instead to get a
  reliably functional create/edit/duplicate/delete flow for this
  recreation — this is the one deliberate deviation from "structure
  observed," not an observed screen.
- The row "…" menu here only implements **Duplicate line item** and
  **Delete** (mirroring `ScheduleItemModal`'s pattern). Create bid
  package/Convert to allowance/Create purchase order/Add to existing
  purchase order/Create invoice/Replace line item were all observed live
  but aren't implemented — each ties into a separate out-of-scope feature
  (Bids, Cost Inbox, Invoices) or a real-catalog concept (a cost item
  library) this recreation doesn't model.
- **Cost Type** options (`None`/`Labor`/`Material`/`Sub`/`Equipment`/
  `Other`) — only `None` was directly observed on the sample row; the rest
  are reasonable construction cost categories, not captured from an opened
  dropdown.
- **Tax**: a per-item Taxable/Non-taxable toggle is real and stored, but
  there's no job/company tax-rate concept in this prototype's scope, so the
  worksheet's Tax total is always $0.00 — consistent with the one real row
  observed (Non-taxable, Tax $0.00), not contradicted by it, but also not
  proof a nonzero rate wouldn't apply to a taxable item in the real product.
- **All Proposals / Export / Lock estimate / Send to budget / + Proposal**
  are static, non-functional buttons — same "structure observed, behavior
  out of scope" treatment already used for e.g. Purchase Orders' help/share
  icons.
- The real screen's **far-right vertical icon toolbar** (settings, filter,
  grid, sort, etc.) was intentionally left out entirely, per this pass's
  scope — not built even as a placeholder.
- **Groups**: the real worksheet always shows at least an "Unassigned"
  group. Rather than pre-creating one for every job, a job with zero real
  groups is shown a synthetic client-side "Unassigned" placeholder; the
  first "+ New Item"/"+ Add Group" action against it materializes a real
  `estimate_groups` row — this lazy creation is what "being able to create
  an estimate" means here, since the real product's separate blank-estimate
  creation step (if one exists) wasn't observed.
- Willow Creek Remodel and Sundance Ridge New Build are seeded with
  invented multi-group estimates (`src/data/estimates.js`); the other four
  jobs are left with no estimate, exercising the empty/first-item state.

## Estimate line-item modal matched to the real "Estimated cost" popup

The Estimate feature's original `EstimateItemModal.jsx` (see "Estimate made
real and functional" above) was an invented layout, built before the real
line-item popup had been found live. The user then shared a screenshot of
the actual "Estimated cost" modal (opened from a line item on job "Test" —
the same $100 unit cost / 25% markup / 20% margin / "00 Preconstruction
Services" row already captured earlier), so the modal was rebuilt to match
it field-for-field instead of guessing:

- Single title **"Estimated cost"** for both add and edit (not "New/Edit
  Line Item"), two gray-bar section headers ("Estimated cost details" /
  "Cost information") over a two-column field grid, `Modal.jsx` widened via
  a new `maxWidth` prop (`max-w-2xl`) just for this modal.
- **Estimated cost details**: Title / Parent group-subgroup (this
  prototype's Group selector, renamed to match); Include item in catalog /
  Cost type; Cost code * (now a dropdown with Add/Edit links) / Mark as
  bid; Description; Internal notes (new, persisted — `internal_notes`
  column added to `estimate_items` via an `ALTER TABLE` migration in
  `db.js`, since the table already existed in dev DBs).
- **Cost information**: Unit cost ($-prefixed) / Quantity; Unit / Builder
  cost (plain computed text, not a boxed preview like the old modal); Markup
  (+ a "% ▾" unit selector) / Client price; Margin (also editable, with a
  plain "%" suffix) / Taxable.
- **Markup and Margin are now bidirectionally synced** (edit either, the
  other recalculates: `margin = markup / (100 + markup)`, its algebraic
  inverse for the other direction) — confirmed against the same real
  sample row (25% markup ⇄ 20% margin) rather than treating Margin as
  purely a read-only derived value like the first pass did.
- Footer: "…" (Duplicate/Delete, edit-only) on the left, Cancel + a
  split-look "Save ▾" on the right — dropped the old "Created by X on Y"
  line since the real modal doesn't show one.

**Not implemented, matching this file's own disclosure rule**: "Include
item in catalog" and "Mark as bid" are checkboxes with local-only state,
never sent to the backend — there's no cost-item catalog or bid-package
feature in this prototype (bid packages are already out of scope
elsewhere). The Cost Code field's Add/Edit links and the Markup unit
toggle ("% ▾", the real modal likely also supports a flat $ markup) are
non-functional, same "structure observed, behavior out of scope" treatment
used throughout this app. `COST_CODES` in `EstimateItemModal.jsx` is the
same invented-but-plausible list already used in `estimates.js`'s seed
data, not a captured full catalog.

## AI-drafted estimate: Willow Creek Remodel rewritten for a 3,000 sq ft
## Austin build

At the user's request, Willow Creek Remodel's (`j1`) estimate data in
`src/data/estimates.js` was fully replaced with an AI-drafted (not
live-captured, not a real bid) line-item estimate for a hypothetical 3,000
sq ft custom home build in Austin, TX — 7 groups / 41 items spanning
Preconstruction & Permits through Landscaping & Site Finish, using
approximate 2026 Central Texas market rates (e.g. post-tension foundation
and spray foam insulation, both standard for the region's expansive clay
soil and climate). Totals: ~$706k builder cost (~$235/sqft), ~$841k client
price (~$282/sqft) at a blended ~16% margin — consistent with a
well-appointed, non-luxury Austin custom build, not validated against any
real contractor quote. The job's own record in `src/data/jobs.js` (name,
Round Rock address) was deliberately left untouched — only the estimate
data was in scope for this change.

## Everything else in the top nav

Sales, Jobs, Files, Messaging (Comments/Messages/RFIs/Notification
History/Surveys), Financial (Bids/Estimate/Bills/Cost Inbox/Accept Online
Payments), Tasks, Change Orders, Selections, Warranties, Time Clock, Plans
and Specs, Client Updates, Submittals, and Reports are all real nav items
(their labels and routes were captured from the live menu DOM) but are
**out of scope** for this build per the original ask (PM: dashboard,
schedule, daily logs; Financial: budget, invoices, purchase orders). They
render as a generic "Not built yet" placeholder (`src/pages/OutOfScope.jsx`)
rather than fabricated screens.
