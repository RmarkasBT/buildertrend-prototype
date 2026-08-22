// Deterministic stand-in for the weather provider the live Daily Log form
// calls when "Include Weather Conditions" is checked. Same (jobId, date)
// always yields the same reading, so a log's card, detail view and print
// output never disagree — and so seeded fixtures stay stable across
// re-seeds. Shape matches the fields the live UI renders: a conditions
// summary, high/low, wind, humidity and total precipitation.

// maxPrecip keeps the rainfall consistent with the summary — a "Partly
// cloudy" day must not report three quarters of an inch.
const CONDITIONS = [
  { summary: 'Sunny', icon: 'sun', precipChance: 0, maxPrecip: 0 },
  { summary: 'Mostly sunny', icon: 'sun', precipChance: 0, maxPrecip: 0 },
  { summary: 'Partly cloudy', icon: 'partly-cloudy', precipChance: 0.1, maxPrecip: 0.05 },
  { summary: 'Mostly cloudy', icon: 'cloud', precipChance: 0.2, maxPrecip: 0.1 },
  { summary: 'Partly cloudy with isolated showers', icon: 'rain', precipChance: 0.7, maxPrecip: 0.4 },
  { summary: 'Scattered thunderstorms', icon: 'storm', precipChance: 0.9, maxPrecip: 1.6 },
  { summary: 'Overcast', icon: 'cloud', precipChance: 0.25, maxPrecip: 0.15 },
]

// FNV-1a. Small, dependency-free, and spreads adjacent dates apart well
// enough that consecutive days don't read as identical weather.
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

// Successive draws from one seed, each in [0, 1).
function seededSequence(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

// Central-Texas seasonal curve (the seeded jobs are all Austin-area), peaking
// in August and bottoming in January, so August logs read ~100°F like the
// live COTA job's did rather than a flat year-round average.
function seasonalHigh(date) {
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  const dayOfYear = (month - 1) * 30.4 + day
  return 76 + 24 * Math.cos(((dayOfYear - 212) / 365) * 2 * Math.PI)
}

export function weatherFor(jobId, date) {
  const rand = seededSequence(hash(`${jobId}|${date}`))
  const condition = CONDITIONS[Math.floor(rand() * CONDITIONS.length)]
  const high = Math.round(seasonalHigh(date) + (rand() * 10 - 5))
  const low = high - Math.round(16 + rand() * 9)
  const precip = rand() < condition.precipChance ? Math.round(rand() * condition.maxPrecip * 100) / 100 : 0

  return {
    summary: condition.summary,
    icon: condition.icon,
    high,
    low,
    wind: Math.round(3 + rand() * 14),
    humidity: Math.round(35 + rand() * 55),
    precipitation: precip,
    capturedAt: `${date}T06:00:00.000Z`,
  }
}
