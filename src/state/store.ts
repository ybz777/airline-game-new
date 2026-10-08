import { useSyncExternalStore } from 'react'
import { getType } from '../data/aircraft'
import { claimIdentity, pilotIdentity } from '../data/pilotRoster'
import type { ConditionKey, Frequency, GameState, Strategy, ViewId } from '../types'
import {
  assignGate as assignGateAction,
  assignMeal as assignMealAction, bulkReleaseGates as bulkReleaseGatesAction, buyListing, campaign, closeRoute, createMeal as createMealAction, hireCabin, hirePilot, leaseGate, openRoute, payDown, releaseCabin, releaseGate as releaseGateAction, releasePilot, repairAircraft, resolveFault, retimes,
  resolveMerger, sellAircraft, setAircraftColor, setStorage, takeLoan, unassignGate as unassignGateAction, updateRoute,
} from '../sim/actions'
import { applyChoice, releaseModal } from '../sim/eventsApply'
import { criticalFaultForToday, simulateDay } from '../sim/engine'
import { migrateOps } from '../sim/gates'
import { createNewGame, topUpMarket } from '../sim/setup'
import { formatDate } from '../sim/util'

export const SAVE_KEY = 'airline96_save_v1'
const LEGACY_KEY = 'airline96.v1'

let state: GameState = createNewGame({ name: 'Draft', iata: 'XX', home: 'AUS', strategy: 'regional', color: '#c4534a' })
state.meta.created = false
const listeners = new Set<() => void>()

function emit(next: GameState) {
  state = next
  listeners.forEach((l) => l())
  if (state.meta.created) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch {
      /* storage full */
    }
  }
}

export function getState(): GameState { return state }

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useGame(): GameState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export interface SaveMetadata {
  name: string
  iata: string
  home: string
  color: string
  day: number
  date: string
  cash: number
  fleetCount: number
  routeCount: number
  strategy: string
}

export function validateSaveData(data: unknown): GameState | null {
  if (!data || typeof data !== 'object') return null
  const parsed = data as GameState

  // Core required fields validation
  if (!parsed.meta || typeof parsed.meta !== 'object') return null
  if (!parsed.meta.created || typeof parsed.meta.day !== 'number') return null
  if (!parsed.airline || typeof parsed.airline !== 'object') return null
  if (!parsed.airline.name || !parsed.airline.iata || !parsed.airline.home) return null
  if (!parsed.finance || typeof parsed.finance.cash !== 'number') return null
  if (!Array.isArray(parsed.fleet)) return null
  if (!Array.isArray(parsed.routes)) return null
  if (!Array.isArray(parsed.listings)) return null

  // Airline color normalization
  const saved = parsed.airline as { color?: string; livery?: { primary?: string } }
  if (saved.livery?.primary) saved.color = saved.livery.primary
  delete saved.livery
  if (!saved.color || typeof saved.color !== 'string') saved.color = '#c4534a'

  // Safety checks & backfills for optional / migrated properties
  if (!parsed.market) (parsed as any).market = {}
  if (!parsed.market.slotBonus) parsed.market.slotBonus = {}
  if (!Array.isArray(parsed.eventQueue)) parsed.eventQueue = []
  if (parsed.cabinCrew == null) {
    parsed.cabinCrew = parsed.fleet.reduce((sum, ac) => {
      if (ac.status === 'lost' || ac.status === 'stored') return sum
      return sum + Math.max(1, Math.ceil(getType(ac.typeId).seatCapacity / 50))
    }, 0)
  }
  if (parsed.meta.insuranceLoad == null) parsed.meta.insuranceLoad = 1
  if (parsed.meta.investigationUntil == null) parsed.meta.investigationUntil = 0
  if (!Array.isArray(parsed.meta.seen)) parsed.meta.seen = []
  if (!Array.isArray(parsed.news)) parsed.news = []
  if (!Array.isArray(parsed.loans)) parsed.loans = []
  if (!Array.isArray(parsed.accidentLog)) parsed.accidentLog = []

  // Aircraft sanitization
  for (const ac of parsed.fleet) {
    if (ac.neglect == null) ac.neglect = ac.ignoredFault ? 12 : 0
    if (!ac.color && parsed.airline.color) ac.color = parsed.airline.color
  }

  // Route sanitization
  for (const route of parsed.routes) {
    if (route.via == null) route.via = ''
    if (route.bound !== 'out' && route.bound !== 'back') route.bound = 'out'
  }

  // Pilot roster sanitization
  if (Array.isArray(parsed.pilots)) {
    const usedPortraits = new Set<string>()
    for (const pilot of parsed.pilots) {
      if (pilot.portraitId && pilotIdentity(pilot.portraitId)) usedPortraits.add(pilot.portraitId)
    }
    for (const pilot of parsed.pilots) {
      if (!pilot.portraitId || !pilotIdentity(pilot.portraitId)) {
        const who = claimIdentity(usedPortraits, pilot.id)
        pilot.portraitId = who.id
        usedPortraits.add(who.id)
      }
      const who = pilotIdentity(pilot.portraitId)
      if (pilot.gender !== 'Female' && pilot.gender !== 'Male') pilot.gender = who?.gender ?? 'Male'
      if (typeof pilot.age !== 'number') pilot.age = who?.age ?? 40
      if (typeof pilot.morale !== 'number') pilot.morale = 72
      if (!Array.isArray(pilot.certifications)) pilot.certifications = ['ATP', 'Instrument']
    }
  }

  if ((parsed.listings?.length ?? 0) < 24) topUpMarket(parsed, 28)
  migrateOps(parsed)
  return parsed
}

export function hasSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return validateSaveData(parsed) !== null
  } catch {
    return false
  }
}

export function getSaveMetadata(): SaveMetadata | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = validateSaveData(JSON.parse(raw))
    if (!parsed) return null
    return {
      name: parsed.airline.name,
      iata: parsed.airline.iata,
      home: parsed.airline.home,
      color: parsed.airline.color,
      day: parsed.meta.day,
      date: formatDate(parsed.meta.day),
      cash: parsed.finance.cash,
      fleetCount: parsed.fleet.length,
      routeCount: parsed.routes.length,
      strategy: parsed.airline.strategy,
    }
  } catch {
    return null
  }
}

export function saveGame(): boolean {
  if (!state.meta.created) return false
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function loadSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return false
    const parsed = validateSaveData(JSON.parse(raw))
    if (!parsed) return false
    emit(parsed)
    return true
  } catch {
    return false
  }
}

export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function clearSave(): void {
  deleteSave()
}

export function newGame(): void {
  const fresh = createNewGame({ name: 'Draft', iata: 'XX', home: 'AUS', strategy: 'regional', color: '#c4534a' })
  fresh.meta.created = false
  emit(fresh)
}

export const actions = {
  start(input: { name: string; iata: string; home: string; strategy: Strategy; color: string }) {
    emit(createNewGame(input))
  },
  save(): boolean {
    return saveGame()
  },
  load(): boolean {
    return loadSave()
  },
  continue(): boolean {
    return loadSave()
  },
  deleteSave(): void {
    deleteSave()
  },
  newGame(): void {
    newGame()
  },
  setColor(color: string) {
    emit({ ...state, airline: { ...state.airline, color } })
  },
  setAircraftColor(id: string, color: string) {
    emit(setAircraftColor(state, id, color))
  },
  setView(view: ViewId) {
    emit({ ...state, meta: { ...state.meta, view } })
  },
  setSpeed(speed: 0 | 1 | 3) {
    if (state.pending || state.merger || state.faultPrompt || state.meta.gameOver) {
      emit({ ...state, meta: { ...state.meta, speed: 0 } })
      return
    }
    emit({ ...state, meta: { ...state.meta, speed } })
  },
  dismissBriefing() {
    emit({ ...state, meta: { ...state.meta, showBriefing: false } })
  },
  buy(listingId: string, mode: 'cash' | 'finance' | 'lease') {
    const res = buyListing(state, listingId, mode)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  sell(id: string) {
    const res = sellAircraft(state, id)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  storeAircraft(id: string, stored: boolean) {
    emit(setStorage(state, id, stored))
  },
  repair(id: string, system: ConditionKey | 'check') {
    const res = repairAircraft(state, id, system)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  fault(id: string, decision: 'repair' | 'defer' | 'cancel' | 'fly') {
    const res = resolveFault(state, id, decision)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  open(input: Parameters<typeof openRoute>[1]) {
    const res = openRoute(state, input)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  patchRoute(id: string, patch: Parameters<typeof updateRoute>[2]) {
    emit(updateRoute(state, id, patch))
  },
  retime(id: string, departHour: number, frequency: Frequency) {
    const res = retimes(state, id, departHour, frequency)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  closeRoute(id: string) {
    emit(closeRoute(state, id))
  },
  lease(standId: string, kind: 'owned' | 'leased') {
    const res = leaseGate(state, standId, kind)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  releaseGate(standId: string) {
    const res = releaseGateAction(state, standId)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  unassignGate(standId: string) {
    emit(unassignGateAction(state, standId))
    return ''
  },
  assignGate(routeId: string, standId: string) {
    const res = assignGateAction(state, routeId, standId)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  bulkReleaseGates(standIds: string[]) {
    const res = bulkReleaseGatesAction(state, standIds)
    emit(res.state)
    return res
  },
  createMeal(input: Parameters<typeof createMealAction>[1]) {
    const res = createMealAction(state, input)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  assignMeal(routeId: string, which: 'economy' | 'cabin', mealId: string) {
    emit(assignMealAction(state, routeId, which, mealId))
  },
  hire(typeId: string) {
    const res = hirePilot(state, typeId)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  releasePilot(id: string) {
    const res = releasePilot(state, id)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  hireCabin() {
    const res = hireCabin(state)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  releaseCabin() {
    const res = releaseCabin(state)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  borrow(principal: number, months: number, kind: 'amortizing' | 'bullet') {
    const res = takeLoan(state, principal, months, kind)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  payLoan(id: string, amount: number) {
    const res = payDown(state, id, amount)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  ads() {
    const res = campaign(state)
    if (res.error) return res.error
    emit(res.state)
    return ''
  },
  choose(choiceId: string) { emit(applyChoice(state, choiceId)) },
  dismissTop() {
    if (state.meta.gameOver) return
    if (state.faultPrompt) {
      const next = structuredClone(state) as GameState
      next.faultPrompt = null
      next.meta.speed = 0
      releaseModal(next, false)
      if (!next.pending && !next.merger && !next.faultPrompt) next.meta.speed = 0
      emit(next)
      return
    }
    if (state.merger) {
      actions.merger('reject')
      return
    }
    if (state.pending) {
      const next = structuredClone(state) as GameState
      next.pending = null
      releaseModal(next, true)
      emit(next)
      return
    }
    if (state.meta.showBriefing) {
      emit({ ...state, meta: { ...state.meta, showBriefing: false } })
    }
  },
  merger(decision: 'buy' | 'merge' | 'reject') {
    const res = resolveMerger(state, decision)
    if (res.error) return res.error
    releaseModal(res.state, true)
    emit(res.state)
    return ''
  },
  advance(n: number) {
    if (state.meta.gameOver) return
    if (state.pending || state.merger || state.faultPrompt) {
      emit({ ...state, meta: { ...state.meta, speed: 0 } })
      return
    }
    let current = state
    let guard = 0
    for (let i = 0; i < n; i++) {
      guard += 1
      if (guard > 40) break
      if (current.meta.gameOver) break
      const fault = criticalFaultForToday(current)
      if (fault) {
        current = { ...current, faultPrompt: { faultId: fault.id }, meta: { ...current.meta, speed: 0 } }
        break
      }
      current = simulateDay(current).state
    }
    if (current.pending || current.merger || current.faultPrompt) current.meta.speed = 0
    emit(current)
  },
}
