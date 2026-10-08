import { getType } from '../data/aircraft'
import { getAirport, type Airport } from '../data/airports'
import { getAllAirportGates } from '../data/airportMap'
import { mealById, mealIdForService } from '../data/meals'
import { blockHours, distanceNm } from './geo'
import { money } from './util'
import type { AircraftCategory, Frequency, GameState, GateHold, GateSize, Route } from '../types'

export function turnaroundHours(category: AircraftCategory): number {
  if (category === 'turboprop') return 0.45
  if (category === 'regional') return 0.6
  if (category === 'narrowbody') return 0.85
  return 1.6
}

export function turnaroundMin(category: AircraftCategory): number {
  return Math.round(turnaroundHours(category) * 60)
}

export function leaseDaily(ap: Airport): number {
  const base = ap.size === 'hub' ? 2400 : ap.size === 'large' ? 1500 : ap.size === 'medium' ? 900 : 520
  return Math.round(base * ap.feeIndex)
}

export function ownPrice(ap: Airport): number {
  return leaseDaily(ap) * 420
}

export interface Stand {
  id: string
  airportId: string
  terminal: string
  number: string
  lat: number
  lon: number
  leaseDaily: number
  ownPrice: number
  pool: 'player' | 'other'
}

function catalogCount(ap: Airport): number {
  if (ap.size === 'hub') return 36
  if (ap.size === 'large') return 22
  if (ap.size === 'medium') return 14
  return 8
}

export function standsFor(ap: Airport, bonus: number): Stand[] {
  const mapGates = getAllAirportGates(ap.id)
  const award = Math.max(1, ap.playerSlots + bonus)
  const daily = leaseDaily(ap)
  const price = ownPrice(ap)

  if (mapGates.length > 0) {
    return mapGates.map((g, idx) => {
      // Determine size multiplier for lease
      const sizeMult = g.size === 'Super' ? 1.4 : g.size === 'Heavy' ? 1.2 : g.size === 'Medium' ? 1.0 : 0.8
      return {
        id: `${ap.id}-${g.label}`,
        airportId: ap.id,
        terminal: g.terminal,
        number: g.label,
        lat: g.lat,
        lon: g.lon,
        leaseDaily: Math.round(daily * sizeMult),
        ownPrice: Math.round(price * sizeMult),
        pool: idx < award ? 'player' : 'other',
      }
    })
  }

  const total = catalogCount(ap)
  const rows: Stand[] = []
  for (let i = 0; i < total; i++) {
    const terminal = i < 12 ? 'A' : i < 24 ? 'B' : 'C'
    const number = `${terminal}${(i % 12) + 1}`
    const angle = -0.55 + (i / Math.max(1, total - 1)) * 1.15
    const radius = Math.min(0.0032, ap.span * 0.04)
    const lat = ap.lat + Math.sin(angle) * radius * 0.35
    const lon = ap.lon + (Math.cos(angle) * radius) / Math.max(0.35, Math.cos((ap.lat * Math.PI) / 180))
    rows.push({
      id: `${ap.id}-${number}`,
      airportId: ap.id,
      terminal,
      number,
      lat,
      lon,
      leaseDaily: daily,
      ownPrice: price,
      pool: i < award ? 'player' : 'other',
    })
  }
  return rows
}

export function holdOf(s: GameState, gateId: string): GateHold | undefined {
  return (s.gates ?? []).find((gate) => gate.id === gateId)
}

export function routesOnGate(s: GameState, gateId: string): Route[] {
  return s.routes.filter((route) => route.gateOrigin === gateId || route.gateDest === gateId || route.gateVia === gateId)
}

export interface Span {
  start: number
  end: number
  label: string
}

export interface Filing {
  id?: string
  origin: string
  dest: string
  via?: string
  aircraftId: string
  frequency: Frequency
  departHour: number
}

function hourOf(value: number): number {
  return ((Math.round(value) % 24) + 24) % 24
}

function freqWeight(freq: Frequency): number {
  if (freq === 'daily') return 1
  if (freq === 'weekdays') return 0.65
  return 0.4
}

function clock(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export interface Motion {
  airport: string
  hour: number
  kind: 'departure' | 'arrival'
}

export function motionsFor(filing: Filing, typeId: string): { motions: Motion[]; spans: { airport: string; spans: Span[] }[]; round: boolean; turnMin: number } {
  const type = getType(typeId)
  const turn = turnaroundHours(type.category)
  const board = Math.min(0.4, turn * 0.5)
  const via = filing.via?.trim() ?? ''
  const spans: { airport: string; spans: Span[] }[] = []
  const addSpan = (airport: string, start: number, end: number, label: string) => {
    let row = spans.find((item) => item.airport === airport)
    if (!row) {
      row = { airport, spans: [] }
      spans.push(row)
    }
    row.spans.push({ start, end, label })
  }
  const motions: Motion[] = []
  const dep = filing.departHour
  if (via) {
    const b1 = blockHours(distanceNm(getAirport(filing.origin), getAirport(via)), type.cruiseSpeedKt)
    const b2 = blockHours(distanceNm(getAirport(via), getAirport(filing.dest)), type.cruiseSpeedKt)
    addSpan(filing.origin, dep - board, dep, 'departure')
    addSpan(via, dep + b1, dep + b1 + turn, 'turn')
    addSpan(filing.dest, dep + b1 + turn + b2, dep + b1 + turn + b2 + turn * 0.4, 'arrival')
    motions.push({ airport: filing.origin, hour: hourOf(dep), kind: 'departure' })
    motions.push({ airport: via, hour: hourOf(dep + b1), kind: 'arrival' })
    motions.push({ airport: via, hour: hourOf(dep + b1 + turn), kind: 'departure' })
    motions.push({ airport: filing.dest, hour: hourOf(dep + b1 + turn + b2), kind: 'arrival' })
    return { motions, spans, round: false, turnMin: turnaroundMin(type.category) }
  }
  const block = blockHours(distanceNm(getAirport(filing.origin), getAirport(filing.dest)), type.cruiseSpeedKt)
  const round = block * 2 + turn * 2 <= 14
  addSpan(filing.origin, dep - board, dep, 'departure')
  motions.push({ airport: filing.origin, hour: hourOf(dep), kind: 'departure' })
  if (round) {
    const arr = dep + block
    const back = arr + turn
    addSpan(filing.dest, arr, back, 'turn')
    addSpan(filing.origin, back + block, back + block + turn, 'return')
    motions.push({ airport: filing.dest, hour: hourOf(arr), kind: 'arrival' })
    motions.push({ airport: filing.dest, hour: hourOf(back), kind: 'departure' })
    motions.push({ airport: filing.origin, hour: hourOf(back + block), kind: 'arrival' })
  } else {
    addSpan(filing.dest, dep + block, dep + block + turn, 'arrival')
    motions.push({ airport: filing.dest, hour: hourOf(dep + block), kind: 'arrival' })
  }
  return { motions, spans, round, turnMin: turnaroundMin(type.category) }
}

function overlaps(a: Span, b: Span): boolean {
  const copies = (span: Span): Array<[number, number]> => [
    [span.start, span.end],
    [span.start - 24, span.end - 24],
    [span.start + 24, span.end + 24],
  ]
  for (const [start, end] of copies(a)) {
    if (start < b.end && b.start < end) return true
  }
  return false
}

export function hourCapacity(ap: Airport, hour: number, bonus: number): number {
  const pairs = Math.max(1, ap.playerSlots + bonus)
  const peak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)
  if (!peak) return Math.max(2, pairs)
  if (ap.congestion >= 0.82) return Math.max(1, Math.round(pairs * 0.45))
  if (ap.congestion >= 0.68) return Math.max(1, Math.round(pairs * 0.7))
  return pairs
}

function hourLoad(s: GameState, airportId: string, hour: number, ignoreId?: string): number {
  let used = 0
  for (const route of s.routes) {
    if (route.id === ignoreId) continue
    const ac = s.fleet.find((plane) => plane.id === route.aircraftId)
    if (!ac) continue
    const plan = motionsFor(route, ac.typeId)
    for (const motion of plan.motions) {
      if (motion.airport === airportId && motion.hour === hour) used += freqWeight(route.frequency)
    }
  }
  return used
}

function openHours(s: GameState, filing: Filing, typeId: string): number[] {
  const found: number[] = []
  for (let hour = 6; hour <= 21; hour++) {
    const plan = motionsFor({ ...filing, departHour: hour }, typeId)
    const weight = freqWeight(filing.frequency)
    const blocked = plan.motions.some((motion) => {
      const ap = getAirport(motion.airport)
      const cap = hourCapacity(ap, motion.hour, s.market.slotBonus[ap.id] ?? 0)
      return hourLoad(s, motion.airport, motion.hour, filing.id) + weight > cap + 0.001
    })
    if (!blocked) found.push(hour)
    if (found.length >= 4) break
  }
  return found
}

function slotMessage(s: GameState, filing: Filing, typeId: string): string | null {
  const plan = motionsFor(filing, typeId)
  const weight = freqWeight(filing.frequency)
  for (const motion of plan.motions) {
    const ap = getAirport(motion.airport)
    const cap = hourCapacity(ap, motion.hour, s.market.slotBonus[ap.id] ?? 0)
    if (hourLoad(s, motion.airport, motion.hour, filing.id) + weight <= cap + 0.001) continue
    const alts = openHours(s, filing, typeId)
    const lighter = filing.frequency === 'daily' ? 'weekdays' as const : filing.frequency === 'weekdays' ? '3weekly' as const : null
    let freqNote = 'A lighter frequency only helps when that schedule fits under the hour’s limit.'
    if (lighter) {
      const lighterPlan = motionsFor({ ...filing, frequency: lighter }, typeId)
      const lighterOk = lighterPlan.motions.every((item) => {
        const port = getAirport(item.airport)
        const limit = hourCapacity(port, item.hour, s.market.slotBonus[port.id] ?? 0)
        return hourLoad(s, item.airport, item.hour, filing.id) + freqWeight(lighter) <= limit + 0.001
      })
      if (lighterOk) freqNote = lighter === 'weekdays'
        ? 'Weekdays would fit in this hour. Daily does not.'
        : 'Monday, Wednesday, and Friday would fit in this hour.'
    }
    const when = alts.length ? `Open departure hours: ${alts.map(clock).join(', ')}.` : 'No other hour between 06:00 and 21:00 is open.'
    return `${ap.city} has no ${motion.kind} slot at ${clock(motion.hour)}. ${when} ${freqNote} You can also use another airport, or a different aircraft if that changes the arrival hour.`
  }
  return null
}

function gateSpans(s: GameState, airportId: string, gateId: string, ignoreId?: string): Span[] {
  const spans: Span[] = []
  for (const route of routesOnGate(s, gateId)) {
    if (route.id === ignoreId) continue
    const ac = s.fleet.find((plane) => plane.id === route.aircraftId)
    if (!ac) continue
    const group = motionsFor(route, ac.typeId).spans.find((item) => item.airport === airportId)
    if (group) spans.push(...group.spans)
  }
  return spans
}

export interface LeaseOffer {
  id: string
  airportId: string
  number: string
  terminal: string
  daily: number
  own: number
}

export interface Placement {
  ok: boolean
  error: string
  gateOrigin: string
  gateDest: string
  gateVia: string
  notes: string[]
  lease: LeaseOffer[]
}

function clashLabel(s: GameState, airportId: string, gateId: string, incoming: Span[]): string {
  const hit = routesOnGate(s, gateId).find((route) => {
    const ac = s.fleet.find((plane) => plane.id === route.aircraftId)
    if (!ac) return false
    const group = motionsFor(route, ac.typeId).spans.find((item) => item.airport === airportId)
    return !!group && group.spans.some((span) => incoming.some((next) => overlaps(span, next)))
  })
  if (!hit) return 'another flight'
  const plane = s.fleet.find((item) => item.id === hit.aircraftId)
  return `${plane?.tailNumber ?? 'an aircraft'} on ${hit.origin}–${hit.dest} at ${clock(hit.departHour ?? 8)}`
}

export function placeRoute(s: GameState, filing: Filing): Placement {
  const empty = { ok: false, error: '', gateOrigin: '', gateDest: '', gateVia: '', notes: [] as string[], lease: [] as LeaseOffer[] }
  const ac = s.fleet.find((plane) => plane.id === filing.aircraftId)
  if (!ac) return { ...empty, error: 'That aircraft cannot take a route.' }
  const plan = motionsFor(filing, ac.typeId)
  const slot = slotMessage(s, filing, ac.typeId)
  const notes = [
    plan.round
      ? `Turnaround is ${plan.turnMin} minutes. The same gate can take another flight once that window is clear.`
      : `Turnaround is ${plan.turnMin} minutes. There is not enough day left for a same-day return, so the aircraft overnights.`,
  ]
  if (slot) return { ...empty, error: slot, notes }
  const via = filing.via?.trim() ?? ''
  const wanted = [filing.origin, filing.dest, ...(via ? [via] : [])]
  const chosen: Record<string, string> = {}
  const lease: LeaseOffer[] = []
  for (const airportId of wanted) {
    const ap = getAirport(airportId)
    const stands = standsFor(ap, s.market.slotBonus[ap.id] ?? 0)
    const incoming = plan.spans.find((item) => item.airport === airportId)?.spans ?? []
    const held = stands.filter((stand) => stand.pool === 'player' && holdOf(s, stand.id))
    const free = held.find((stand) => {
      const busy = gateSpans(s, airportId, stand.id, filing.id)
      return !busy.some((span) => incoming.some((next) => overlaps(span, next)))
    })
    if (free) {
      chosen[airportId] = free.id
      continue
    }
    const offer = stands.find((stand) => stand.pool === 'player' && !holdOf(s, stand.id))
    if (!offer) {
      const blocker = held[0]
      const who = blocker ? clashLabel(s, airportId, blocker.id, incoming) : 'the bank'
      return {
        ...empty,
        notes,
        error: held.length
          ? `${ap.id} will not award another gate, and ${blocker?.number ?? 'your gate'} is already used by ${who}. Pick another time, or reduce the schedule so the turns do not overlap.`
          : `${ap.city} has no gate left in your slot award.`,
      }
    }
    lease.push({ id: offer.id, airportId: ap.id, number: offer.number, terminal: offer.terminal, daily: offer.leaseDaily, own: offer.ownPrice })
  }
  if (lease.length) {
    const line = lease.map((offer) => `${offer.number} at ${offer.airportId} (${money(offer.daily)}/day)`).join(', ')
    return { ...empty, notes, lease, error: `No free gate for this schedule. Lease or buy ${line} before the route can be filed.` }
  }
  return {
    ok: true,
    error: '',
    gateOrigin: chosen[filing.origin] ?? '',
    gateDest: chosen[filing.dest] ?? '',
    gateVia: via ? (chosen[via] ?? '') : '',
    notes,
    lease: [],
  }
}

export function takeGate(s: GameState, gateId: string, kind: 'owned' | 'leased', charge: boolean): string | null {
  const airportId = gateId.slice(0, gateId.lastIndexOf('-'))
  const ap = getAirport(airportId)
  const stand = standsFor(ap, s.market.slotBonus[ap.id] ?? 0).find((item) => item.id === gateId)
  if (!stand || stand.pool !== 'player') return 'That gate is not available to your airline.'
  if (holdOf(s, gateId)) return 'You already hold that gate.'
  if (!s.gates) s.gates = []
  if (kind === 'owned') {
    if (charge && s.finance.cash < stand.ownPrice) return `Buying ${stand.number} costs ${money(stand.ownPrice)}.`
    if (charge) {
      s.finance.cash -= stand.ownPrice
      s.finance.lifetimeExpenses += stand.ownPrice
    }
    s.gates.push({ id: stand.id, airportId: ap.id, kind: 'owned', daily: Math.round(stand.leaseDaily * 0.15) })
    return null
  }
  s.gates.push({ id: stand.id, airportId: ap.id, kind: 'leased', daily: stand.leaseDaily })
  return null
}

export function dropGate(s: GameState, gateId: string): string | null {
  if (routesOnGate(s, gateId).length) return 'Flights are still assigned to this gate. Close or move them first.'
  s.gates = (s.gates ?? []).filter((gate) => gate.id !== gateId)
  return null
}

export function utilization(s: GameState, airportId: string, gateId: string): number {
  let minutes = 0
  for (const route of routesOnGate(s, gateId)) {
    const ac = s.fleet.find((plane) => plane.id === route.aircraftId)
    if (!ac) continue
    const group = motionsFor(route, ac.typeId).spans.find((item) => item.airport === airportId)
    if (!group) continue
    for (const span of group.spans) minutes += Math.max(0, span.end - span.start) * 60
  }
  return Math.min(1, minutes / (16 * 60))
}

export interface GateRow {
  stand: Stand
  use: 'owned' | 'leased' | 'available' | 'other'
  occupied: boolean
  utilization: number
  flights: { label: string; tail: string; hour: string }[]
}

export function gateBoard(s: GameState, airportId: string): GateRow[] {
  const ap = getAirport(airportId)
  return standsFor(ap, s.market.slotBonus[ap.id] ?? 0).map((stand) => {
    const hold = holdOf(s, stand.id)
    const routes = routesOnGate(s, stand.id)
    return {
      stand,
      use: hold ? hold.kind : stand.pool === 'other' ? 'other' : 'available',
      occupied: routes.length > 0,
      utilization: utilization(s, airportId, stand.id),
      flights: routes.map((route) => {
        const plane = s.fleet.find((item) => item.id === route.aircraftId)
        return {
          label: route.via ? `${route.origin}–${route.via}–${route.dest}` : `${route.origin}–${route.dest}`,
          tail: plane?.tailNumber ?? 'Unassigned',
          hour: clock(route.departHour ?? 8),
        }
      }),
    }
  })
}

export function standGateSize(stand: Stand): GateSize {
  const gates = getAllAirportGates(stand.airportId)
  const matched = gates.find((g) => g.label === stand.number)
  if (matched?.size) return matched.size

  const num = Number.parseInt(stand.number.replace(/\D/g, ''), 10) || 1
  const term = stand.terminal
  if (term.includes('A') || term.includes('1') || term.includes('International')) {
    if (num <= 2) return 'Super'
    if (num <= 6) return 'Heavy'
    return 'Medium'
  }
  if (term.includes('B') || term.includes('2')) {
    if (num <= 3) return 'Heavy'
    if (num <= 9) return 'Medium'
    return 'Small'
  }
  return 'Small'
}

export function standCompatibleAircraft(size: GateSize): string {
  if (size === 'Super') return 'All (Super, Heavy, Medium, Small)'
  if (size === 'Heavy') return 'Widebody, Narrowbody, Regional'
  if (size === 'Medium') return 'Narrowbody & Regional'
  return 'Regional & Turboprop'
}

export function unassignGateRoutes(s: GameState, gateId: string): number {
  let count = 0
  for (const route of s.routes) {
    let touched = false
    if (route.gateOrigin === gateId) {
      route.gateOrigin = ''
      touched = true
    }
    if (route.gateDest === gateId) {
      route.gateDest = ''
      touched = true
    }
    if (route.gateVia === gateId) {
      route.gateVia = ''
      touched = true
    }
    if (touched) count += 1
  }
  return count
}

export function assignRouteToGate(s: GameState, routeId: string, gateId: string): string | null {
  const route = s.routes.find((r) => r.id === routeId)
  if (!route) return 'Route not found'
  const airportId = gateId.slice(0, gateId.lastIndexOf('-'))
  if (route.origin === airportId) {
    route.gateOrigin = gateId
    return null
  }
  if (route.dest === airportId) {
    route.gateDest = gateId
    return null
  }
  if (route.via === airportId) {
    route.gateVia = gateId
    return null
  }
  return `Route ${route.origin}–${route.dest} does not touch airport ${airportId}.`
}

export function bulkDropGates(s: GameState, gateIds: string[]): { count: number; dailySaved: number; refund: number } {
  let count = 0
  let dailySaved = 0
  let refund = 0
  const set = new Set(gateIds)
  for (const gateId of set) {
    const hold = holdOf(s, gateId)
    if (!hold) continue
    unassignGateRoutes(s, gateId)
    dailySaved += hold.daily
    count += 1
    if (hold.kind === 'owned') {
      const ap = getAirport(hold.airportId)
      const stand = standsFor(ap, s.market.slotBonus[ap.id] ?? 0).find((item) => item.id === gateId)
      const ref = Math.round((stand ? stand.ownPrice : ownPrice(ap)) * 0.6)
      refund += ref
      s.finance.cash += ref
      s.finance.lifetimeRevenue += ref
    }
  }
  s.gates = (s.gates ?? []).filter((g) => !set.has(g.id))
  return { count, dailySaved, refund }
}

export function migrateOps(s: GameState) {
  if (!s.gates) s.gates = []
  if (!s.meals) s.meals = []
  for (const route of s.routes) {
    if (route.departHour == null || route.departHour < 0 || route.departHour > 23) route.departHour = 8
    if (!route.economyMealId) route.economyMealId = mealIdForService(route.service)
    if (!route.cabinMealId) route.cabinMealId = 'meal-cabin'
    if (!mealById(route.economyMealId, s.meals)) route.economyMealId = 'meal-snack'
    if (route.gateVia == null) route.gateVia = ''
    if (route.gateOrigin && route.gateDest) continue
    const hours = [7, 10, 13, 16, 19, route.departHour]
    for (const hour of hours) {
      route.departHour = hour
      let placed = placeRoute(s, { ...route, via: route.via, departHour: hour })
      if (!placed.ok && placed.lease.length && !placed.error.includes('slot')) {
        for (const offer of placed.lease) takeGate(s, offer.id, 'leased', false)
        placed = placeRoute(s, { ...route, via: route.via, departHour: hour })
      }
      if (placed.ok) {
        route.gateOrigin = placed.gateOrigin
        route.gateDest = placed.gateDest
        route.gateVia = placed.gateVia
        break
      }
    }
  }
}
