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
    createdBy: 'Ruhaab Markas',
    createdAt: '2026-07-15T10:00:00',
    ...overrides,
  }
}

export const scheduleByJob = {
  j1: [
    item({ id: 's1', title: 'Selective Demolition Complete', color: 'Coffee', start: '2026-08-03', end: '2026-08-03', workDays: 1, phase: 'Site Work', subIds: ['sv1'] }),
    item({ id: 's2', title: 'Phase 2 – Structural Wood Framing', color: 'Amber', start: '2026-08-03', end: '2026-08-11', workDays: 7, phase: 'Framing', subIds: ['sv3'] }),
    item({ id: 's3', title: 'Phase 3 – Windows/Exterior Doors Install', color: 'Amber', start: '2026-08-04', end: '2026-08-14', workDays: 9, phase: 'Framing', subIds: ['sv3'] }),
    item({ id: 's4', title: 'Building Dried-In', color: 'Coffee', start: '2026-08-09', end: '2026-08-09', workDays: 1, phase: 'Framing' }),
    item({ id: 's5', title: 'Phase 4 – MEP Rough-In', color: 'Amber', start: '2026-08-17', end: '2026-08-24', workDays: 6, phase: 'MEP Rough-In', subIds: ['sv2', 'sv6'] }),
    item({ id: 's6', title: 'Phase 5 – Insulation Install (Thermal + Acoustic)', color: 'Amber', start: '2026-08-17', end: '2026-08-24', workDays: 6, phase: 'MEP Rough-In' }),
    item({ id: 's7', title: 'Phase 5 – Drywall Hang, Tape/Float, Texture', color: 'Amber', start: '2026-08-18', end: '2026-08-26', workDays: 7, phase: 'Finishes' }),
    item({ id: 's8', title: 'Phase 6 – Interior Reconnection & Finish-Out', color: 'Amber', start: '2026-08-19', end: '2026-08-27', workDays: 7, phase: 'Finishes' }),
    item({ id: 's9', title: 'Phase 7 – Exterior Stucco System Install', color: 'Amber', start: '2026-08-20', end: '2026-08-28', workDays: 7, phase: 'Finishes' }),
    item({ id: 's10', title: 'Phase 7 – HVAC Final Set, Start-Up', color: 'Amber', start: '2026-08-20', end: '2026-08-25', workDays: 4, phase: 'Finishes', subIds: ['sv6'] }),
  ],
  j2: [],
  j3: [
    item({ id: 's11', title: 'Foundation Pour', color: 'Coffee', start: '2026-08-05', end: '2026-08-05', workDays: 1, phase: 'Foundation', subIds: ['sv7'] }),
    item({ id: 's12', title: 'Framing – First Floor', color: 'Amber', start: '2026-08-06', end: '2026-08-15', workDays: 8, phase: 'Framing', subIds: ['sv3'] }),
  ],
  j4: [],
  j5: [],
  j6: [],
}

let nextId = 100
export function newScheduleItemId() {
  return `s${nextId++}`
}
