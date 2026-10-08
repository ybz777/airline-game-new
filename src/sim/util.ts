export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function rand(meta: { rng: number }): number {
  meta.rng = (meta.rng + 0x6d2b79f5) | 0
  let t = Math.imul(meta.rng ^ (meta.rng >>> 15), 1 | meta.rng)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randInt(meta: { rng: number }, lo: number, hi: number): number {
  return lo + Math.floor(rand(meta) * (hi - lo + 1))
}

export function pick<T>(meta: { rng: number }, items: T[]): T {
  return items[Math.floor(rand(meta) * items.length)]
}

export function money(n: number): string {
  const sign = n < 0 ? '−' : ''
  const v = Math.abs(n)
  if (v >= 1_000_000_000) return `${sign}$${(v / 1e9).toFixed(2)}B`
  if (v >= 10_000_000) return `${sign}$${(v / 1e6).toFixed(1)}M`
  if (v >= 1_000_000) return `${sign}$${(v / 1e6).toFixed(2)}M`
  return `${sign}$${Math.round(v).toLocaleString('en-US')}`
}

export function moneyExact(n: number): string {
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

export function pct(n: number): string {
  return `${Math.round(n)}%`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface Cal {
  year: number
  month: number
  day: number
  dow: number
}

const START = Date.UTC(2026, 0, 1)

export function calendar(dayIndex: number): Cal {
  const d = new Date(START + dayIndex * 86400000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), dow: d.getUTCDay() }
}

export function formatDate(dayIndex: number): string {
  const c = calendar(dayIndex)
  return `${DOW[c.dow]}, ${MONTHS[c.month]} ${c.day}, ${c.year}`
}

export function formatShort(dayIndex: number): string {
  const c = calendar(dayIndex)
  return `${MONTHS[c.month].slice(0, 3)} ${c.day}`
}

export function airlineYear(dayIndex: number): number {
  return Math.floor(dayIndex / 365) + 1
}

export function monthName(m: number): string {
  return MONTHS[m]
}
