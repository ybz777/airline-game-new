import { getType } from '../data/aircraft'
import { AIRPORTS, getAirport } from '../data/airports'
import type { AircraftType } from '../types'
import { blockHours, distanceNm } from './geo'

export interface RangeReport {
  publishedNm: number
  practicalNm: number
  distanceNm: number
  nonstop: boolean
}

export interface StopLeg {
  id: string
  city: string
  leg1Nm: number
  leg2Nm: number
  totalNm: number
  blockHours: number
  ok: boolean
}

function specOf(type: AircraftType) {
  return {
    publishedNm: type.publishedRangeNm ?? type.rangeNm,
    practicalNm: type.practicalRangeNm ?? Math.round(type.rangeNm * 0.85),
  }
}

/** Great-circle stage this airframe can still fly after reserves, winds, and payload. */
export function practicalRange(typeId: string, origin: string, dest: string): number {
  const type = getType(typeId)
  let range = specOf(type).practicalNm
  const a = getAirport(origin)
  const b = getAirport(dest)
  if ((a.hotHigh || b.hotHigh) && (type.era === 'classic' || type.era === 'aging')) range = Math.round(range * 0.9)
  return range
}

export function publishedRange(typeId: string): number {
  return specOf(getType(typeId)).publishedNm
}

export function assessNonstop(typeId: string, origin: string, dest: string): RangeReport {
  const distance = Math.round(distanceNm(getAirport(origin), getAirport(dest)))
  const practicalNm = practicalRange(typeId, origin, dest)
  return {
    publishedNm: publishedRange(typeId),
    practicalNm,
    distanceNm: distance,
    nonstop: origin !== dest && distance <= practicalNm,
  }
}

export function assessStop(typeId: string, origin: string, via: string, dest: string): StopLeg & { reason: string } {
  const a = getAirport(origin)
  const m = getAirport(via)
  const b = getAirport(dest)
  const type = getType(typeId)
  const leg1 = Math.round(distanceNm(a, m))
  const leg2 = Math.round(distanceNm(m, b))
  const p1 = practicalRange(typeId, origin, via)
  const p2 = practicalRange(typeId, via, dest)
  const runway = m.runwayFt >= type.minRunwayFt && a.runwayFt >= type.minRunwayFt && b.runwayFt >= type.minRunwayFt
  const ok = via !== origin && via !== dest && leg1 <= p1 && leg2 <= p2 && runway
  let reason = ''
  if (!ok) {
    if (leg1 > p1) reason = `${origin}–${via} is ${leg1.toLocaleString('en-US')} nm. Practical range is ${p1.toLocaleString('en-US')} nm.`
    else if (leg2 > p2) reason = `${via}–${dest} is ${leg2.toLocaleString('en-US')} nm. Practical range is ${p2.toLocaleString('en-US')} nm.`
    else if (!runway) reason = 'A runway on this routing is short for this aircraft.'
    else reason = 'Pick a different stop.'
  }
  return {
    id: via,
    city: m.city,
    leg1Nm: leg1,
    leg2Nm: leg2,
    totalNm: leg1 + leg2,
    blockHours: Math.round((blockHours(leg1, type.cruiseSpeedKt) + blockHours(leg2, type.cruiseSpeedKt)) * 10) / 10,
    ok,
    reason,
  }
}

export function stopoverChoices(typeId: string, origin: string, dest: string): StopLeg[] {
  const direct = distanceNm(getAirport(origin), getAirport(dest))
  const rows: StopLeg[] = []
  for (const ap of AIRPORTS) {
    if (ap.id === origin || ap.id === dest) continue
    const leg = assessStop(typeId, origin, ap.id, dest)
    if (!leg.ok) continue
    if (leg.totalNm > direct * 2.15 && leg.totalNm > direct + 1800) continue
    rows.push(leg)
  }
  rows.sort((a, b) => a.totalNm - b.totalNm)
  return rows.slice(0, 28)
}
