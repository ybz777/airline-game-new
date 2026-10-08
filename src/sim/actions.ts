import { getType } from '../data/aircraft'
import { SCENE, getAirport } from '../data/airports'
import type { CabinLayout, ConditionKey, CustomMeal, Frequency, GameState, OwnedAircraft, ServiceLevel } from '../types'
import { mealById, mealIdForService } from '../data/meals'
import { appraise, canAddRoute, creditTerms, effectiveRange, ownedValue, quotePurchase, repairCost } from './economy'
import { assignRouteToGate, bulkDropGates, dropGate, placeRoute, takeGate, unassignGateRoutes } from './gates'
import { distanceNm } from './geo'
import { loanOffer } from './eventsApply'
import { deliverAircraft, makePilot, nid, pushNews } from './setup'
import { acceptRisk, cabinMinimum, clearRisk } from './safety'
import { calendar, clamp } from './util'

export function buyListing(prev: GameState, listingId: string, mode: 'cash' | 'finance' | 'lease'): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const quote = quotePurchase(s, listingId, mode)
  if (!quote.ok) return { state: prev, error: quote.reason }
  const listing = s.listings.find((l) => l.id === listingId)
  if (!listing) return { state: prev, error: 'That aircraft was just sold.' }
  s.finance.cash -= quote.cashDue
  s.finance.lifetimeExpenses += quote.closing
  const ownership = mode === 'lease' ? 'leased' : 'owned'
  const ac = deliverAircraft(s, listing, ownership, mode === 'lease' ? 0 : listing.price, mode === 'lease' ? quote.leaseMonthly : 0)
  if (mode === 'finance' && quote.financed > 0) {
    s.loans.push({
      id: nid(s, 'LN'),
      name: `${ac.tailNumber} financing`,
      principal: quote.financed,
      balance: quote.financed,
      rate: quote.rate,
      months: 84,
      monthsLeft: 84,
      payment: quote.payment,
      kind: 'amortizing',
      openedDay: s.meta.day,
      maturityDay: s.meta.day + 84 * 30,
    })
  }
  s.listings = s.listings.filter((l) => l.id !== listingId)
  pushNews(s, `${ac.tailNumber} joined the fleet`, `${getType(ac.typeId).manufacturer} ${getType(ac.typeId).model}, built ${ac.yearBuilt}. Four type-rated pilots were hired at delivery.`, SCENE.apron, 'Fleet')
  return { state: s, error: '' }
}

export function sellAircraft(prev: GameState, aircraftId: string): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const ac = s.fleet.find((a) => a.id === aircraftId)
  if (!ac || ac.status === 'lost') return { state: prev, error: 'Aircraft not available.' }
  if (s.routes.some((r) => r.aircraftId === ac.id)) return { state: prev, error: 'Close its routes before selling it.' }
  if (ac.ownership === 'leased') {
    const fee = ac.leaseMonthly * 4
    if (s.finance.cash < fee) return { state: prev, error: 'Early return costs four months of rent.' }
    s.finance.cash -= fee
    pushNews(s, `${ac.tailNumber} returned to the lessor`, 'The lease is gone. So is the deposit you already spent.', SCENE.apron, 'Fleet')
  } else {
    const value = Math.round(ownedValue(s, ac) * 0.82)
    s.finance.cash += value
    s.finance.lifetimeRevenue += value
    pushNews(s, `${ac.tailNumber} sold`, `A broker wired ${value.toLocaleString('en-US')} after commission.`, SCENE.apron, 'Fleet')
  }
  s.fleet = s.fleet.filter((a) => a.id !== ac.id)
  s.faults = s.faults.filter((f) => f.aircraftId !== ac.id)
  return { state: s, error: '' }
}

export function setStorage(prev: GameState, aircraftId: string, stored: boolean): GameState {
  const s = structuredClone(prev) as GameState
  const ac = s.fleet.find((a) => a.id === aircraftId)
  if (!ac || ac.status === 'lost' || ac.status === 'maintenance') return prev
  if (!stored && s.routes.some((r) => r.aircraftId === ac.id)) {
    ac.status = 'idle'
  } else if (stored) {
    if (s.routes.some((r) => r.aircraftId === ac.id)) return prev
    ac.status = 'stored'
  } else ac.status = 'idle'
  return s
}

export function repairAircraft(prev: GameState, aircraftId: string, system: ConditionKey | 'check'): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const ac = s.fleet.find((a) => a.id === aircraftId)
  if (!ac || ac.status === 'lost') return { state: prev, error: 'Aircraft unavailable.' }
  if (system === 'check') {
    const cost = getType(ac.typeId).checkCost
    if (s.finance.cash < cost) return { state: prev, error: 'Not enough cash for the check.' }
    s.finance.cash -= cost
    s.finance.lifetimeExpenses += cost
    ac.condition.airframe = clamp(ac.condition.airframe + 18, 0, 97)
    ac.condition.engine1 = clamp(ac.condition.engine1 + 22, 0, 97)
    ac.condition.engine2 = clamp(ac.condition.engine2 + 22, 0, 97)
    ac.condition.landingGear = clamp(ac.condition.landingGear + 14, 0, 97)
    ac.condition.avionics = clamp(ac.condition.avionics + 10, 0, 97)
    ac.status = 'maintenance'
    ac.maintenanceDaysLeft = 4
    clearRisk(ac, 'check')
    s.faults = s.faults.filter((f) => f.aircraftId !== ac.id)
    return { state: s, error: '' }
  }
  const cost = repairCost(ac.typeId, system, ac.condition[system])
  if (s.finance.cash < cost) return { state: prev, error: 'Not enough cash for that repair.' }
  s.finance.cash -= cost
  s.finance.lifetimeExpenses += cost
  ac.condition[system] = 96
  ac.status = 'maintenance'
  ac.maintenanceDaysLeft = system.startsWith('engine') ? 3 : 2
  clearRisk(ac, 'repair')
  s.faults = s.faults.filter((f) => !(f.aircraftId === ac.id && f.system === system))
  return { state: s, error: '' }
}

export function resolveFault(prev: GameState, faultId: string, decision: 'repair' | 'defer' | 'cancel' | 'fly'): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const fault = s.faults.find((f) => f.id === faultId)
  if (!fault) {
    s.faultPrompt = null
    return { state: s, error: '' }
  }
  const ac = s.fleet.find((a) => a.id === fault.aircraftId)
  s.faultPrompt = null
  if (!ac) return { state: s, error: '' }
  if (decision === 'repair') {
    if (s.finance.cash < fault.repairCost) return { state: prev, error: 'You cannot afford the repair.' }
    s.finance.cash -= fault.repairCost
    s.finance.lifetimeExpenses += fault.repairCost
    ac.condition[fault.system] = 95
    ac.status = 'maintenance'
    ac.maintenanceDaysLeft = fault.groundDays
    clearRisk(ac, 'repair')
    s.faults = s.faults.filter((f) => f.id !== fault.id)
    s.reputation.safety = clamp(s.reputation.safety + 0.6, 0, 100)
    return { state: s, error: '' }
  }
  if (decision === 'cancel') {
    ac.holdToday = true
    s.reputation.safety = clamp(s.reputation.safety + 0.8, 0, 100)
    s.reputation.trust = clamp(s.reputation.trust + 0.3, 0, 100)
    return { state: s, error: '' }
  }
  if (decision === 'defer') {
    ac.condition[fault.system] = clamp(ac.condition[fault.system] - 4, 4, 100)
    fault.severity = fault.severity === 'watch' ? 'serious' : 'critical'
    acceptRisk(ac, calendar(s.meta.day).year - ac.yearBuilt, 'defer')
    return { state: s, error: '' }
  }
  acceptRisk(ac, calendar(s.meta.day).year - ac.yearBuilt, 'dispatch')
  s.meta.criticalDispatches += 1
  s.reputation.safety = clamp(s.reputation.safety - 1.5, 0, 100)
  s.faults = s.faults.filter((f) => f.id !== fault.id)
  return { state: s, error: '' }
}

export function openRoute(prev: GameState, input: {
  origin: string
  dest: string
  aircraftId: string
  price: number
  frequency: Frequency
  service: ServiceLevel
  baggageFee: number
  cabinLayout: CabinLayout
  via?: string
  departHour?: number
  economyMealId?: string
  cabinMealId?: string
}): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  if (input.origin === input.dest) return { state: prev, error: 'Pick two different airports.' }
  const ac = s.fleet.find((a) => a.id === input.aircraftId)
  if (!ac || ac.status === 'lost' || ac.status === 'stored') return { state: prev, error: 'That aircraft cannot take a route.' }
  if (s.routes.some((r) => r.aircraftId === ac.id)) return { state: prev, error: 'That aircraft already has a route. Close it first or buy another aircraft.' }
  const slot = canAddRoute(s, input.origin, input.dest)
  if (slot) return { state: prev, error: slot }
  const type = getType(ac.typeId)
  const via = input.via?.trim() ?? ''
  const dist = distanceNm(getAirport(input.origin), getAirport(input.dest))
  if (!via && dist > effectiveRange(ac.typeId, input.origin, input.dest)) {
    return { state: prev, error: 'NONSTOP FLIGHT NOT POSSIBLE' }
  }
  if (via) {
    const leg1 = distanceNm(getAirport(input.origin), getAirport(via))
    const leg2 = distanceNm(getAirport(via), getAirport(input.dest))
    if (via === input.origin || via === input.dest) return { state: prev, error: 'The stopover has to be a third airport.' }
    if (leg1 > effectiveRange(ac.typeId, input.origin, via) || leg2 > effectiveRange(ac.typeId, via, input.dest)) {
      return { state: prev, error: 'Each stopover leg has to be inside this aircraft’s practical range.' }
    }
    const mid = getAirport(via)
    if (mid.runwayFt < type.minRunwayFt) return { state: prev, error: `${mid.id} runway is short for the ${type.model}.` }
  }
  if (!Number.isFinite(input.price) || input.price <= 0) return { state: prev, error: 'Please enter a valid ticket price.' }
  const departHour = input.departHour == null ? 8 : Math.max(0, Math.min(23, Math.round(input.departHour)))
  const economyMealId = input.economyMealId || mealIdForService(input.service)
  const cabinMealId = input.cabinMealId || 'meal-cabin'
  const economyMeal = mealById(economyMealId, s.meals)
  const placed = placeRoute(s, {
    origin: input.origin,
    dest: input.dest,
    via,
    aircraftId: ac.id,
    frequency: input.frequency,
    departHour,
  })
  if (!placed.ok) return { state: prev, error: placed.error }
  ac.cabinLayout = input.cabinLayout
  s.routes.push({
    id: nid(s, 'R'),
    origin: input.origin,
    dest: input.dest,
    aircraftId: ac.id,
    price: Math.round(input.price),
    frequency: input.frequency,
    service: economyMeal.service,
    baggageFee: input.baggageFee,
    cabinLayout: input.cabinLayout,
    openedDay: s.meta.day,
    via: via,
    bound: 'out',
    departHour,
    economyMealId,
    cabinMealId,
    gateOrigin: placed.gateOrigin,
    gateDest: placed.gateDest,
    gateVia: placed.gateVia,
  })
  const label = via ? `${input.origin}–${via}–${input.dest}` : `${input.origin}–${input.dest}`
  pushNews(s, `${label} is on the schedule`, via
    ? `${ac.tailNumber} will fly it with a stop in ${via}. Filed fare $${Math.round(input.price)}. Passengers will notice the extra stop.`
    : `${ac.tailNumber} will fly it. Filed fare $${Math.round(input.price)}.`, SCENE.gate, 'Network')
  return { state: s, error: '' }
}

export function updateRoute(prev: GameState, routeId: string, patch: Partial<{ price: number; service: ServiceLevel; baggageFee: number; frequency: Frequency; cabinLayout: CabinLayout }>): GameState {
  const s = structuredClone(prev) as GameState
  const route = s.routes.find((r) => r.id === routeId)
  if (!route) return prev
  if (patch.price !== undefined && Number.isFinite(patch.price) && patch.price > 0) route.price = Math.round(patch.price)
  if (patch.service) {
    route.service = patch.service
    route.economyMealId = mealIdForService(patch.service)
  }
  if (patch.baggageFee !== undefined) route.baggageFee = clamp(patch.baggageFee, 0, 80)
  if (patch.frequency) route.frequency = patch.frequency
  if (patch.cabinLayout) {
    route.cabinLayout = patch.cabinLayout
    const ac = s.fleet.find((a) => a.id === route.aircraftId)
    if (ac) ac.cabinLayout = patch.cabinLayout
  }
  return s
}

export function retimes(prev: GameState, routeId: string, departHour: number, frequency: Frequency): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const route = s.routes.find((item) => item.id === routeId)
  if (!route) return { state: prev, error: 'That route is already closed.' }
  const hour = Math.max(0, Math.min(23, Math.round(departHour)))
  const placed = placeRoute(s, { ...route, via: route.via, departHour: hour, frequency })
  if (!placed.ok) return { state: prev, error: placed.error }
  route.departHour = hour
  route.frequency = frequency
  route.gateOrigin = placed.gateOrigin
  route.gateDest = placed.gateDest
  route.gateVia = placed.gateVia
  return { state: s, error: '' }
}

export function leaseGate(prev: GameState, gateId: string, kind: 'owned' | 'leased'): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const error = takeGate(s, gateId, kind, true)
  if (error) return { state: prev, error }
  return { state: s, error: '' }
}

export function releaseGate(prev: GameState, gateId: string): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const error = dropGate(s, gateId)
  if (error) return { state: prev, error }
  return { state: s, error: '' }
}

export function unassignGate(prev: GameState, gateId: string): GameState {
  const s = structuredClone(prev) as GameState
  unassignGateRoutes(s, gateId)
  return s
}

export function assignGate(prev: GameState, routeId: string, gateId: string): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const err = assignRouteToGate(s, routeId, gateId)
  if (err) return { state: prev, error: err }
  return { state: s, error: '' }
}

export function bulkReleaseGates(prev: GameState, gateIds: string[]): { state: GameState; count: number; dailySaved: number; refund: number } {
  const s = structuredClone(prev) as GameState
  const res = bulkDropGates(s, gateIds)
  return { state: s, ...res }
}

export function createMeal(prev: GameState, input: { name: string; tier: CustomMeal['tier']; note: string }): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const name = input.name.trim()
  if (name.length < 2) return { state: prev, error: 'Give the meal a name.' }
  if (!s.meals) s.meals = []
  if (s.meals.length >= 8) return { state: prev, error: 'Eight custom meals is enough for one kitchen.' }
  s.meals.push({ id: nid(s, 'ML'), name: name.slice(0, 40), tier: input.tier, note: input.note.trim().slice(0, 140) })
  return { state: s, error: '' }
}

export function assignMeal(prev: GameState, routeId: string, which: 'economy' | 'cabin', mealId: string): GameState {
  const s = structuredClone(prev) as GameState
  const route = s.routes.find((item) => item.id === routeId)
  if (!route) return prev
  const meal = mealById(mealId, s.meals)
  if (which === 'cabin') route.cabinMealId = meal.id
  else {
    route.economyMealId = meal.id
    route.service = meal.service
  }
  return s
}

export function closeRoute(prev: GameState, routeId: string): GameState {
  const s = structuredClone(prev) as GameState
  s.routes = s.routes.filter((r) => r.id !== routeId)
  s.reputation.reliability = clamp(s.reputation.reliability - 0.4, 0, 100)
  return s
}

export function hirePilot(prev: GameState, typeId: string): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const type = getType(typeId)
  const cost = 25_000 + type.crewPayMonthly
  if (s.finance.cash < cost) return { state: prev, error: 'Hiring bonus and first month exceed cash.' }
  s.finance.cash -= cost
  s.pilots.push(makePilot(s, typeId))
  return { state: s, error: '' }
}

export function releasePilot(prev: GameState, pilotId: string): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const pilot = s.pilots.find((p) => p.id === pilotId)
  if (!pilot) return { state: prev, error: 'That pilot is already gone.' }
  const severance = Math.round(pilot.salaryMonthly / 2)
  if (s.finance.cash < severance) return { state: prev, error: 'Severance is half a month of pay.' }
  s.finance.cash -= severance
  s.finance.lifetimeExpenses += severance
  s.pilots = s.pilots.filter((p) => p.id !== pilot.id)
  return { state: s, error: '' }
}

export function hireCabin(prev: GameState): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const cost = 8_000 + 3_600
  if (s.finance.cash < cost) return { state: prev, error: 'Hiring a flight attendant costs the bonus plus the first month.' }
  s.finance.cash -= cost
  s.finance.lifetimeExpenses += cost
  s.cabinCrew = (s.cabinCrew ?? 0) + 1
  return { state: s, error: '' }
}

export function releaseCabin(prev: GameState): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  if ((s.cabinCrew ?? 0) < 1) return { state: prev, error: 'There is no cabin crew left to release.' }
  const need = s.fleet.filter((a) => a.status !== 'lost' && a.status !== 'stored' && s.routes.some((r) => r.aircraftId === a.id))
    .reduce((sum, a) => sum + cabinMinimum(getType(a.typeId).seatCapacity), 0)
  const severance = 900
  if (s.finance.cash < severance) return { state: prev, error: 'Severance is a week of cabin pay.' }
  s.finance.cash -= severance
  s.finance.lifetimeExpenses += severance
  s.cabinCrew -= 1
  if (s.cabinCrew < need) {
    s.reputation.safety = clamp(s.reputation.safety - 0.3, 0, 100)
  }
  return { state: s, error: '' }
}

export function takeLoan(prev: GameState, principal: number, months: number, kind: 'amortizing' | 'bullet'): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const offer = loanOffer(s.finance.credit, s.market.interestBump, principal, months, kind)
  if (!offer.allowed) return { state: prev, error: `${s.finance.credit} credit will not support that principal.` }
  if (principal < 250_000) return { state: prev, error: 'That loan is too small to bother the bank.' }
  s.finance.cash += principal
  s.loans.push({
    id: nid(s, 'LN'),
    name: kind === 'bullet' ? 'Bullet loan' : 'Term loan',
    principal,
    balance: principal,
    rate: offer.rate,
    months,
    monthsLeft: months,
    payment: offer.payment,
    kind,
    openedDay: s.meta.day,
    maturityDay: s.meta.day + months * 30,
  })
  pushNews(s, 'Loan funded', `${principal.toLocaleString('en-US')} at ${(offer.rate * 100).toFixed(1)}%. The maturity date is real.`, SCENE.news, 'Finance')
  return { state: s, error: '' }
}

export function payDown(prev: GameState, loanId: string, amount: number): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const loan = s.loans.find((l) => l.id === loanId)
  if (!loan) return { state: prev, error: 'Loan not found.' }
  const pay = Math.min(loan.balance, amount)
  if (s.finance.cash < pay) return { state: prev, error: 'Not enough cash.' }
  s.finance.cash -= pay
  loan.balance -= pay
  if (loan.balance < 1) {
    s.loans = s.loans.filter((l) => l.id !== loan.id)
    if (s.meta.profitShare > 0) {
      s.meta.profitShare = 0
    }
  }
  return { state: s, error: '' }
}

export function campaign(prev: GameState): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  if (s.meta.day - s.meta.campaignDay < 14) return { state: prev, error: 'The last campaign is still running.' }
  if (s.finance.cash < 75_000) return { state: prev, error: 'A campaign costs $75,000.' }
  s.finance.cash -= 75_000
  s.meta.campaignDay = s.meta.day
  s.reputation.brand = clamp(s.reputation.brand + 1.4, 0, 100)
  s.reputation.trust = clamp(s.reputation.trust + 0.4, 0, 100)
  return { state: s, error: '' }
}

export function resolveMerger(prev: GameState, decision: 'buy' | 'merge' | 'reject'): { state: GameState; error: string } {
  const s = structuredClone(prev) as GameState
  const offer = s.merger
  if (!offer) return { state: prev, error: '' }
  const rival = s.rivals.find((r) => r.id === offer.rivalId)
  s.merger = null
  if (!rival || !rival.alive) return { state: s, error: '' }
  if (decision === 'reject') {
    pushNews(s, `You walked away from ${rival.name}`, 'Their debt is still their problem.', SCENE.merger, 'Deals')
    return { state: s, error: '' }
  }
  if (decision === 'buy' && s.finance.cash < offer.ask) return { state: prev, error: 'You cannot fund the purchase price.' }
  if (decision === 'buy') s.finance.cash -= offer.ask
  s.finance.cash += Math.max(0, rival.cash)
  const year = calendar(s.meta.day).year
  const inherited: OwnedAircraft[] = []
  for (const group of rival.fleet) {
    const type = getType(group.typeId)
    for (let i = 0; i < group.count; i++) {
      const ac: OwnedAircraft = {
        id: nid(s, 'A'),
        tailNumber: `N${300 + s.meta.nextId}Z${String.fromCharCode(65 + (i % 20))}`,
        typeId: group.typeId,
        yearBuilt: Math.max(type.productionStart, year - type.typicalAskAge),
        ownership: 'owned',
        acquiredPrice: Math.round(type.purchasePrice * 0.7),
        leaseMonthly: 0,
        leaseMonthsLeft: 0,
        condition: { airframe: 62, engine1: 58, engine2: 60, avionics: 64, landingGear: 70, cabin: 48, interior: 46 },
        flightHours: 40000,
        cycles: 28000,
        status: 'idle',
        location: rival.home,
        history: [{ year, text: `Inherited from ${rival.name}. Records are incomplete.` }],
        maintenanceDaysLeft: 0,
        holdToday: false,
        ignoredFault: false,
        neglect: 18,
        totalRevenue: 0,
        cabinLayout: 'economy',
      }
      inherited.push(ac)
      s.cabinCrew = (s.cabinCrew ?? 0) + Math.max(1, Math.ceil(type.seatCapacity / 50))
      if (s.pilots.filter((p) => p.typeId === group.typeId).length < 2) {
        s.pilots.push(makePilot(s, group.typeId))
      }
    }
  }
  s.fleet.push(...inherited)
  if (rival.debt > 0) {
    const terms = creditTerms(s.finance.credit, s.market.interestBump + 0.02)
    s.loans.push({
      id: nid(s, 'LN'),
      name: `${rival.name} assumed debt`,
      principal: rival.debt,
      balance: rival.debt,
      rate: Math.max(terms.rate, 0.09),
      months: 24,
      monthsLeft: 24,
      payment: rival.debt * 0.09 / 12,
      kind: 'bullet',
      openedDay: s.meta.day,
      maturityDay: s.meta.day + 24 * 30,
    })
  }
  rival.alive = false
  rival.routes = []
  rival.fleet = []
  s.reputation.brand = clamp((s.reputation.brand + rival.reputation) / 3, 0, 100)
  pushNews(
    s,
    decision === 'buy' ? `${rival.name} acquired` : `Merged with ${rival.name}`,
    `You took ${inherited.length} aircraft and ${rival.debt.toLocaleString('en-US')} of debt. This can make you large, or make you finished.`,
    SCENE.merger,
    'Deals',
  )
  return { state: s, error: '' }
}

export function appraisalLine(s: GameState, ac: OwnedAircraft): number {
  return appraise(ac.typeId, ac.yearBuilt, ac.condition, s.market.usedPriceIndex, calendar(s.meta.day).year)
}

export function setAircraftColor(prev: GameState, aircraftId: string, color: string): GameState {
  const s = structuredClone(prev) as GameState
  const ac = s.fleet.find((a) => a.id === aircraftId)
  if (ac) {
    ac.color = color
  }
  return s
}

