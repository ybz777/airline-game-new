import { getType } from '../data/aircraft'
import { AIRPORTS, PAIR_DEMAND, getAirport } from '../data/airports'
import { cateringCost } from '../data/meals'
import type {
  CabinLayout,
  Condition,
  CreditRating,
  Forecast,
  Frequency,
  GameState,
  OwnedAircraft,
  Quote,
  RivalRoute,
  ServiceLevel,
  Strategy,
} from '../types'
import { blockHours, distanceNm, pairKey } from './geo'
import { practicalRange } from './range'
import { calendar, clamp } from './util'

export function avgCondition(c: Condition): number {
  return (c.airframe + c.engine1 + c.engine2 + c.avionics + c.landingGear + c.cabin + c.interior) / 7
}

export function mechanicalCondition(c: Condition): number {
  return (c.airframe + c.engine1 + c.engine2 + c.avionics + c.landingGear) / 5
}

export function reliabilityOf(base: number, c: Condition): number {
  return clamp(base * 0.35 + mechanicalCondition(c) * 0.65, 15, 99)
}

export function overallReputation(s: GameState): number {
  const r = s.reputation
  return Math.round((r.satisfaction + r.reliability + r.safety + r.service + r.price + r.trust + r.brand) / 7)
}

export interface Effects {
  fuel: number
  demand: number
  maint: number
  salary: number
  fees: number
  cargo: number
  oldFee: number
}

export function effects(s: GameState): Effects {
  const day = s.meta.day
  let fuel = s.market.fuelIndex
  let demand = s.market.demandIndex
  let maint = s.market.partsMul
  let salary = s.market.salaryIndex
  let fees = 1
  let cargo = s.market.cargoIndex
  let oldFee = 0
  for (const m of s.modifiers) {
    if (m.untilDay <= day) continue
    if (m.fuelMul) fuel *= m.fuelMul
    if (m.demandMul) demand *= m.demandMul
    if (m.maintMul) maint *= m.maintMul
    if (m.salaryMul) salary *= m.salaryMul
    if (m.feeMul) fees *= m.feeMul
    if (m.cargoMul) cargo *= m.cargoMul
    if (m.oldFeeAdd) oldFee += m.oldFeeAdd
  }
  if (s.market.hedgeUntilDay > day) fuel = s.market.hedgeIndex
  return { fuel, demand, maint, salary, fees, cargo, oldFee }
}

export function seasonMul(month: number, distance: number): number {
  const table = [0.84, 0.86, 0.98, 1.03, 1.06, 1.15, 1.18, 1.12, 0.99, 1.02, 1.08, 1.16]
  const leisure = distance > 700 ? 1 : 0.65
  const swing = table[month] - 1
  return 1 + swing * (0.65 + 0.35 * leisure)
}

export function baseDemand(origin: string, dest: string): number {
  const key = pairKey(origin, dest)
  if (PAIR_DEMAND[key]) return PAIR_DEMAND[key]
  const a = getAirport(origin)
  const b = getAirport(dest)
  const dist = distanceNm(a, b)
  let d = Math.sqrt(a.demand * b.demand) * 3.6
  if (dist < 400) d *= 1.1
  else if (dist > 1800) d *= 0.62
  else if (dist > 900) d *= 0.8
  if (a.country !== b.country) d *= 0.82
  return Math.round(d)
}

export function referenceFare(distance: number): number {
  return Math.round(clamp(58 + distance * 0.142, 69, 680))
}

export function fliesOn(freq: Frequency, dow: number): boolean {
  if (freq === 'daily') return true
  if (freq === 'weekdays') return dow >= 1 && dow <= 5
  return dow === 1 || dow === 3 || dow === 5
}

export function weeklyFlights(freq: Frequency): number {
  if (freq === 'daily') return 7
  if (freq === 'weekdays') return 5
  return 3
}

export function seatSplit(seats: number, layout: CabinLayout): { economy: number; business: number; total: number } {
  if (layout === 'economy' || seats < 90) return { economy: seats, business: 0, total: seats }
  const business = Math.max(8, Math.round(seats * 0.08))
  const economy = Math.max(40, seats - business - Math.round(business * 0.45))
  return { economy, business, total: economy + business }
}

function serviceMul(service: ServiceLevel, distance: number, strategy: Strategy): number {
  const expect: ServiceLevel = distance > 1600 ? 'meal' : distance > 750 ? 'snack' : 'none'
  const rank = { none: 0, snack: 1, meal: 2, premium: 3 }
  const gap = rank[service] - rank[expect]
  if (strategy === 'ulcc' || strategy === 'lcc') {
    if (gap < 0 && distance > 800) return 0.9
    return 1
  }
  if (gap >= 0) return gap > 0 ? 1.04 : 1
  if (gap === -1) return 0.88
  return 0.74
}

export function effectiveRange(typeId: string, origin: string, dest: string): number {
  return practicalRange(typeId, origin, dest)
}

export function hubBonus(s: GameState, airportId: string): number {
  const n = s.routes.filter((r) => r.origin === airportId || r.dest === airportId).length
  if (n < 4) return 1
  return Math.min(1.22, 1 + (n - 3) * 0.045)
}

interface Offer {
  id: string
  score: number
  seats: number
}

function splitDemand(market: number, offers: Offer[]): Record<string, number> {
  const outside = 0.7
  const sum = offers.reduce((a, o) => a + o.score, 0) + outside
  const rows = offers.map((o) => ({ ...o, pax: market * (o.score / sum) }))
  let spill = 0
  for (const row of rows) {
    if (row.pax > row.seats) {
      spill += row.pax - row.seats
      row.pax = row.seats
    }
  }
  const room = rows.filter((r) => r.pax < r.seats - 0.25)
  const roomScore = room.reduce((a, r) => a + r.score, 0) + outside
  if (spill > 0 && roomScore > 0) {
    for (const row of room) {
      const add = (spill * row.score) / roomScore
      row.pax = Math.min(row.seats, row.pax + add)
    }
  }
  const out: Record<string, number> = {}
  for (const row of rows) out[row.id] = row.pax
  return out
}

export function rivalsOn(s: GameState, origin: string, dest: string, dow: number): RivalRoute[] {
  const key = pairKey(origin, dest)
  const rows: RivalRoute[] = []
  for (const rival of s.rivals) {
    if (!rival.alive) continue
    for (const route of rival.routes) {
      if (pairKey(route.origin, route.dest) !== key) continue
      if (!fliesOn(route.frequency, dow)) continue
      rows.push(route)
    }
  }
  return rows
}

function marketAnchor(ref: number, rivalPrices: number[]): number {
  if (!rivalPrices.length) return Math.max(40, ref)
  const avg = rivalPrices.reduce((a, b) => a + b, 0) / rivalPrices.length
  return Math.max(40, avg * 0.75 + ref * 0.25)
}

function fareCurve(ratio: number, strategy: Strategy): number {
  const x = clamp(ratio, 0.45, 10)
  const sens = strategy === 'ulcc' ? 1.35 : strategy === 'premium' ? 0.7 : strategy === 'full' ? 0.85 : 1.05
  let score = Math.pow(x, -sens)
  if (x > 2.4) score *= Math.exp(-0.35 * (x - 2.4))
  return clamp(score, 0.04, 2.4)
}

export function fareWillingness(ratio: number): number {
  const x = clamp(ratio, 0.5, 12)
  if (x <= 1.35) return 1
  if (x <= 2.2) return 1 - (x - 1.35) * 0.1
  return clamp(Math.exp(-0.34 * (x - 1.9)), 0.03, 0.92)
}

function scoreOffer(opts: {
  price: number
  ref: number
  anchor: number
  appeal: number
  cabin: number
  repFactor: number
  service: ServiceLevel
  distance: number
  strategy: Strategy
  baggage: number
  weekly: number
  reliabilityRep: number
}): number {
  const priceScore = fareCurve(opts.price / Math.max(40, opts.anchor), opts.strategy)
  const hard = (0.55 + opts.appeal / 220) * (0.6 + opts.cabin / 220)
  const freq = Math.pow(opts.weekly / 7, 0.32)
  const svc = serviceMul(opts.service, opts.distance, opts.strategy)
  let bag = 1
  if (opts.baggage >= 35) bag = opts.strategy === 'ulcc' || opts.strategy === 'lcc' ? 0.97 : 0.9
  const rel = 0.72 + opts.reliabilityRep / 280
  let strat = 1
  if (opts.strategy === 'regional' && opts.distance < 550) strat = 1.1
  if (opts.strategy === 'premium' && opts.distance > 800) strat = 1.08
  if (opts.strategy === 'ulcc' && opts.price < opts.ref) strat = 1.06
  return Math.max(0.05, 1.2 * priceScore * hard * freq * svc * bag * rel * opts.repFactor * strat)
}

export function repFactor(s: GameState): number {
  const r = s.reputation
  const base = 0.62 + (r.brand + r.trust + r.satisfaction) / 520
  if (r.safety >= 18) return base
  return base * (0.55 + r.safety / 40)
}

export function forecastLeg(s: GameState, input: {
  origin: string
  dest: string
  typeId: string
  price: number
  service: ServiceLevel
  baggageFee: number
  cabinLayout: CabinLayout
  frequency: Frequency
  condition?: Condition
  aircraftAppeal?: number
  skipRange?: boolean
  economyMealId?: string
  cabinMealId?: string
}): Forecast {
  const type = getType(input.typeId)
  const a = getAirport(input.origin)
  const b = getAirport(input.dest)
  const dist = distanceNm(a, b)
  const block = blockHours(dist, type.cruiseSpeedKt)
  const seats = seatSplit(type.seatCapacity, input.cabinLayout)
  const notes: string[] = []
  const range = effectiveRange(input.typeId, input.origin, input.dest)
  if (!input.skipRange && dist > range) {
    return emptyForecast(dist, block, `Stage length exceeds reserves. ${type.model} practical range is ${Math.round(range)} nm.`)
  }
  if (a.runwayFt < type.minRunwayFt || b.runwayFt < type.minRunwayFt) {
    return emptyForecast(dist, block, 'Runway length is short for this aircraft.')
  }
  const closed = s.market.closedAirports.find((c) => (c.id === input.origin || c.id === input.dest) && c.untilDay > s.meta.day)
  if (closed) notes.push(`${closed.id} is disrupted: ${closed.reason}`)
  const grounded = s.market.groundedFamilies.find((g) => g.family === type.family && g.untilDay > s.meta.day)
  if (grounded) notes.push(`${type.model} family is under a grounding order.`)

  const cal = calendar(s.meta.day)
  const eff = effects(s)
  const ref = referenceFare(dist)
  const rivalRoutes = rivalsOn(s, input.origin, input.dest, cal.dow)
  const anchor = marketAnchor(ref, rivalRoutes.map((r) => r.price))
  const fareRatio = input.price / anchor
  const cond = input.condition
  const cabin = cond ? cond.cabin : 70
  const appeal = input.aircraftAppeal ?? type.passengerAppeal
  const weekly = weeklyFlights(input.frequency)
  const ours = scoreOffer({
    price: input.price,
    ref,
    anchor,
    appeal,
    cabin,
    repFactor: repFactor(s),
    service: input.service,
    distance: dist,
    strategy: s.airline.strategy,
    baggage: input.baggageFee,
    weekly,
    reliabilityRep: s.reputation.reliability,
  })
  const offers: Offer[] = [{ id: 'player', score: ours * hubBonus(s, input.origin), seats: seats.total }]
  let competitorPrice: number | null = null
  let competitorName: string | null = null
  for (const rival of s.rivals) {
    if (!rival.alive) continue
    for (const route of rival.routes) {
      if (!rivalRoutes.includes(route)) continue
      const rt = getType(route.typeId)
      const sc = scoreOffer({
        price: route.price,
        ref,
        anchor,
        appeal: rt.passengerAppeal,
        cabin: 78,
        repFactor: 0.62 + rival.reputation / 180,
        service: route.service,
        distance: dist,
        strategy: rival.strategy,
        baggage: rival.strategy === 'ulcc' ? 40 : 0,
        weekly: weeklyFlights(route.frequency),
        reliabilityRep: rival.reputation,
      })
      offers.push({ id: rival.id + route.origin, score: sc, seats: route.dailySeats })
      if (competitorPrice === null || route.price < competitorPrice) {
        competitorPrice = route.price
        competitorName = rival.name
      }
    }
  }
  let market = baseDemand(input.origin, input.dest) * seasonMul(cal.month, dist) * eff.demand * (0.92 + s.market.economyIndex * 0.08)
  market *= 0.92 + (a.demand + b.demand) / 800
  const shares = splitDemand(market, offers)
  const pax = Math.max(0, Math.round((shares.player ?? 0) * fareWillingness(fareRatio)))
  const biz = seats.business > 0 ? Math.min(seats.business, Math.round(pax * (s.airline.strategy === 'premium' ? 0.16 : 0.1))) : 0
  const econ = Math.min(seats.economy, pax - biz)
  const sold = econ + biz
  const ticket = econ * input.price + biz * input.price * 2.4
  const bagAttach = input.baggageFee > 0 ? 0.58 : 0
  const baggage = sold * input.baggageFee * bagAttach
  const cargo = type.cargoTons * (380 + dist * 0.95) * eff.cargo * (0.75 + s.market.economyIndex * 0.25)
  const revenue = ticket + baggage + cargo
  const fuelPrice = 2.72 * eff.fuel * (1 + (a.fuelDelta + b.fuelDelta) / 2)
  const gallons = block * type.fuelBurnGph * 1.12
  const fuel = gallons * fuelPrice
  const feeOld = type.era === 'classic' || type.era === 'aging' ? eff.oldFee : 0
  const airportFees = (a.feeIndex + b.feeIndex) * 780 * (type.seatCapacity / 140) * eff.fees + feeOld
  const wear = cond ? 1.35 - avgCondition(cond) / 140 : 1
  const maintenance = type.maintenancePerFlight * wear * eff.maint
  const catering = cateringCost(input.economyMealId ?? '', input.cabinMealId ?? '', econ, biz, s.meals, input.service, sold)
  const contribution = revenue - fuel - airportFees - maintenance - catering
  if (competitorName && competitorPrice !== null) {
    notes.push(`${competitorName} is filed at ${competitorPrice < input.price ? 'a lower' : 'a higher'} fare ($${competitorPrice}).`)
  }
  if (fareRatio >= 2.2) notes.push('This fare is extremely high. Passenger demand may collapse.')
  else if (fareRatio >= 1.45) notes.push('This fare is above the market. Fewer passengers will choose it.')
  if (block * 2 + 0.85 <= 13.5) notes.push('Stage length supports a same-day round trip.')
  else notes.push('The aircraft will overnight. One leg each day.')
  if (s.airline.strategy === 'premium' && input.service === 'none' && dist > 600) notes.push('Premium passengers will notice the missing service.')
  return {
    ok: !grounded,
    reason: grounded ? 'Family is grounded.' : '',
    distanceNm: Math.round(dist),
    blockHours: block,
    roundTrip: block * 2 + 0.85 <= 13.5,
    legs: block * 2 + 0.85 <= 13.5 ? 2 : 1,
    seats: seats.total,
    businessSeats: seats.business,
    economySeats: seats.economy,
    paxPerLeg: sold,
    loadFactor: seats.total ? sold / seats.total : 0,
    revenue,
    fuel,
    airportFees,
    maintenance,
    catering,
    baggage,
    cargo,
    contribution,
    competitorPrice,
    competitorName,
    marketDemand: Math.round(market),
    notes,
  }
}

function emptyForecast(dist: number, block: number, reason: string): Forecast {
  return {
    ok: false, reason, distanceNm: Math.round(dist), blockHours: block, roundTrip: false, legs: 0,
    seats: 0, businessSeats: 0, economySeats: 0, paxPerLeg: 0, loadFactor: 0, revenue: 0, fuel: 0,
    airportFees: 0, maintenance: 0, catering: 0, baggage: 0, cargo: 0, contribution: 0,
    competitorPrice: null, competitorName: null, marketDemand: 0, notes: [reason],
  }
}

export function appraise(typeId: string, yearBuilt: number, condition: Condition, usedIndex: number, year: number): number {
  const type = getType(typeId)
  const age = Math.max(0, year - yearBuilt)
  const cond = avgCondition(condition) / 100
  let v = type.purchasePrice * (0.62 + 0.55 * cond)
  const ageDelta = age - type.typicalAskAge
  v *= Math.max(0.28, 1 - ageDelta * 0.03)
  v *= usedIndex
  return Math.round(v)
}

export function creditTerms(rating: CreditRating, bump: number): { max: number; rate: number } {
  const table: Record<CreditRating, { max: number; rate: number }> = {
    Poor: { max: 2_000_000, rate: 0.118 },
    Fair: { max: 8_000_000, rate: 0.086 },
    Good: { max: 25_000_000, rate: 0.071 },
    Strong: { max: 60_000_000, rate: 0.056 },
  }
  const row = table[rating]
  return { max: row.max, rate: row.rate + bump }
}

export function amortize(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12
  if (r <= 0) return principal / months
  const pow = Math.pow(1 + r, months)
  return (principal * r * pow) / (pow - 1)
}

export function quotePurchase(s: GameState, listingId: string, mode: 'cash' | 'finance' | 'lease'): Quote {
  const listing = s.listings.find((l) => l.id === listingId)
  if (!listing) return badQuote('That aircraft is gone.')
  const type = getType(listing.typeId)
  const pilots = 4
  const payroll = pilots * type.crewPayMonthly
  let cover = 1
  if (listing.maintenance === 'Poor') cover *= 1.16
  else if (listing.maintenance === 'Excellent') cover *= 0.94
  if (listing.tailStrike) cover *= 1.1
  const insurance = Math.round((18000 + listing.price * 0.004) * cover)
  if (mode === 'lease') {
    const deposit = listing.leaseMonthly * 2
    const cashDue = deposit + payroll + insurance
    if (s.finance.cash < cashDue) return badQuote('Not enough cash for the deposit, first crew month, and insurance.')
    return {
      ok: true, reason: '', price: listing.price, closing: payroll + insurance, cashDue, leaseMonthly: listing.leaseMonthly,
      deposit, financed: 0, payment: listing.leaseMonthly, rate: 0,
    }
  }
  if (mode === 'cash') {
    const cashDue = listing.price + payroll + insurance
    if (s.finance.cash < cashDue) return badQuote('You cannot pay cash and still cover delivery crew and insurance.')
    return {
      ok: true, reason: '', price: listing.price, closing: payroll + insurance, cashDue, leaseMonthly: 0,
      deposit: 0, financed: 0, payment: 0, rate: 0,
    }
  }
  const terms = creditTerms(s.finance.credit, s.market.interestBump)
  const down = Math.round(listing.price * 0.3)
  const financed = listing.price - down
  if (financed > terms.max) return badQuote(`Your credit (${s.finance.credit}) will not carry ${financed.toLocaleString('en-US')} of aircraft debt.`)
  const cashDue = down + payroll + insurance
  if (s.finance.cash < cashDue) return badQuote('The down payment, crew, and insurance exceed your cash.')
  const payment = amortize(financed, terms.rate, 84)
  return {
    ok: true, reason: '', price: listing.price, closing: payroll + insurance, cashDue, leaseMonthly: 0,
    deposit: down, financed, payment, rate: terms.rate,
  }
}

function badQuote(reason: string): Quote {
  return { ok: false, reason, price: 0, closing: 0, cashDue: 0, leaseMonthly: 0, deposit: 0, financed: 0, payment: 0, rate: 0 }
}

export function repairCost(typeId: string, key: keyof Condition, value: number): number {
  const type = getType(typeId)
  const missing = clamp(100 - value, 0, 100) / 100
  const weight: Record<keyof Condition, number> = {
    airframe: 1.1, engine1: 1.8, engine2: 1.8, avionics: 0.7, landingGear: 0.55, cabin: 0.42, interior: 0.3,
  }
  return Math.round(type.checkCost * weight[key] * missing)
}

export function nextCredit(current: CreditRating, up: boolean): CreditRating {
  const order: CreditRating[] = ['Poor', 'Fair', 'Good', 'Strong']
  const i = order.indexOf(current)
  return order[clamp(i + (up ? 1 : -1), 0, order.length - 1)]
}

export function dailyFixed(s: GameState, eff: Effects): { hq: number; insurance: number; gates: number; total: number } {
  const hq = 850
  const insurance = (280 + s.fleet.filter((a) => a.status !== 'lost').length * 240 * (1.15 - s.reputation.safety / 400)) * (s.meta.insuranceLoad ?? 1)
  const activeRoutes = s.routes.length
  const lease = (s.gates ?? []).reduce((sum, gate) => sum + gate.daily, 0)
  const gates = 420 + lease + activeRoutes * 40
  const stored = s.fleet.filter((a) => a.status === 'stored').length * 260
  const total = (hq + insurance + gates + stored) * (0.9 + eff.fees * 0.1)
  return { hq, insurance, gates: gates + stored, total }
}

export function slotsUsed(s: GameState, airportId: string): number {
  let n = 0
  for (const r of s.routes) {
    const w = r.frequency === 'daily' ? 1 : r.frequency === 'weekdays' ? 0.75 : 0.45
    if (r.origin === airportId) n += w
    if (r.dest === airportId) n += w * 0.5
  }
  return n
}

export function canAddRoute(s: GameState, origin: string, dest: string): string | null {
  for (const id of [origin, dest]) {
    const ap = AIRPORTS.find((a) => a.id === id)
    if (!ap) return 'Unknown airport.'
    const bonus = s.market.slotBonus[id] ?? 0
    if (slotsUsed(s, id) + 1 > ap.playerSlots + bonus) return `${ap.city} has no spare slot pairs for you.`
  }
  return null
}

export function conditionAfterYears(base: number, scatter: number): number {
  return clamp(Math.round(base + scatter), 8, 99)
}

export function emptyCondition(n: number): Condition {
  return { airframe: n, engine1: n, engine2: n, avionics: n, landingGear: n, cabin: n, interior: n }
}

export function ownedValue(s: GameState, ac: OwnedAircraft): number {
  const year = calendar(s.meta.day).year
  let value = appraise(ac.typeId, ac.yearBuilt, ac.condition, s.market.usedPriceIndex, year)
  if (ac.maintenance === 'Poor') value *= 0.9
  else if (ac.maintenance === 'Fair') value *= 0.97
  else if (ac.maintenance === 'Excellent') value *= 1.06
  if (ac.tailStrike) value *= 0.94
  return Math.round(value)
}
