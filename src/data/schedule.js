// Field shape (Title, Display Color, Assignees, Start/Work Days/End Date,
// Hourly, Progress, Reminder, Complete, Phase, Tags, Show on Gantt/Show
// Client, Subs/Vendors viewing access, Created by/on) matches the real
// "Schedule Item" create/edit modal captured from /app/Schedules — see
// CAPTURE_LOG.md for what wasn't captured (Predecessors & Links, Files,
// Shifts, RFIs, Related Items — all simplified out or omitted here).
// Titles/dates/people are invented.
function item(overrides) {
  return {
    color: 'Victoria',
    assignees: '',
    workDays: 1,
    hourly: false,
    progress: 0,
    reminder: 'None',
    complete: false,
    phase: 'Unassigned',
    tags: [],
    showOnGantt: true,
    showClient: true,
    subIds: [],
    predecessorIds: [],
    createdBy: 'Ruhaab Markas',
    createdAt: '2026-07-15T10:00:00',
    ...overrides,
  }
}

// Dates, durations and dependencies are internally consistent, which the
// original fixtures were not — worth knowing why, since it's load-bearing for
// the Gantt and the cascade engine:
//
//  * `workDays` is WORKING days, so every `end` here satisfies
//    endFromWorkDays(start, workDays) (src/lib/dates.js). One item used to end
//    on a Saturday, which no task can do.
//  * `predecessorIds` encodes the real finish-to-start chain. It was empty on
//    every item before, which made the critical path and any dependency
//    cascade a silent no-op.
//  * The sequence now obeys the trade order the agent's own prompt states:
//    framing -> windows (dried-in) -> MEP rough-in -> insulation -> drywall ->
//    finish-out, with exterior stucco running parallel to interior MEP because
//    they don't share space. Previously MEP rough-in ran fully concurrent with
//    insulation and drywall started before either finished, so an agent
//    reviewing this schedule would flag the same sequencing violation forever.
//  * `progress`/`complete` reflect a job in flight as of late Aug 2026, rather
//    than 0% everywhere (which made progress-drift detection fire on every
//    item at once and report nothing but noise).
export const scheduleByJob = {
  j1: [
    item({ id: 's1', title: 'Selective Demolition Complete', color: 'Coffee', start: '2026-08-03', end: '2026-08-03', workDays: 1, phase: 'Site Work', subIds: ['sv1'], complete: true, progress: 100 }),
    item({ id: 's2', title: 'Phase 2 – Structural Wood Framing', color: 'Amber', start: '2026-08-04', end: '2026-08-12', workDays: 7, phase: 'Framing', subIds: ['sv3'], predecessorIds: ['s1'], complete: true, progress: 100 }),
    item({ id: 's3', title: 'Phase 3 – Windows/Exterior Doors Install', color: 'Amber', start: '2026-08-13', end: '2026-08-25', workDays: 9, phase: 'Framing', subIds: ['sv3'], predecessorIds: ['s2'], progress: 70 }),
    item({ id: 's4', title: 'Building Dried-In', color: 'Coffee', start: '2026-08-26', end: '2026-08-26', workDays: 1, phase: 'Framing', predecessorIds: ['s3'] }),
    item({ id: 's5', title: 'Phase 4 – MEP Rough-In', color: 'Amber', start: '2026-08-27', end: '2026-09-03', workDays: 6, phase: 'MEP Rough-In', subIds: ['sv2', 'sv6'], predecessorIds: ['s4'] }),
    item({ id: 's6', title: 'Phase 5 – Insulation Install (Thermal + Acoustic)', color: 'Amber', start: '2026-09-04', end: '2026-09-11', workDays: 6, phase: 'MEP Rough-In', predecessorIds: ['s5'] }),
    item({ id: 's7', title: 'Phase 5 – Drywall Hang, Tape/Float, Texture', color: 'Amber', start: '2026-09-14', end: '2026-09-22', workDays: 7, phase: 'Finishes', predecessorIds: ['s6'] }),
    item({ id: 's8', title: 'Phase 6 – Interior Reconnection & Finish-Out', color: 'Amber', start: '2026-09-23', end: '2026-10-01', workDays: 7, phase: 'Finishes', predecessorIds: ['s7'] }),
    // Exterior work: gated on dried-in, not on the interior chain, so it runs
    // alongside MEP rough-in. Also the job's main weather-exposed scope.
    item({ id: 's9', title: 'Phase 7 – Exterior Stucco System Install', color: 'Amber', start: '2026-08-27', end: '2026-09-04', workDays: 7, phase: 'Finishes', predecessorIds: ['s4'] }),
    item({ id: 's10', title: 'Phase 7 – HVAC Final Set, Start-Up', color: 'Amber', start: '2026-10-02', end: '2026-10-07', workDays: 4, phase: 'Finishes', subIds: ['sv6'], predecessorIds: ['s8'] }),
  ],
  j2: [],
  j3: [
    item({ id: 's11', title: 'Foundation Pour', color: 'Coffee', start: '2026-08-05', end: '2026-08-05', workDays: 1, phase: 'Foundation', subIds: ['sv7'], complete: true, progress: 100 }),
    item({ id: 's12', title: 'Framing – First Floor', color: 'Amber', start: '2026-08-06', end: '2026-08-17', workDays: 8, phase: 'Framing', subIds: ['sv3'], predecessorIds: ['s11'], progress: 60 }),
  ],
  j4: [],
  j5: [],
  j6: [],
}

let nextId = 100
export function newScheduleItemId() {
  return `s${nextId++}`
}
