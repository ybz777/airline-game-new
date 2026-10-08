import { getType } from '../data/aircraft'
import { SCENE } from '../data/airports'
import type { AccidentRecord, AccidentSeverity, Condition, ConditionKey, FlightResult, GameState, OwnedAircraft, Pilot, Reputation } from '../types'
import { nextCredit, reliabilityOf } from './economy'
import { endGame } from './eventsApply'
import { pushNews } from './setup'
import { calendar, clamp, formatDate, rand, randInt } from './util'

/**
 * Rates are anchored to commercial flying, not to an arcade timer.
 * Modern jets are on the order of one serious accident per several million flights.
 * A neglected older airframe can be many times worse and still go years between accidents.
 * Fatigue and short staffing change the odds. They do not schedule a crash.
 */

export type SafetyKind = 'bird' | 'mechanical' | 'cargo' | 'weather' | 'crew' | 'maintenance'
export type SafetySeverity = 'note' | 'minor' | 'serious' | 'major' | 'catastrophic'

export interface SafetyEvent {
  kind: SafetyKind
  severity: SafetySeverity
  title: string
  flightNote: string
  headline: string
  body: string
  cost: number
  delayMin: number
  groundDays: number
  hull: boolean
  fatalities: number
  injured: number
  condition: Partial<Condition>
  rep: Partial<Reputation>
  demandMul?: number
  demandDays?: number
  insuranceAdd: number
  investigationDays: number
  removeCrew: boolean
  stop: boolean
}

export function cabinMinimum(seats: number): number {
  return Math.max(1, Math.ceil(seats / 50))
}

export function cabinRequired(s: GameState): number {
  let n = 0
  for (const route of s.routes) {
    const ac = s.fleet.find((a) => a.id === route.aircraftId)
    if (!ac || ac.status === 'lost' || ac.status === 'stored') continue
    n += cabinMinimum(getType(ac.typeId).seatCapacity)
  }
  return n
}

export function neglectCopy(neglect: number, age: number): string {
  if (neglect < 8) return ''
  if (neglect < 28) {
    return age >= 25
      ? 'Maintenance has been deferred. On an airframe this old, that stays on the risk record.'
      : 'Maintenance has been deferred. The aircraft can still be flown. The margin is thinner.'
  }
  if (neglect < 55) {
    return 'Repeated deferrals are now part of the safety case. Accidents remain uncommon. They are less remote than they were.'
  }
  return 'This aircraft is being flown against its maintenance record. A serious event is still not likely on any given day, and it is no longer implausible.'
}

export function acceptRisk(ac: OwnedAircraft, ageYears: number, kind: 'defer' | 'dispatch' | 'bulletin') {
  const ageW = 1 + Math.max(0, ageYears - 20) / 26
  const add = kind === 'dispatch' ? 15 : kind === 'bulletin' ? 22 : 8
  ac.neglect = clamp((ac.neglect ?? 0) + add * ageW, 0, 100)
  ac.ignoredFault = true
}

export function clearRisk(ac: OwnedAircraft, kind: 'repair' | 'check') {
  ac.neglect = clamp((ac.neglect ?? 0) - (kind === 'check' ? 62 : 32), 0, 100)
  ac.ignoredFault = false
}

export function recordOperation(ac: OwnedAircraft, s: GameState, ageYears: number) {
  const open = s.faults.filter((f) => f.aircraftId === ac.id)
  const critical = open.some((f) => f.severity === 'critical')
  const ageW = 1 + Math.max(0, ageYears - 20) / 28
  if (critical) ac.neglect = clamp((ac.neglect ?? 0) + 2.4 * ageW, 0, 100)
  else ac.neglect = clamp((ac.neglect ?? 0) - 0.045, 0, 100)
  if ((ac.neglect ?? 0) < 3 && !critical) ac.ignoredFault = false
}

export function normalizeSafety(s: GameState) {
  if (s.cabinCrew == null || Number.isNaN(s.cabinCrew)) s.cabinCrew = 0
  if (s.meta.insuranceLoad == null || Number.isNaN(s.meta.insuranceLoad)) s.meta.insuranceLoad = 1
  if (s.meta.investigationUntil == null) s.meta.investigationUntil = 0
  if (!s.eventQueue) s.eventQueue = []
  if (!s.accidentLog) s.accidentLog = []
  for (const ac of s.fleet) {
    if (ac.neglect == null || Number.isNaN(ac.neglect)) ac.neglect = ac.ignoredFault ? 12 : 0
    if (!ac.serviceLog) ac.serviceLog = []
  }
}

function ageFactor(age: number): number {
  if (age <= 12) return 1
  if (age <= 25) return 1 + (age - 12) * 0.025
  return Math.min(3.2, 1.33 + (age - 25) * 0.055)
}

function conditionFactor(rel: number): number {
  const gap = Math.max(0, 88 - rel)
  return 1 + Math.pow(gap / 18, 1.35)
}

function neglectFactor(neglect: number, age: number): number {
  const ageW = 1 + Math.max(0, age - 18) / 40
  return 1 + (Math.max(0, neglect) / 28) * ageW
}

function skillOf(crew: Pilot[]): number {
  if (!crew.length) return 0.55
  const scores = crew.map((p) => clamp(p.hours / 14000 * 0.45 + p.training / 100 * 0.35 + p.reliability / 100 * 0.2, 0.35, 0.98))
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function handlingFactor(fatigue: number, skill: number, pilotCount: number, cabinCrew: number, cabinNeed: number): number {
  let fatigueMul = 1
  if (fatigue > 45) {
    const t = Math.min(1, (fatigue - 45) / 55)
    fatigueMul = 1 + t * t * 1.05
  }
  const skillMul = clamp(1.12 - (skill - 0.55) * 0.65, 0.78, 1.4)
  let staff = 1
  if (pilotCount < 4) staff += (4 - Math.max(2, pilotCount)) * 0.06
  if (cabinNeed > 0 && cabinCrew >= cabinNeed) {
    const spare = cabinCrew / cabinNeed
    if (spare < 2) staff += (2 - spare) * 0.16
  }
  return clamp(fatigueMul * skillMul * staff, 0.7, 2.4)
}

function pickWeighted(meta: { rng: number }, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rand(meta) * total
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return i
  }
  return weights.length - 1
}

const RANK: SafetySeverity[] = ['note', 'minor', 'serious', 'major', 'catastrophic']

function worse(a: SafetyEvent | null, b: SafetyEvent | null): SafetyEvent | null {
  if (!a) return b
  if (!b) return a
  return RANK.indexOf(b.severity) > RANK.indexOf(a.severity) ? b : a
}

export function rollFlightSafety(
  s: GameState,
  ac: OwnedAircraft,
  crew: Pilot[],
  opts: { weather: number; pax: number; seats: number; ferry: boolean },
): SafetyEvent | null {
  normalizeSafety(s)
  const type = getType(ac.typeId)
  const age = Math.max(0, calendar(s.meta.day).year - ac.yearBuilt)
  const rel = reliabilityOf(type.reliability, ac.condition)
  const neglect = ac.neglect ?? 0
  const fatigue = crew.length ? crew.reduce((a, p) => a + p.fatigue, 0) / crew.length : 40
  const skill = skillOf(crew)
  const pilots = s.pilots.filter((p) => p.typeId === ac.typeId).length
  const need = cabinMinimum(type.seatCapacity)
  const handling = handlingFactor(fatigue, skill, pilots, s.cabinCrew, need)
  const open = s.faults.filter((f) => f.aircraftId === ac.id)
  const critical = open.some((f) => f.severity === 'critical') || ac.ignoredFault
  let faultMul = 1
  if (open.some((f) => f.severity === 'critical')) faultMul *= 2.2
  else if (open.some((f) => f.severity === 'serious')) faultMul *= 1.35
  if (ac.ignoredFault) faultMul *= 1.45
  const machine = Math.min(22, ageFactor(age) * conditionFactor(rel) * neglectFactor(neglect, age) * faultMul)
  const phaseRoll = rand(s.meta)
  const phase = phaseRoll < 0.46 ? 'takeoff' : phaseRoll < 0.92 ? 'approach' : 'cruise'
  const cond01 = clamp(rel / 100, 0.2, 1)

  let found: SafetyEvent | null = null

  if (rand(s.meta) < 1 / 850) {
    let tail = phase === 'takeoff' ? 1.7 : phase === 'approach' ? 1.25 : 0.35
    tail *= 0.75 + (1 - cond01) * 0.9
    tail *= 1 + neglect / 140
    tail *= clamp(0.82 + (handling - 1) * 0.45, 0.7, 1.8)
    const weights = [91500, 7000, Math.max(40, 1200 * tail), Math.max(2, 28 * tail), Math.max(1, 6 * tail)]
    const idx = pickWeighted(s.meta, weights)
    const severity = (['note', 'minor', 'serious', 'major', 'catastrophic'] as const)[idx]
    found = describeBird(s, ac, crew, severity, phase, skill, opts.pax, opts.ferry)
  }

  const mechP = Math.min(1 / 420, machine / 16000)
  if (rand(s.meta) < mechP) {
    let tail = (1 + neglect / 80) * clamp(0.85 + (handling - 1) * 0.5, 0.7, 2.2)
    if (age > 30) tail *= 1.15
    if (critical) tail *= 1.35
    const weights = [94000, 0, Math.max(80, 5200 * Math.min(tail, 2.4)), Math.max(8, 650 * tail), Math.max(1, 80 * tail)]
    const idx = pickWeighted(s.meta, weights)
    const severity = (['note', 'minor', 'serious', 'major', 'catastrophic'] as const)[idx]
    const kind: SafetyKind = neglect >= 32 || critical ? 'maintenance' : 'mechanical'
    found = worse(found, describeMechanical(s, ac, crew, kind, severity, skill, opts.pax, opts.ferry, age))
  }

  if (!opts.ferry && rand(s.meta) < (s.modifiers.some((m) => m.id === 'cargo' && m.untilDay > s.meta.day) ? 1.7 : 1) * (age > 35 ? 1.25 : 1) / 180000) {
    const weights = [80000, 0, 15000, 4500, 500]
    const idx = pickWeighted(s.meta, weights)
    const severity = (['note', 'minor', 'serious', 'major', 'catastrophic'] as const)[idx]
    found = worse(found, describeCargo(s, ac, severity, opts.pax, skill))
  }

  if (opts.weather >= 0.62 && rand(s.meta) < (opts.weather - 0.55) / 25000) {
    const tail = clamp(0.9 + (handling - 1) * 0.35, 0.75, 1.6)
    const weights = [96000, 0, 3200, Math.max(20, 700 * tail), Math.max(4, 100 * tail)]
    const idx = pickWeighted(s.meta, weights)
    const severity = (['note', 'minor', 'serious', 'major', 'catastrophic'] as const)[idx]
    found = worse(found, describeWeather(s, ac, crew, severity, skill, opts.pax, opts.ferry))
  }

  if (rand(s.meta) < handling / 150000) {
    const weights = [96000, 0, 3200, Math.max(10, 700 * handling), Math.max(2, 80 * handling)]
    const idx = pickWeighted(s.meta, weights)
    const severity = (['note', 'minor', 'serious', 'major', 'catastrophic'] as const)[idx]
    if (severity !== 'note') found = worse(found, describeCrew(s, ac, crew, severity, skill, opts.pax, opts.ferry))
  }

  if (found && (found.severity === 'major' || found.severity === 'catastrophic') && found.kind === 'bird' && skill > 0.78 && rand(s.meta) < 0.55) {
    found = describeBird(s, ac, crew, 'serious', phase, skill, opts.pax, opts.ferry)
    found.flightNote = `Bird strike on ${phase}. The crew got the aircraft on the ground. Everyone survived.`
  }

  return found
}

function moneyLine(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function bill(
  s: GameState,
  ac: OwnedAircraft,
  severity: SafetySeverity,
  hull: boolean,
  fatalities: number,
  injured: number,
  pax: number,
): { cost: number; fine: number; compensation: number; response: number; uninsured: number } {
  const hullValue = Math.max(350_000, ac.acquiredPrice || 800_000)
  const cover = s.reputation.safety > 45 ? 0.62 : s.reputation.safety > 28 ? 0.45 : 0.3
  const uninsured = hull ? Math.round(hullValue * (1 - cover)) : 0
  const response = severity === 'catastrophic' ? 900_000 : severity === 'major' ? 280_000 : severity === 'serious' ? 40_000 : 8_000
  const fine = severity === 'catastrophic' ? 650_000 + fatalities * 20_000 : severity === 'major' ? 220_000 : severity === 'serious' ? 25_000 : 0
  const compensation = fatalities * 420_000 + injured * 48_000 + (severity === 'major' || severity === 'catastrophic' ? pax * 2_200 : 0)
  const repair = hull ? 0 : severity === 'major' ? Math.round(hullValue * 0.22) : severity === 'serious' ? randInt(s.meta, 80_000, 280_000) : randInt(s.meta, 6_000, 32_000)
  const cost = uninsured + response + fine + compensation + repair
  return { cost, fine, compensation, response, uninsured }
}

function reputationHit(severity: SafetySeverity): Partial<Reputation> {
  if (severity === 'note') return { reliability: -0.05 }
  if (severity === 'minor') return { safety: -0.35, reliability: -0.45, satisfaction: -0.2 }
  if (severity === 'serious') return { safety: -3.5, trust: -2, brand: -1.2, satisfaction: -2, reliability: -1.2 }
  if (severity === 'major') return { safety: -14, trust: -10, brand: -8, satisfaction: -7, reliability: -5 }
  return { safety: -32, trust: -24, brand: -18, satisfaction: -16, reliability: -8 }
}

function demandFor(severity: SafetySeverity): { demandMul?: number; demandDays?: number } {
  if (severity === 'serious') return { demandMul: 0.9, demandDays: 28 }
  if (severity === 'major') return { demandMul: 0.68, demandDays: 90 }
  if (severity === 'catastrophic') return { demandMul: 0.42, demandDays: 170 }
  return {}
}

function insuranceFor(severity: SafetySeverity): number {
  if (severity === 'serious') return 0.12
  if (severity === 'major') return 0.75
  if (severity === 'catastrophic') return 1.45
  return 0
}

function investigationFor(severity: SafetySeverity): number {
  if (severity === 'serious') return 0
  if (severity === 'major') return 80
  if (severity === 'catastrophic') return 170
  return 0
}

function describeBird(
  s: GameState,
  ac: OwnedAircraft,
  crew: Pilot[],
  severity: SafetySeverity,
  phase: string,
  skill: number,
  pax: number,
  ferry: boolean,
): SafetyEvent {
  const speed = phase === 'cruise' ? 'at altitude' : phase === 'takeoff' ? 'on takeoff' : 'on approach'
  const type = getType(ac.typeId)
  let fatalities = 0
  let injured = 0
  let hull = false
  if (!ferry && severity === 'major') {
    injured = Math.max(0, Math.round(pax * (0.04 + rand(s.meta) * 0.08)))
    if (skill < 0.62 && rand(s.meta) < 0.35) fatalities = Math.max(1, Math.round(pax * (0.04 + rand(s.meta) * 0.12)))
    hull = rand(s.meta) < 0.45
  }
  if (!ferry && severity === 'catastrophic') {
    const survived = skill > 0.8 && rand(s.meta) < 0.4
    fatalities = survived ? Math.round(pax * rand(s.meta) * 0.08) : Math.max(1, Math.round(pax * (0.12 + rand(s.meta) * 0.45)))
    injured = Math.max(0, Math.round((pax - fatalities) * (0.2 + rand(s.meta) * 0.4)))
    hull = true
  }
  const money = bill(s, ac, severity, hull, fatalities, injured, ferry ? 0 : pax)
  const captain = crew[0]?.name ?? 'The crew'
  const stop = severity !== 'note'
  const groundDays = severity === 'note' ? 0 : severity === 'minor' ? randInt(s.meta, 1, 2) : severity === 'serious' ? randInt(s.meta, 4, 9) : hull ? 0 : randInt(s.meta, 18, 35)
  const condition: Partial<Condition> = severity === 'note'
    ? { engine1: rand(s.meta) < 0.4 ? 1 : 0 }
    : severity === 'minor'
      ? { engine1: randInt(s.meta, 2, 6), airframe: 1 }
      : { engine1: randInt(s.meta, 8, 18), engine2: randInt(s.meta, 2, 8), airframe: randInt(s.meta, 4, 12) }
  const outcome = severity === 'note'
    ? 'No damage worth grounding the aircraft. Maintenance will inspect the engines.'
    : severity === 'minor'
      ? 'The aircraft returned. Damage is limited. It will not fly tomorrow.'
      : severity === 'serious'
        ? `${captain} made an emergency landing. The airframe is damaged. There were no fatalities.`
        : fatalities > 0
          ? `${fatalities} people were killed. ${injured} were injured. ${type.model} ${ac.tailNumber} is a hull loss.`
          : `The aircraft is badly damaged. ${injured} people were injured. Everyone survived.`
  const body = [
    `${ac.tailNumber} struck birds ${speed}. ${outcome}`,
    money.cost > 0 ? `Immediate cost ${moneyLine(money.cost)}.` : '',
    severity === 'major' || severity === 'catastrophic'
      ? `That includes uninsured hull ${moneyLine(money.uninsured)}, emergency response ${moneyLine(money.response)}, civil penalties ${moneyLine(money.fine)}, and compensation ${moneyLine(money.compensation)}.`
      : '',
    investigationFor(severity) ? 'The accident is under government investigation. Insurers will reprice the airline.' : '',
  ].filter(Boolean).join(' ')
  return {
    kind: 'bird',
    severity,
    title: severity === 'note' || severity === 'minor' ? `Bird strike · ${ac.tailNumber}` : `Bird strike accident · ${ac.tailNumber}`,
    flightNote: `Bird strike ${speed}. ${outcome}`,
    headline: severity === 'catastrophic' || (severity === 'major' && fatalities > 0)
      ? `Fatal bird-strike accident · ${ac.tailNumber}`
      : severity === 'serious' || severity === 'major'
        ? `Emergency landing after a bird strike · ${ac.tailNumber}`
        : `Bird strike · ${ac.tailNumber}`,
    body,
    cost: money.cost,
    delayMin: severity === 'note' ? randInt(s.meta, 12, 28) : 0,
    groundDays,
    hull,
    fatalities,
    injured,
    condition,
    rep: reputationHit(severity),
    ...demandFor(severity),
    insuranceAdd: insuranceFor(severity),
    investigationDays: investigationFor(severity),
    removeCrew: severity === 'catastrophic',
    stop,
  }
}

function describeMechanical(
  s: GameState,
  ac: OwnedAircraft,
  crew: Pilot[],
  kind: SafetyKind,
  severity: SafetySeverity,
  skill: number,
  pax: number,
  ferry: boolean,
  age: number,
): SafetyEvent {
  const type = getType(ac.typeId)
  const mapped: SafetySeverity = severity === 'note' ? 'minor' : severity
  let fatalities = 0
  let injured = 0
  let hull = false
  if (!ferry && mapped === 'major') {
    injured = Math.round(pax * (0.02 + rand(s.meta) * 0.06))
    hull = age > 30 ? rand(s.meta) < 0.55 : rand(s.meta) < 0.35
    if (skill < 0.6 && rand(s.meta) < 0.22) fatalities = Math.max(1, Math.round(pax * 0.05))
  }
  if (!ferry && mapped === 'catastrophic') {
    hull = true
    fatalities = Math.max(1, Math.round(pax * (0.15 + rand(s.meta) * (skill > 0.8 ? 0.2 : 0.5))))
    injured = Math.max(0, Math.round((pax - fatalities) * 0.35))
  }
  const money = bill(s, ac, mapped, hull, fatalities, injured, ferry ? 0 : pax)
  const why = kind === 'maintenance'
    ? 'Investigators will look at the deferred defects first.'
    : 'The cause is not yet known.'
  const captain = crew[0]?.name ?? 'The crew'
  const outcome = mapped === 'minor'
    ? 'The crew diverted. The failure stayed contained.'
    : mapped === 'serious'
      ? `${captain} shut the engine down and landed. The aircraft is grounded.`
      : fatalities > 0
        ? `${fatalities} people were killed and ${injured} injured. ${why}`
        : `The aircraft is a heavy damage case. ${injured} people were injured. ${why}`
  const body = [
    `${ac.tailNumber}, a ${age}-year-old ${type.model}, had an in-flight ${kind === 'maintenance' ? 'failure consistent with deferred maintenance' : 'mechanical failure'}. ${outcome}`,
    `Immediate cost ${moneyLine(money.cost)}.`,
    mapped === 'major' || mapped === 'catastrophic'
      ? `Uninsured loss ${moneyLine(money.uninsured)}. Response ${moneyLine(money.response)}. Fines ${moneyLine(money.fine)}. Compensation ${moneyLine(money.compensation)}.`
      : '',
    investigationFor(mapped) ? 'A government investigation is open. Passenger demand and the insurance renewal will both move.' : '',
  ].filter(Boolean).join(' ')
  return {
    kind,
    severity: mapped,
    title: `${kind === 'maintenance' ? 'Maintenance failure' : 'Mechanical failure'} · ${ac.tailNumber}`,
    flightNote: outcome,
    headline: mapped === 'catastrophic'
      ? `Accident · ${ac.tailNumber}`
      : mapped === 'major'
        ? `Serious accident · ${ac.tailNumber}`
        : `${kind === 'maintenance' ? 'Maintenance' : 'Mechanical'} diversion · ${ac.tailNumber}`,
    body,
    cost: money.cost,
    delayMin: 0,
    groundDays: hull ? 0 : mapped === 'minor' ? randInt(s.meta, 1, 3) : mapped === 'serious' ? randInt(s.meta, 5, 12) : randInt(s.meta, 20, 40),
    hull,
    fatalities,
    injured,
    condition: { engine1: mapped === 'minor' ? 6 : 16, airframe: mapped === 'minor' ? 2 : 8, avionics: mapped === 'serious' ? 4 : 0 },
    rep: reputationHit(mapped),
    ...demandFor(mapped),
    insuranceAdd: insuranceFor(mapped),
    investigationDays: investigationFor(mapped),
    removeCrew: mapped === 'catastrophic',
    stop: true,
  }
}

function describeCargo(s: GameState, ac: OwnedAircraft, severity: SafetySeverity, pax: number, skill: number): SafetyEvent {
  const mapped: SafetySeverity = severity === 'note' ? 'serious' : severity
  let fatalities = 0
  let injured = 0
  const hull = mapped === 'catastrophic' || (mapped === 'major' && rand(s.meta) < 0.5)
  if (mapped === 'catastrophic') {
    fatalities = Math.max(1, Math.round(pax * (skill > 0.82 ? 0.08 : 0.22 + rand(s.meta) * 0.3)))
    injured = Math.round((pax - fatalities) * 0.25)
  } else if (mapped === 'major') {
    injured = Math.round(pax * 0.06)
    if (rand(s.meta) < 0.2) fatalities = Math.max(1, Math.round(pax * 0.04))
  }
  const money = bill(s, ac, mapped, hull, fatalities, injured, pax)
  const outcome = mapped === 'serious'
    ? 'A cargo-compartment warning. The crew diverted and the fire stayed contained.'
    : fatalities > 0
      ? `A cargo fire got out of the compartment. ${fatalities} people were killed.`
      : 'A cargo fire damaged the aircraft. The evacuation injured people. There were no deaths.'
  return {
    kind: 'cargo',
    severity: mapped,
    title: `Cargo fire · ${ac.tailNumber}`,
    flightNote: outcome,
    headline: mapped === 'catastrophic' || fatalities > 0 ? `Cargo-fire accident · ${ac.tailNumber}` : `Cargo fire warning · ${ac.tailNumber}`,
    body: `${outcome} Immediate cost ${moneyLine(money.cost)}. ${investigationFor(mapped) ? 'Investigators have the recorders and the cargo manifest.' : ''}`.trim(),
    cost: money.cost,
    delayMin: 0,
    groundDays: hull ? 0 : mapped === 'serious' ? 6 : 24,
    hull,
    fatalities,
    injured,
    condition: { airframe: 10, cabin: 8 },
    rep: reputationHit(mapped),
    ...demandFor(mapped),
    insuranceAdd: insuranceFor(mapped),
    investigationDays: investigationFor(mapped),
    removeCrew: mapped === 'catastrophic',
    stop: true,
  }
}

function describeWeather(
  s: GameState,
  ac: OwnedAircraft,
  crew: Pilot[],
  severity: SafetySeverity,
  skill: number,
  pax: number,
  ferry: boolean,
): SafetyEvent {
  const mapped: SafetySeverity = severity === 'note' ? 'minor' : severity
  let fatalities = 0
  let injured = 0
  const hull = !ferry && (mapped === 'catastrophic' || (mapped === 'major' && rand(s.meta) < 0.4))
  if (!ferry && mapped === 'catastrophic') {
    fatalities = Math.max(0, Math.round(pax * (skill > 0.8 ? 0.05 : 0.18)))
    injured = Math.round(pax * 0.12)
  } else if (!ferry && mapped === 'major') {
    injured = Math.round(pax * 0.05)
  }
  const money = bill(s, ac, mapped, hull, fatalities, injured, ferry ? 0 : pax)
  const captain = crew[0]?.name ?? 'The crew'
  const outcome = mapped === 'minor'
    ? 'Severe weather. The flight diverted.'
    : mapped === 'serious'
      ? `${captain} abandoned the approach in severe weather and diverted.`
      : fatalities > 0
        ? `The aircraft did not survive the weather. ${fatalities} people were killed.`
        : 'A weather-related accident. The aircraft is heavily damaged.'
  return {
    kind: 'weather',
    severity: mapped,
    title: `Weather · ${ac.tailNumber}`,
    flightNote: outcome,
    headline: fatalities > 0 ? `Weather accident · ${ac.tailNumber}` : `Weather diversion · ${ac.tailNumber}`,
    body: `${outcome} Cost ${moneyLine(money.cost)}.`,
    cost: money.cost,
    delayMin: 0,
    groundDays: hull ? 0 : mapped === 'minor' ? 0 : mapped === 'serious' ? 2 : 15,
    hull,
    fatalities,
    injured,
    condition: mapped === 'minor' ? {} : { airframe: 6, landingGear: 8 },
    rep: reputationHit(mapped),
    ...demandFor(mapped),
    insuranceAdd: insuranceFor(mapped),
    investigationDays: investigationFor(mapped),
    removeCrew: mapped === 'catastrophic' && fatalities > 0,
    stop: true,
  }
}

function describeCrew(
  s: GameState,
  ac: OwnedAircraft,
  crew: Pilot[],
  severity: SafetySeverity,
  skill: number,
  pax: number,
  ferry: boolean,
): SafetyEvent {
  const mapped: SafetySeverity = severity === 'note' ? 'minor' : severity
  const captain = crew[0]?.name ?? 'A pilot'
  let fatalities = 0
  let injured = 0
  const hull = !ferry && mapped === 'catastrophic'
  if (!ferry && mapped === 'catastrophic') {
    fatalities = Math.max(1, Math.round(pax * (0.1 + (1 - skill) * 0.35)))
    injured = Math.round((pax - fatalities) * 0.3)
  } else if (!ferry && mapped === 'major') {
    injured = Math.round(pax * 0.04)
    if (skill < 0.55 && rand(s.meta) < 0.25) fatalities = Math.max(1, Math.round(pax * 0.03))
  }
  const money = bill(s, ac, mapped, hull, fatalities, injured, ferry ? 0 : pax)
  const outcome = mapped === 'minor' || mapped === 'serious'
    ? `${captain} mishandled a phase of flight. The aircraft landed. Fatigue was a factor, not the whole story.`
    : fatalities > 0
      ? `Pilot error ended in an accident. ${fatalities} people were killed. Fatigue and staffing were factors, not a script.`
      : `${captain} was involved in a serious incident. People were injured. The aircraft is damaged.`
  return {
    kind: 'crew',
    severity: mapped === 'minor' ? 'serious' : mapped,
    title: `Crew event · ${ac.tailNumber}`,
    flightNote: outcome,
    headline: fatalities > 0 ? `Accident attributed to crew performance · ${ac.tailNumber}` : `Serious incident · ${ac.tailNumber}`,
    body: `${outcome} Cost ${moneyLine(money.cost)}. ${investigationFor(mapped) ? 'The investigation will review duty time, training, and the roster.' : ''}`.trim(),
    cost: money.cost,
    delayMin: mapped === 'serious' ? 40 : 0,
    groundDays: hull ? 0 : 3,
    hull,
    fatalities,
    injured,
    condition: { landingGear: 5, airframe: mapped === 'major' || mapped === 'catastrophic' ? 8 : 2 },
    rep: reputationHit(mapped === 'minor' ? 'serious' : mapped),
    ...demandFor(mapped === 'minor' ? 'serious' : mapped),
    insuranceAdd: insuranceFor(mapped === 'minor' ? 'serious' : mapped),
    investigationDays: investigationFor(mapped),
    removeCrew: mapped === 'catastrophic',
    stop: true,
  }
}

export function applySafetyEvent(
  s: GameState,
  ac: OwnedAircraft,
  crew: Pilot[],
  event: SafetyEvent,
  base: FlightResult,
  money: Record<string, number>,
  headlines: string[],
): FlightResult {
  normalizeSafety(s)
  if (event.cost > 0) {
    s.finance.cash -= event.cost
    s.finance.lifetimeExpenses += event.cost
    money.other += event.cost
  }
  for (const key of Object.keys(event.condition) as ConditionKey[]) {
    const hit = event.condition[key] ?? 0
    if (hit) ac.condition[key] = clamp(ac.condition[key] - hit, 4, 100)
  }
  const rep = s.reputation
  for (const key of Object.keys(event.rep) as (keyof Reputation)[]) {
    const delta = event.rep[key]
    if (delta) rep[key] = clamp(rep[key] + delta, 0, 100)
  }
  if (event.insuranceAdd) s.meta.insuranceLoad = clamp((s.meta.insuranceLoad ?? 1) + event.insuranceAdd, 1, 4.2)
  if (event.demandMul && event.demandDays) {
    const existing = s.modifiers.find((m) => m.id === 'safety-shock' && m.untilDay > s.meta.day)
    const mul = existing?.demandMul ? Math.min(existing.demandMul, event.demandMul) : event.demandMul
    const until = Math.max(existing?.untilDay ?? 0, s.meta.day + event.demandDays)
    s.modifiers = s.modifiers.filter((m) => m.id !== 'safety-shock')
    s.modifiers.push({ id: 'safety-shock', label: 'After an accident', untilDay: until, demandMul: mul })
  }
  if (event.investigationDays) {
    s.meta.investigationUntil = Math.max(s.meta.investigationUntil ?? 0, s.meta.day + event.investigationDays)
  }

  let recordSeverity: AccidentSeverity = 'INCIDENT'
  if (event.fatalities > 0) recordSeverity = 'FATAL ACCIDENT'
  else if (event.hull || event.severity === 'catastrophic' || event.severity === 'major') recordSeverity = 'SERIOUS ACCIDENT'
  else if (event.severity === 'serious') recordSeverity = 'MINOR ACCIDENT'
  else recordSeverity = 'INCIDENT'

  const type = getType(ac.typeId)
  const recordId = `ACC-${s.meta.day}-${s.accidentLog.length + 1}`
  const record: AccidentRecord = {
    id: recordId,
    day: s.meta.day,
    dateLabel: formatDate(s.meta.day),
    flightNo: base.flightNo || `${s.airline.iata}100`,
    tailNumber: ac.tailNumber,
    aircraftId: ac.id,
    typeId: ac.typeId,
    aircraftModel: `${type.manufacturer} ${type.model}`,
    operator: s.airline.name,
    origin: base.origin || s.airline.home,
    dest: base.dest || s.airline.home,
    location: base.origin && base.dest ? `${base.origin} / ${base.dest} corridor` : s.airline.home,
    eventType: event.title,
    severity: recordSeverity,
    fatalities: event.fatalities,
    injuries: event.injured,
    paxAffected: base.pax || 0,
    aircraftDamage: event.hull
      ? 'Destroyed / Hull Loss'
      : event.severity === 'major'
        ? 'Substantial structural damage'
        : event.severity === 'serious'
          ? 'Moderate components & systems damage'
          : 'Minor superficial / inspection required',
    cause: event.kind === 'bird'
      ? 'Bird strike ingestion and impact'
      : event.kind === 'maintenance'
        ? 'Deferred maintenance component failure'
        : event.kind === 'cargo'
          ? 'In-flight cargo compartment fire alarm'
          : event.kind === 'weather'
            ? 'Severe atmospheric turbulence and windshear'
            : event.kind === 'crew'
              ? 'Flight crew fatigue & handling deviation'
              : 'Mechanical subsystem malfunction',
    investigationStatus: event.investigationDays > 0 ? 'Active Government / NTSB Inquiry' : 'Internal Safety Board Review Closed',
    financialLoss: event.cost,
    aircraftDisposition: event.hull
      ? 'Written off / Total loss'
      : event.groundDays > 0
        ? `Grounded for repair (${event.groundDays} days)`
        : 'Returned to revenue service',
    reputationImpact: event.severity === 'catastrophic'
      ? 'Catastrophic public trust loss'
      : event.severity === 'major'
        ? 'Severe safety rating drop'
        : event.severity === 'serious'
          ? 'Moderate brand rating impact'
          : 'Negligible customer impact',
  }
  s.accidentLog.unshift(record)

  if (!ac.serviceLog) ac.serviceLog = []
  ac.serviceLog.unshift({
    day: s.meta.day,
    dateLabel: formatDate(s.meta.day),
    kind: recordSeverity === 'INCIDENT' ? 'incident' : 'accident',
    title: event.headline,
    detail: event.flightNote,
    cost: event.cost,
    accidentRecordId: recordId,
  })

  if (event.severity === 'major' || event.severity === 'catastrophic') {
    s.meta.accidents += 1
    s.finance.credit = nextCredit(s.finance.credit, false)
    ac.history.push({ year: calendar(s.meta.day).year, text: event.headline })
  }
  if (event.groundDays > 0 && !event.hull && ac.status !== 'lost') {
    ac.status = 'maintenance'
    ac.maintenanceDaysLeft = Math.max(ac.maintenanceDaysLeft, event.groundDays)
  }
  if (event.hull) {
    ac.status = 'lost'
    s.routes = s.routes.filter((r) => r.aircraftId !== ac.id)
  }
  if (event.removeCrew) {
    const ids = new Set(crew.map((p) => p.id))
    s.pilots = s.pilots.filter((p) => !ids.has(p.id))
  } else if (event.severity === 'serious' || event.severity === 'major') {
    for (const p of crew) p.fatigue = clamp(p.fatigue + 24, 0, 100)
  }
  if (event.severity !== 'note') {
    headlines.push(event.headline)
    pushNews(s, event.headline, event.body, event.kind === 'weather' ? SCENE.rain : event.severity === 'minor' ? SCENE.hangar : SCENE.accident, 'Safety')
  }
  if (event.severity === 'serious' || event.severity === 'major' || event.severity === 'catastrophic') {
    const item = {
      defId: event.severity === 'serious' ? 'safety_incident' : 'accident_report',
      day: s.meta.day,
      title: event.headline,
      body: event.body,
      image: event.severity === 'serious' && event.kind !== 'bird' ? SCENE.hangar : SCENE.accident,
      choices: [{ id: 'ack', label: 'Read the report', detail: 'The costs are already on the books. There is nothing in this window that undoes them.' }],
    }
    if (s.pending || s.merger || s.faultPrompt) s.eventQueue.push(item)
    else {
      s.pending = item
      s.meta.speed = 0
    }
  }
  if (event.fatalities > 0 && s.finance.cash < 0) {
    endGame(s, 'Claims, fines, and compensation from the accident exceeded what the airline could pay.', SCENE.accident)
  } else if (s.meta.accidents >= 2 && (event.severity === 'major' || event.severity === 'catastrophic')) {
    endGame(s, 'A second serious accident. The certificate is pulled.', SCENE.accident)
  }

  base.note = event.flightNote
  base.cost += event.cost
  base.profit -= event.cost
  base.delayMin = Math.max(base.delayMin, event.delayMin)
  if (event.stop) {
    base.status = event.severity === 'minor' ? 'diverted' : 'incident'
    if (!event.hull) ac.location = base.origin
    return base
  }
  return base
}

export function investigationCost(s: GameState): number {
  if ((s.meta.investigationUntil ?? 0) <= s.meta.day) return 0
  return s.meta.accidents > 0 && (s.reputation.safety < 20) ? 6400 : 3800
}
