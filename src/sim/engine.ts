import { getType } from '../data/aircraft'
import { mealById } from '../data/meals'
import { SCENE, getAirport } from '../data/airports'
import type { DayReport, FlightResult, GameState, LegPlan, OwnedAircraft, Pilot } from '../types'
import {
  dailyFixed,
  effects,
  fliesOn,
  forecastLeg,
  reliabilityOf,
  repairCost,
} from './economy'
import { blockHours, distanceNm } from './geo'
import { turnaroundHours } from './gates'
import { endGame, rollEvent } from './eventsApply'
import { simulateRivals } from './rivals'
import { applySafetyEvent, cabinMinimum, investigationCost, normalizeSafety, recordOperation, rollFlightSafety } from './safety'
import { evolveMarket, nid, pushNews } from './setup'
import { calendar, clamp, formatDate, rand } from './util'

function bump(s: GameState, delta: Partial<GameState['reputation']>) {
  const r = s.reputation
  const keys = Object.keys(delta) as (keyof typeof r)[]
  for (const k of keys) r[k] = clamp(r[k] + (delta[k] ?? 0), 0, 100)
}

function breakdown(): Record<string, number> {
  return { tickets: 0, baggage: 0, cargo: 0, fuel: 0, airport: 0, maintenance: 0, catering: 0, lease: 0, loan: 0, insurance: 0, hq: 0, crew: 0, other: 0 }
}

function cancelFlight(s: GameState, ac: OwnedAircraft | undefined, origin: string, dest: string, note: string, kind: 'safety' | 'ops'): FlightResult {
  s.meta.flightSeq += 1
  const typeId = ac?.typeId ?? 'md-82'
  if (kind === 'safety') bump(s, { safety: 0.45, trust: 0.2, satisfaction: -0.35, reliability: -0.2 })
  else bump(s, { satisfaction: -1.1, reliability: -0.85, trust: -0.45, brand: -0.15 })
  return {
    id: nid(s, 'FL'),
    flightNo: `${s.airline.iata}${100 + (s.meta.flightSeq % 800)}`,
    origin, dest, aircraftId: ac?.id ?? '', typeId, tail: ac?.tailNumber ?? '—',
    pax: 0, seats: ac ? getType(ac.typeId).seatCapacity : 0, revenue: 0, cost: 420, profit: -420,
    delayMin: 0, status: 'cancelled', note, blockHours: 0, departFrac: 0.2,
  }
}

function takeCrew(s: GameState, typeId: string, used: Set<string>): Pilot[] | null {
  const pool = s.pilots.filter((p) => p.typeId === typeId && p.fatigue < 92 && !used.has(p.id)).sort((a, b) => a.fatigue - b.fatigue)
  if (pool.length < 2) return null
  used.add(pool[0].id)
  used.add(pool[1].id)
  return [pool[0], pool[1]]
}

function planLegs(ac: OwnedAircraft, origin: string, dest: string, hours: Map<string, number>): LegPlan[] {
  const type = getType(ac.typeId)
  const block = blockHours(distanceNm(getAirport(origin), getAirport(dest)), type.cruiseSpeedKt)
  const turn = turnaroundHours(type.category)
  const round = block * 2 + turn * 2 <= 14
  const legs: LegPlan[] = []
  let loc = ac.location
  let left = hours.get(ac.id) ?? 0
  const spend = (from: string, to: string, ferry: boolean, frac: number) => {
    const b = blockHours(distanceNm(getAirport(from), getAirport(to)), type.cruiseSpeedKt)
    if (left < b) return false
    left -= b + turn * 0.35
    legs.push({ origin: from, dest: to, ferry, departFrac: frac })
    loc = to
    return true
  }
  if (loc !== origin && loc !== dest) spend(loc, origin, true, 0.12)
  if (round && left >= block * 2) {
    const start = loc === dest ? dest : origin
    const mid = start === origin ? dest : origin
    if (spend(start, mid, false, 0.2)) spend(mid, start, false, 0.58)
  } else if (loc === origin) spend(origin, dest, false, 0.3)
  else if (loc === dest) spend(dest, origin, false, 0.3)
  hours.set(ac.id, left)
  return legs
}

function planRoute(ac: OwnedAircraft, route: GameState['routes'][number], hours: Map<string, number>): LegPlan[] {
  if (!route.via) return planLegs(ac, route.origin, route.dest, hours)
  const type = getType(ac.typeId)
  const turn = turnaroundHours(type.category)
  const legs: LegPlan[] = []
  let loc = ac.location
  let left = hours.get(ac.id) ?? 0
  let bound: 'out' | 'back' = route.bound === 'back' ? 'back' : 'out'
  const spend = (from: string, to: string, ferry: boolean, frac: number) => {
    const b = blockHours(distanceNm(getAirport(from), getAirport(to)), type.cruiseSpeedKt)
    if (left < b) return false
    left -= b + turn * 0.4
    legs.push({ origin: from, dest: to, ferry, departFrac: frac })
    loc = to
    return true
  }
  if (loc !== route.origin && loc !== route.dest && loc !== route.via) {
    spend(loc, route.origin, true, 0.12)
  }
  const nextHop = (place: string) => {
    if (bound === 'out') {
      if (place === route.origin) return route.via
      if (place === route.via) return route.dest
    } else {
      if (place === route.dest) return route.via
      if (place === route.via) return route.origin
    }
    return ''
  }
  for (let step = 0; step < 3; step++) {
    const to = nextHop(loc)
    if (!to) break
    if (!spend(loc, to, false, 0.22 + step * 0.22)) break
    if (loc === route.dest) bound = 'back'
    else if (loc === route.origin) bound = 'out'
  }
  hours.set(ac.id, left)
  return legs
}

function wear(ac: OwnedAircraft, meta: { rng: number }) {
  const n = 0.04 + rand(meta) * 0.03
  ac.condition.airframe = clamp(ac.condition.airframe - n * 0.6, 4, 100)
  ac.condition.engine1 = clamp(ac.condition.engine1 - n, 4, 100)
  ac.condition.engine2 = clamp(ac.condition.engine2 - n * 0.92, 4, 100)
  ac.condition.landingGear = clamp(ac.condition.landingGear - n * 0.45, 4, 100)
  ac.condition.cabin = clamp(ac.condition.cabin - n * 0.25, 4, 100)
  ac.condition.interior = clamp(ac.condition.interior - n * 0.2, 4, 100)
}

function maybeFault(s: GameState, ac: OwnedAircraft) {
  const type = getType(ac.typeId)
  const systems = ['engine1', 'engine2', 'airframe', 'avionics', 'landingGear'] as const
  for (const system of systems) {
    const value = ac.condition[system]
    if (s.faults.some((f) => f.aircraftId === ac.id && f.system === system)) continue
    const critical = value < 32 && rand(s.meta) < 0.045
    const serious = value < 48 && rand(s.meta) < 0.03
    if (!critical && !serious) continue
    s.faults.push({
      id: nid(s, 'F'),
      aircraftId: ac.id,
      system,
      severity: critical ? 'critical' : 'serious',
      title: `${system} defect — ${ac.tailNumber}`,
      detail: critical
        ? 'This is no longer a watch item. Flying it is a safety decision.'
        : 'The aircraft can be dispatched, but the margin is getting thin.',
      repairCost: repairCost(ac.typeId, system, value) || Math.round(type.checkCost * 0.25),
      groundDays: critical ? 3 : 2,
      day: s.meta.day,
    })
    return
  }
}

export function criticalFaultForToday(s: GameState) {
  const cal = calendar(s.meta.day)
  for (const f of s.faults) {
    if (f.severity !== 'critical') continue
    const ac = s.fleet.find((a) => a.id === f.aircraftId)
    if (!ac || ac.status === 'maintenance' || ac.status === 'stored' || ac.holdToday || ac.status === 'lost') continue
    if (s.routes.some((r) => r.aircraftId === ac.id && fliesOn(r.frequency, cal.dow))) return f
  }
  return null
}

export function simulateDay(prev: GameState): { state: GameState; report: DayReport } {
  const s = structuredClone(prev) as GameState
  normalizeSafety(s)
  const cal = calendar(s.meta.day)
  const eff = effects(s)
  const flights: FlightResult[] = []
  const money = breakdown()
  const headlines: string[] = []
  const hours = new Map<string, number>()
  for (const ac of s.fleet) if (ac.status !== 'lost') hours.set(ac.id, ac.status === 'stored' ? 0 : 13.2)

  for (const ac of s.fleet) {
    if (ac.maintenanceDaysLeft > 0) {
      ac.maintenanceDaysLeft -= 1
      if (ac.maintenanceDaysLeft <= 0 && ac.status === 'maintenance') ac.status = 'idle'
    }
  }

  const usedPilots = new Set<string>()
  let cabinLeft = s.cabinCrew ?? 0
  for (const route of s.routes) {
    if (!fliesOn(route.frequency, cal.dow)) continue
    const ac = s.fleet.find((a) => a.id === route.aircraftId)
    const type = ac ? getType(ac.typeId) : undefined
    const grounded = type ? s.market.groundedFamilies.find((g) => g.family === type.family && g.untilDay > s.meta.day) : undefined
    if (!ac || ac.status === 'lost' || ac.status === 'stored' || ac.status === 'maintenance' || ac.holdToday || grounded) {
      const kind = ac?.holdToday || grounded || ac?.status === 'maintenance' ? 'safety' : 'ops'
      const note = !ac ? 'No aircraft assigned.' : ac.holdToday ? 'Cancelled for a safety hold.' : grounded ? grounded.reason : ac.status === 'maintenance' ? 'Aircraft in maintenance.' : 'Aircraft stored.'
      const row = cancelFlight(s, ac, route.origin, route.dest, note, kind)
      flights.push(row)
      s.finance.cash -= 420
      money.other += 420
      continue
    }
    const closed = s.market.closedAirports.find((c) => (c.id === route.origin || c.id === route.dest) && c.untilDay > s.meta.day && rand(s.meta) < 0.55)
    if (closed) {
      const row = cancelFlight(s, ac, route.origin, route.dest, closed.reason, 'ops')
      flights.push(row)
      s.finance.cash -= 420
      money.other += 420
      continue
    }
    const cabinNeed = type ? cabinMinimum(type.seatCapacity) : 1
    if (cabinLeft < cabinNeed) {
      const row = cancelFlight(s, ac, route.origin, route.dest, 'Cabin crew is below the legal minimum for this aircraft.', 'ops')
      flights.push(row)
      s.finance.cash -= 420
      money.other += 420
      continue
    }
    cabinLeft -= cabinNeed
    const crew = takeCrew(s, ac.typeId, usedPilots)
    if (!crew) {
      cabinLeft += cabinNeed
      const row = cancelFlight(s, ac, route.origin, route.dest, 'Not enough rested, type-rated pilots.', 'ops')
      flights.push(row)
      s.finance.cash -= 420
      money.other += 420
      continue
    }
    const legs = planRoute(ac, route, hours)
    if (!legs.length) {
      usedPilots.delete(crew[0].id)
      usedPilots.delete(crew[1].id)
      cabinLeft += cabinNeed
      const row = cancelFlight(s, ac, route.origin, route.dest, 'Crew duty day is already used.', 'ops')
      flights.push(row)
      continue
    }
    let duty = 0
    for (const leg of legs) {
      if (ac.location !== leg.origin) break
      const result = flyLeg(s, ac, route, leg, crew, money, headlines)
      flights.push(result)
      duty += result.blockHours
      if (route.via && ac.location === leg.dest && result.status !== 'cancelled' && result.status !== 'incident') {
        if (ac.location === route.dest) route.bound = 'back'
        else if (ac.location === route.origin) route.bound = 'out'
      }
      if (result.status === 'cancelled' || result.status === 'incident' || ac.maintenanceDaysLeft > 0) break
    }
    if (duty > 0.2) {
      for (const p of crew) p.fatigue = clamp(p.fatigue + 12 + duty, 0, 100)
    }
  }

  for (const ac of s.fleet) ac.holdToday = false
  for (const p of s.pilots) if (!usedPilots.has(p.id)) p.fatigue = clamp(p.fatigue - 11, 0, 100)

  const fixed = dailyFixed(s, eff)
  s.finance.cash -= fixed.total
  money.hq += fixed.hq
  money.insurance += fixed.insurance
  money.airport += fixed.gates
  s.finance.lifetimeExpenses += fixed.total
  const inquiry = investigationCost(s)
  if (inquiry > 0) {
    s.finance.cash -= inquiry
    money.other += inquiry
    s.finance.lifetimeExpenses += inquiry
  }
  if ((s.meta.insuranceLoad ?? 1) > 1) s.meta.insuranceLoad = Math.max(1, s.meta.insuranceLoad - 0.0012)

  if (cal.day === 1 && s.meta.day > 0) runMonth(s, eff.salary, money, headlines)

  for (const ac of s.fleet) {
    if (ac.status === 'stored') {
      ac.condition.engine1 = clamp(ac.condition.engine1 - 0.02, 4, 100)
      ac.condition.cabin = clamp(ac.condition.cabin - 0.03, 4, 100)
    }
  }

  simulateRivals(s, headlines)
  driftMarket(s)
  if (s.finance.cash < 350_000 && s.finance.cash >= 0) headlines.push('Cash is thin. A bad week can put the airline in default.')
  if (s.finance.cash < 0) headlines.push('The account is overdrawn.')

  if (s.meta.profitShare > 0 && s.meta.profitShareUntil > s.meta.day) {
    const pre = money.tickets + money.baggage + money.cargo - (money.fuel + money.airport + money.maintenance + money.catering + money.lease + money.loan + money.insurance + money.hq + money.crew + money.other)
    if (pre > 0) {
      const skim = pre * s.meta.profitShare
      s.finance.cash -= skim
      money.other += skim
      headlines.push('Rescue lenders skimmed a share of today’s profit.')
    }
  }
  const revenue = money.tickets + money.baggage + money.cargo
  const expenses = money.fuel + money.airport + money.maintenance + money.catering + money.lease + money.loan + money.insurance + money.hq + money.crew + money.other
  const profit = revenue - expenses

  const report: DayReport = {
    day: s.meta.day,
    dateLabel: formatDate(s.meta.day),
    flights,
    revenue,
    expenses,
    profit,
    pax: flights.reduce((a, f) => a + f.pax, 0),
    breakdown: money,
    headlines,
  }
  s.lastReport = report
  s.reports.unshift(report)
  s.reports = s.reports.slice(0, 24)
  s.history.push({ day: s.meta.day, cash: s.finance.cash, profit, pax: report.pax, fuel: eff.fuel })
  s.history = s.history.slice(-120)
  s.reputation.brand = clamp(s.reputation.brand + (overallish(s) - s.reputation.brand) * 0.01, 0, 100)

  if (!s.meta.gameOver) solvency(s, headlines, report)
  if (!s.meta.gameOver) rollEvent(s)
  s.modifiers = s.modifiers.filter((m) => m.untilDay > s.meta.day)
  s.market.weather = s.market.weather.filter((w) => w.untilDay > s.meta.day)
  s.market.closedAirports = s.market.closedAirports.filter((c) => c.untilDay > s.meta.day)
  s.market.groundedFamilies = s.market.groundedFamilies.filter((g) => g.untilDay > s.meta.day)
  s.meta.day += 1
  return { state: s, report }
}

function overallish(s: GameState): number {
  const r = s.reputation
  return (r.satisfaction + r.reliability + r.safety + r.service + r.trust) / 5
}

function flyLeg(
  s: GameState,
  ac: OwnedAircraft,
  route: GameState['routes'][number],
  leg: LegPlan,
  crew: Pilot[],
  money: Record<string, number>,
  headlines: string[],
): FlightResult {
  const type = getType(ac.typeId)
  s.meta.flightSeq += 1
  const flightNo = `${s.airline.iata}${100 + (s.meta.flightSeq % 800)}`
  const base: FlightResult = {
    id: nid(s, 'FL'), flightNo, origin: leg.origin, dest: leg.dest, aircraftId: ac.id, typeId: ac.typeId,
    tail: ac.tailNumber, pax: 0, seats: type.seatCapacity, revenue: 0, cost: 0, profit: 0, delayMin: 0,
    status: 'arrived', note: '', blockHours: 0, departFrac: leg.departFrac,
  }
  if (leg.ferry) {
    const dist = distanceNm(getAirport(leg.origin), getAirport(leg.dest))
    const block = blockHours(dist, type.cruiseSpeedKt)
    const gallons = block * type.fuelBurnGph * 1.12
    const fuel = gallons * 2.72 * effects(s).fuel
    s.finance.cash -= fuel + 900
    money.fuel += fuel
    money.other += 900
    s.finance.lifetimeExpenses += fuel + 900
    ac.flightHours += block
    ac.location = leg.dest
    base.blockHours = block
    base.cost = fuel + 900
    base.profit = -base.cost
    base.note = 'Positioning ferry. No passengers.'
    base.seats = 0
    const ferrySafety = rollFlightSafety(s, ac, crew, { weather: 0, pax: 0, seats: 0, ferry: true })
    if (ferrySafety) {
      applySafetyEvent(s, ac, crew, ferrySafety, base, money, headlines)
      if (ferrySafety.stop) return base
      base.note = `${ferrySafety.flightNote} Positioning ferry. No passengers.`
    }
    return base
  }

  if (route.via && leg.origin === route.via) {
    const dist = distanceNm(getAirport(leg.origin), getAirport(leg.dest))
    const block = blockHours(dist, type.cruiseSpeedKt)
    const gallons = block * type.fuelBurnGph * 1.12
    const fuel = gallons * 2.72 * effects(s).fuel
    const fee = 1600
    const hopSafety = rollFlightSafety(s, ac, crew, { weather: 0, pax: 0, seats: type.seatCapacity, ferry: false })
    if (hopSafety?.stop) {
      base.blockHours = block
      base.seats = type.seatCapacity
      return applySafetyEvent(s, ac, crew, hopSafety, base, money, headlines)
    }
    s.finance.cash -= fuel + fee
    money.fuel += fuel
    money.airport += fee
    s.finance.lifetimeExpenses += fuel + fee
    ac.flightHours += block
    ac.cycles += 1
    ac.location = leg.dest
    wear(ac, s.meta)
    recordOperation(ac, s, Math.max(0, calendar(s.meta.day).year - ac.yearBuilt))
    base.blockHours = block
    base.cost = fuel + fee
    base.profit = -(fuel + fee)
    base.note = `Stopover sector ${leg.origin}–${leg.dest}. The ticket was already sold. This leg adds fuel, a landing, and handling.`
    if (hopSafety) {
      applySafetyEvent(s, ac, crew, hopSafety, base, money, headlines)
      base.note = `${hopSafety.flightNote} ${base.note}`
    }
    return base
  }

  const forecast = forecastLeg(s, {
    origin: route.via ? route.origin : leg.origin,
    dest: route.via ? route.dest : leg.dest,
    typeId: ac.typeId, price: route.price, service: route.service,
    baggageFee: route.baggageFee, cabinLayout: route.cabinLayout, frequency: route.frequency, condition: ac.condition,
    economyMealId: route.economyMealId, cabinMealId: route.cabinMealId,
    skipRange: !!route.via,
  })
  const zoneO = getAirport(leg.origin).weatherZone
  const zoneD = getAirport(leg.dest).weatherZone
  const weather = s.market.weather.filter((w) => w.untilDay > s.meta.day && (w.zone === zoneO || w.zone === zoneD))
  const severity = weather.reduce((m, w) => Math.max(m, w.severity), 0)
  const rel = reliabilityOf(type.reliability, ac.condition)
  const ageYears = Math.max(0, calendar(s.meta.day).year - ac.yearBuilt)
  const openFaults = s.faults.filter((f) => f.aircraftId === ac.id)
  let pCancel = 0.008 + (100 - rel) / 1400
  if (ageYears > 22) pCancel *= 1 + Math.min(0.4, (ageYears - 22) / 70)
  if ((ac.neglect ?? 0) > 0) pCancel *= 1 + Math.min(1.8, ac.neglect / 50)
  if (openFaults.some((f) => f.severity === 'critical')) pCancel *= 1.45
  if (ac.ignoredFault) pCancel *= 1.25
  pCancel = Math.min(0.1, pCancel)
  if (severity > 0.8) pCancel += 0.12
  const fatigue = (crew[0].fatigue + crew[1].fatigue) / 2
  if (fatigue > 72) pCancel += (fatigue - 72) / 900

  if (rand(s.meta) < pCancel) {
    const knownDefect = ac.ignoredFault || rel < 45 || (ac.neglect ?? 0) >= 40
    const row = cancelFlight(s, ac, leg.origin, leg.dest, knownDefect ? 'Mechanical cancellation. The defect was already known.' : severity > 0.5 ? 'Weather cancellation.' : 'Mechanical fault found at the gate.', knownDefect ? 'safety' : 'ops')
    row.flightNo = flightNo
    row.departFrac = leg.departFrac
    const bill = 1800
    s.finance.cash -= bill
    money.other += bill
    s.finance.lifetimeExpenses += bill
    if (knownDefect) ac.condition.engine1 = clamp(ac.condition.engine1 - 1.5, 4, 100)
    return row
  }

  const safety = rollFlightSafety(s, ac, crew, {
    weather: severity, pax: Math.round(forecast.paxPerLeg), seats: forecast.seats, ferry: false,
  })
  if (safety?.stop) {
    base.pax = Math.round(forecast.paxPerLeg)
    base.seats = forecast.seats
    base.blockHours = forecast.blockHours
    recordOperation(ac, s, ageYears)
    return applySafetyEvent(s, ac, crew, safety, base, money, headlines)
  }
  if (safety) applySafetyEvent(s, ac, crew, safety, base, money, headlines)

  const noise = 0.9 + rand(s.meta) * 0.16
  let pax = Math.min(forecast.seats, Math.max(0, Math.round(forecast.paxPerLeg * noise * (severity > 0.6 ? 0.9 : 1))))
  if (route.via) pax = Math.round(pax * 0.8)
  const soldRatio = forecast.paxPerLeg > 0 ? pax / forecast.paxPerLeg : (pax > 0 ? 1 : 0)
  let rev = forecast.revenue * soldRatio
  let subsidy = 0
  if (s.modifiers.some((m) => m.id === 'subsidy' && m.untilDay > s.meta.day) && forecast.distanceNm < 550) subsidy = 18_000
  let fuel = forecast.fuel
  let airport = forecast.airportFees
  let maint = forecast.maintenance
  let flownBlock = forecast.blockHours
  if (route.via) {
    const hopDist = distanceNm(getAirport(leg.origin), getAirport(leg.dest))
    flownBlock = blockHours(hopDist, type.cruiseSpeedKt)
    const share = hopDist / Math.max(1, forecast.distanceNm)
    fuel = flownBlock * type.fuelBurnGph * 1.12 * 2.72 * effects(s).fuel
    airport = forecast.airportFees * share + 1100
    maint = forecast.maintenance * share
  }
  const catering = forecast.catering * soldRatio
  let delay = 0
  if (severity > 0.3 && rand(s.meta) < 0.55 + severity * 0.3) delay += Math.round(20 + severity * 80)
  if (rel < 70 && rand(s.meta) < 0.18) delay += rand(s.meta) < 0.5 ? 25 : 55
  if (fatigue > 60 && rand(s.meta) < 0.2) delay += 20
  if (getAirport(leg.origin).size === 'hub' && rand(s.meta) < 0.12) delay += 18
  const diverted = severity > 0.82 && rand(s.meta) < 0.07
  if (diverted) {
    rev *= 0.72
    delay += 90
  }
  if (delay > 120) rev *= 0.94
  const status = diverted ? 'diverted' : delay >= 15 ? 'delayed' : 'arrived'
  const share = forecast.revenue > 1 ? forecast.revenue : 1
  const netRevenue = rev + subsidy
  const extra = diverted ? 6500 : 0
  const netCost = fuel + airport + maint + catering + extra
  const profit = netRevenue - netCost
  s.finance.cash += profit
  s.finance.lifetimeRevenue += netRevenue
  s.finance.lifetimeExpenses += netCost
  money.tickets += rev * Math.max(0, forecast.revenue - forecast.baggage - forecast.cargo) / share
  money.baggage += rev * forecast.baggage / share
  money.cargo += rev * forecast.cargo / share + subsidy
  money.fuel += fuel
  money.airport += airport
  money.maintenance += maint
  money.catering += catering
  if (extra) money.other += extra
  ac.location = diverted ? s.airline.home : leg.dest

  ac.flightHours += flownBlock
  ac.cycles += 1
  ac.totalRevenue += netRevenue
  recordOperation(ac, s, ageYears)
  wear(ac, s.meta)
  maybeFault(s, ac)

  if (delay < 15) bump(s, { reliability: 0.05, satisfaction: 0.04 })
  else if (delay > 60) bump(s, { reliability: -0.28, satisfaction: -0.32 })
  else bump(s, { satisfaction: -0.08 })
  if (forecast.loadFactor > 0.8 && profit > 0) bump(s, { brand: 0.03 })
  if (route.service === 'none' && forecast.distanceNm > 900) bump(s, { service: -0.04, satisfaction: -0.03 })
  else if (route.service === 'meal' || route.service === 'premium') bump(s, { service: 0.04 })
  if (route.economyMealId) {
    const meal = mealById(route.economyMealId, s.meals)
    const cabin = route.cabinLayout === 'two-class' ? mealById(route.cabinMealId || 'meal-cabin', s.meals) : null
    bump(s, { satisfaction: meal.satisfaction * 0.35 + (cabin ? cabin.satisfaction * 0.2 : 0), service: meal.satisfaction * 0.25 })
  }
  const priceRep = route.price < (forecast.competitorPrice ?? route.price) ? 0.04 : -0.01
  bump(s, { price: priceRep })

  base.pax = pax
  base.seats = forecast.seats
  base.revenue = netRevenue
  base.cost = netCost + (safety && !safety.stop ? safety.cost : 0)
  base.profit = profit - (safety && !safety.stop ? safety.cost : 0)
  base.delayMin = delay + (safety && !safety.stop ? safety.delayMin : 0)
  base.status = status
  base.blockHours = flownBlock
  const flown = diverted
    ? 'Diverted. Passengers were accommodated later. The extra cost is on you.'
    : delay > 0
      ? `${delay} minutes late. ${pax} passengers, load ${Math.round((pax / Math.max(1, forecast.seats)) * 100)}%.`
      : `${pax} passengers boarded. Load ${Math.round((pax / Math.max(1, forecast.seats)) * 100)}%.`
  const viaNote = route.via ? `One-stop via ${route.via}. ` : ''
  base.note = safety && !safety.stop ? `${safety.flightNote} ${viaNote}${flown}` : `${viaNote}${flown}`
  return base
}

function runMonth(s: GameState, salaryMul: number, money: Record<string, number>, headlines: string[]) {
  const payroll = s.pilots.reduce((a, p) => a + p.salaryMonthly, 0) * salaryMul
  payOrMiss(s, payroll, 'crew payroll', money, 'crew', headlines)
  const cabinPay = (s.cabinCrew ?? 0) * 3600 * salaryMul
  payOrMiss(s, cabinPay, 'cabin payroll', money, 'crew', headlines)
  for (const ac of s.fleet) {
    if (ac.ownership !== 'leased' || ac.status === 'lost') continue
    payOrMiss(s, ac.leaseMonthly, `lease ${ac.tailNumber}`, money, 'lease', headlines)
    ac.leaseMonthsLeft -= 1
    if (ac.leaseMonthsLeft <= 0) {
      ac.leaseMonthsLeft = 12
      headlines.push(`Lease on ${ac.tailNumber} rolled for another year.`)
    }
  }
  for (const loan of s.loans) {
    if (loan.balance <= 1) continue
    if (loan.kind === 'bullet' && s.meta.day >= loan.maturityDay) {
      if (s.finance.cash >= loan.balance) {
        s.finance.cash -= loan.balance
        money.loan += loan.balance
        s.finance.lifetimeExpenses += loan.balance
        loan.balance = 0
        headlines.push(`${loan.name} was paid at maturity.`)
      } else {
        endGame(s, `${loan.name} matured and the airline could not pay ${Math.round(loan.balance).toLocaleString('en-US')}.`, SCENE.recession)
        return
      }
      continue
    }
    const due = loan.kind === 'bullet' ? loan.balance * loan.rate / 12 : loan.payment
    if (payOrMiss(s, due, loan.name, money, 'loan', headlines)) {
      if (loan.kind === 'amortizing') {
        const interest = loan.balance * loan.rate / 12
        loan.balance = Math.max(0, loan.balance - (due - interest))
      }
      loan.monthsLeft = Math.max(0, loan.monthsLeft - 1)
    }
  }
  if (s.finance.overdue === 0 && s.finance.cash > 2_500_000) {
    const order: GameState['finance']['credit'][] = ['Poor', 'Fair', 'Good', 'Strong']
    const idx = order.indexOf(s.finance.credit)
    if (idx < order.length - 1 && s.reputation.safety > 30) s.finance.credit = order[idx + 1]
  }
}

function payOrMiss(s: GameState, amount: number, label: string, money: Record<string, number>, bucket: string, headlines: string[]): boolean {
  if (amount <= 0) return true
  if (s.finance.cash >= amount) {
    s.finance.cash -= amount
    money[bucket] += amount
    s.finance.lifetimeExpenses += amount
    return true
  }
  s.finance.overdue += 1
  s.finance.credit = 'Poor'
  headlines.push(`Missed ${label}. Overdue payments: ${s.finance.overdue}.`)
  pushNews(s, `Payment missed: ${label}`, 'Creditors are now counting. Three misses and the airline is finished.', SCENE.news, 'Finance')
  return false
}

function driftMarket(s: GameState) {
  evolveMarket(s)
  if (s.meta.day < 7 || s.meta.day % 7 !== 0) return
  s.market.fuelIndex = clamp(s.market.fuelIndex * (0.985 + rand(s.meta) * 0.03), 0.62, 1.85)
}

function solvency(s: GameState, headlines: string[], report: DayReport) {
  if (s.meta.gameOver) return
  if (s.finance.overdue >= 3) {
    endGame(s, 'Three payment cycles were missed. Creditors put the airline into bankruptcy.', SCENE.recession)
    return
  }
  if (s.finance.cash < -5_000_000) {
    endGame(s, 'Cash collapsed and no one would lend into the hole.', SCENE.recession)
    return
  }
  const bullet = s.loans.find((l) => l.kind === 'bullet' && l.balance > 1000 && l.maturityDay <= s.meta.day)
  if (bullet && s.finance.cash < bullet.balance) {
    endGame(s, `${bullet.name} came due. The balance could not be paid.`, SCENE.recession)
    return
  }
  if (report.profit < -80_000) headlines.push('Today lost serious money.')
}
