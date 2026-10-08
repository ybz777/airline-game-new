/**
 * Manufacturer delivery totals, used only to decide how often a variant
 * shows up and how hard it is to price. Figures are the commonly published
 * production counts (Boeing, Airbus, Embraer, ATR, Bombardier, and the
 * Douglas lineage). Lines still open are rounded to a recent delivery total.
 * A type missing from this table is treated as uncommon.
 */
export const BUILT: Record<string, number> = {
  'b737-200': 1114,
  'b737-300': 1113,
  'b737-400': 486,
  'b737-500': 389,
  'b737-600': 69,
  'b737-700': 1130,
  'b737-800': 4989,
  'b737-900': 505,
  'b737-max8': 1700,
  'b727-200': 1260,
  'b757-200': 995,
  'b757-300': 55,
  'b767-200': 249,
  'b767-300': 583,
  'b767-400': 38,
  'b767-300f': 280,
  'b777-200': 422,
  'b777-200a': 88,
  'b777-300': 60,
  'b777-300er': 837,
  'b777f': 260,
  'b787-8': 370,
  'b787-9': 640,
  'b787-10': 115,
  'b747-200': 393,
  'b747-400': 694,
  'b747-8': 155,
  a319: 1484,
  a320: 4756,
  a321: 1784,
  a320neo: 2100,
  a321neo: 1900,
  'a330-200': 661,
  'a330-300': 784,
  'a330-900': 150,
  'a340-300': 218,
  'a340-600': 97,
  'a350-900': 520,
  'a350-1000': 85,
  a380: 251,
  a300: 313,
  'a220-300': 280,
  'md-82': 539,
  'md-83': 265,
  'md-87': 75,
  'md-88': 150,
  'md-90': 116,
  'md-11': 200,
  'dc-9-30': 662,
  'dc-10': 386,
  crj200: 1021,
  crj700: 330,
  crj900: 487,
  crj1000: 63,
  e170: 191,
  e175: 850,
  e190: 568,
  e195: 172,
  erj145: 740,
  atr42: 500,
  atr72: 1200,
  'dh8-400': 620,
  'dh8-300': 267,
  saab340: 459,
  fokker100: 283,
  bae146: 221,
  ssj100: 230,
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Very rare'

export function builtCount(typeId: string): number {
  return BUILT[typeId] ?? 180
}

export function rarityOf(typeId: string): Rarity {
  const n = builtCount(typeId)
  if (n >= 1500) return 'Common'
  if (n >= 400) return 'Uncommon'
  if (n >= 80) return 'Rare'
  return 'Very rare'
}

/** How often this variant should be offered. Production sets the base. Age and role trim it. */
export function availabilityWeight(typeId: string, era: string, category: string, seats: number): number {
  const n = builtCount(typeId)
  let w = Math.sqrt(n)
  if (era === 'classic') w *= 0.28
  else if (era === 'aging') w *= 0.5
  else if (era === 'mature') w *= 0.72
  else if (era === 'current') w *= 1.12
  if (category === 'widebody') w *= 0.7
  if (seats <= 0) w *= 0.45
  return Math.max(0.35, w)
}
