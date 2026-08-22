// Named color palette from the real "Display Color" dropdown on a Schedule
// Item (New Schedule Item modal). Only the first 9 names shown before the
// list was cut off during capture were confirmed — the real palette likely
// continues further (oranges/yellows/greens/blues/purples were not
// scrolled to). "Victoria" is the exact hex observed as Crumley Ranch's
// default job color; the rest are close visual approximations since exact
// hex values weren't extracted from the swatches.
export const scheduleColors = [
  { name: 'Maroon', hex: '#7a1f2b' },
  { name: 'Merlot', hex: '#5c1f3a' },
  { name: 'Tuscan Red', hex: '#8c3b3b' },
  { name: 'Rose', hex: '#c97b7b' },
  { name: 'Victoria', hex: '#c78888' },
  { name: 'Brown', hex: '#6b4226' },
  { name: 'Coffee', hex: '#4b3621' },
  { name: 'Amber', hex: '#c68b2c' },
  { name: 'Alarm Lime', hex: '#8dc63f' },
]

export function colorHex(name) {
  return scheduleColors.find((c) => c.name === name)?.hex ?? '#8f9ba8'
}

// Only these values were confirmed in the real Reminder dropdown before it
// was cut off during capture.
export const reminderOptions = [
  'None',
  '1 Hour Before',
  '2 Hours Before',
  '4 Hours Before',
  '8 Hours Before',
  '12 Hours Before',
  '1 Day Before',
  '2 Days Before',
]

// The real "Phase" dropdown on a job's schedule is configurable per job
// (an "Add"/"Edit" link sits next to it) — not observed with real values
// populated. These are reasonable construction-phase names, flagged as
// invented in CAPTURE_LOG.md.
export const phaseOptions = ['Unassigned', 'Site Work', 'Foundation', 'Framing', 'MEP Rough-In', 'Finishes']
