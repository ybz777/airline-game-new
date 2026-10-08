import { getType, illustratedTypes } from '../data/aircraft'
import { SCENE, getAirport } from '../data/airports'
import { EVENTS } from '../data/events'
import { applyCatalogChoice } from '../data/eventCatalog'
import { SIMPLE_RESOLVE, type SimpleFx } from '../data/eventExtras'
import type { CreditRating, Fault, GameState, Modifier } from '../types'
import { amortize, creditTerms, effects, nextCredit, referenceFare } from './economy'
import { distanceNm } from './geo'
import { makeListing, nid, pushNews } from './setup'
import { clamp, rand, calendar } from './util'

export function endGame(s: GameState, reason: string, image: string) {
  s.meta.gameOver = true
  s.meta.gameOverReason = reason
  s.meta.gameOverImage = image
  s.meta.speed = 0
  pushNews(s, 'The airline has stopped', reason, image, 'Game over')
}

export function addModifier(s: GameState, mod: Modifier) {
  s.modifiers = s.modifiers.filter((m) => m.id !== mod.id)
  s.modifiers.push(mod)
}

function applySimple(s: GameState, fx: SimpleFx) {
  const until = s.meta.day + 1
  if (fx.demandMul || fx.fuelMul || fx.maintMul || fx.cargoMul || fx.salaryMul || fx.feeMul) {
    addModifier(s, {
      id: fx.id,
      label: fx.label,
      untilDay: until + fx.days,
      demandMul: fx.demandMul,
      fuelMul: fx.fuelMul,
      maintMul: fx.maintMul,
      cargoMul: fx.cargoMul,
      salaryMul: fx.salaryMul,
      feeMul: fx.feeMul,
    })
  }
  if (fx.cash) s.finance.cash += fx.cash
  if (fx.rep) {
    for (const key of Object.keys(fx.rep) as (keyof NonNullable<SimpleFx['rep']>)[]) {
      const delta = fx.rep[key]
      if (!delta) continue
      s.reputation[key] = clamp(s.reputation[key] + delta, 0, 100)
    }
  }
  if (fx.weather) {
    s.market.weather.push({
      zone: fx.weather.zone,
      untilDay: until + fx.weather.days,
      severity: fx.weather.severity,
      label: fx.weather.label,
    })
  }
  if (fx.economy) s.market.economyIndex = clamp(s.market.economyIndex + fx.economy, 0.6, 1.35)
  if (fx.fuelIndex) s.market.fuelIndex = clamp(s.market.fuelIndex + fx.fuelIndex, 0.55, 2.4)
  if (fx.cargoIndex) s.market.cargoIndex = clamp(s.market.cargoIndex + fx.cargoIndex, 0.45, 2)
  if (fx.interest) s.market.interestBump = clamp(s.market.interestBump + fx.interest, -0.03, 0.08)
  if (fx.usedPrice) s.market.usedPriceIndex = clamp(s.market.usedPriceIndex + fx.usedPrice, 0.4, 1.45)
  pushNews(s, fx.headline, fx.body, fx.image, fx.tag)
}

export function releaseModal(s: GameState, resume: boolean) {
  if (!s.eventQueue) s.eventQueue = []
  if (s.meta.gameOver) {
    s.meta.speed = 0
    return
  }
  if (s.faultPrompt || s.merger || s.pending) {
    s.meta.speed = 0
    return
  }
  const next = s.eventQueue.shift()
  if (next) {
    s.pending = next
    s.meta.speed = 0
    return
  }
  if (resume) s.meta.speed = 1
}

export function rollEvent(s: GameState) {
  if (!s.eventQueue) s.eventQueue = []
  if (s.meta.gameOver) return
  if (s.meta.day < 2 || rand(s.meta) > 0.2) return
  const families = [...new Set(s.fleet.map((a) => getType(a.typeId).family))]
  const weakest = [...s.rivals].filter((r) => r.alive).sort((a, b) => a.cash - a.debt - (b.cash - b.debt))[0]
  const route = s.routes[0]
  const ctx = {
    day: s.meta.day,
    home: s.airline.home,
    homeName: getAirport(s.airline.home).city,
    fuel: s.market.fuelIndex,
    cash: s.finance.cash,
    fleetFamilies: families,
    weakestRival: weakest && (weakest.cash < 8_000_000 || weakest.debt > weakest.cash) ? weakest.name : weakest ? null : null,
    playerRoute: route ? `${route.origin}–${route.dest}` : null,
    fatigue: s.pilots.length ? s.pilots.reduce((sum, p) => sum + p.fatigue, 0) / s.pilots.length : 0,
    hasRoute: s.routes.length > 0,
  }
  const weighted = EVENTS.flatMap((def) => {
    if (def.minDay > s.meta.day) return []
    if (def.once && s.meta.seen.includes(def.id)) return []
    const built = def.build(ctx)
    if (!built) return []
    return Array.from({ length: def.weight }, () => def)
  })
  if (!weighted.length) return
  const def = weighted[Math.floor(rand(s.meta) * weighted.length)]
  const built = def.build(ctx)
  if (!built) return
  if (def.once) s.meta.seen.push(def.id)
  const item = { defId: def.id, day: s.meta.day, title: built.title, body: built.body, image: def.image, choices: built.choices }
  if (s.pending || s.merger || s.faultPrompt) {
    s.eventQueue.push(item)
    return
  }
  s.pending = item
  s.meta.speed = 0
}

export function applyChoice(prev: GameState, choiceId: string): GameState {
  const s = structuredClone(prev) as GameState
  const pending = s.pending
  if (!pending) return s
  const id = pending.defId
  s.pending = null
  if (id === 'accident_report' || id === 'safety_incident') {
    releaseModal(s, true)
    return s
  }
  if (applyCatalogChoice(s, id, choiceId)) {
    releaseModal(s, true)
    return s
  }
  const until = s.meta.day + 1
  const fam = s.fleet[0] ? getType(s.fleet[0].typeId).family : ''
  const simple = SIMPLE_RESOLVE.get(`${id}:${choiceId}`)
  if (simple) {
    applySimple(s, simple)
    releaseModal(s, true)
    return s
  }
  if (id === 'fuel_spike') {
    if (choiceId === 'hedge') {
      const cost = Math.max(80_000, s.finance.cash * 0.04)
      s.finance.cash -= cost
      s.market.hedgeIndex = effects(s).fuel
      s.market.hedgeUntilDay = s.meta.day + 60
      pushNews(s, 'Fuel hedge executed', `You locked a price and paid ${Math.round(cost).toLocaleString('en-US')}.`, SCENE.fuel, 'Fuel')
    } else {
      addModifier(s, { id: 'fuelspike', label: 'Fuel spike', untilDay: until + 50, fuelMul: 1.22 })
      pushNews(s, 'Jet fuel is up sharply', 'Unhedged flying just got more expensive, especially on old aircraft.', SCENE.fuel, 'Fuel')
    }
  } else if (id === 'fuel_slide') {
    addModifier(s, { id: 'fuelslide', label: 'Cheaper fuel', untilDay: until + 30, fuelMul: 0.84 })
    pushNews(s, 'Jet fuel eases', 'Spot prices slipped. The relief is real and temporary.', SCENE.fuel, 'Fuel')
  } else if (id === 'recession') {
    addModifier(s, { id: 'recession', label: 'Recession', untilDay: until + 60, demandMul: 0.82 })
    s.market.economyIndex = clamp(s.market.economyIndex * 0.86, 0.6, 1.2)
    if (choiceId === 'cut') {
      const old = [...s.fleet].filter((a) => a.status === 'idle').sort((a, b) => a.yearBuilt - b.yearBuilt)[0]
      if (old) {
        old.status = 'stored'
        pushNews(s, `${old.tailNumber} is stored`, 'You parked an aircraft to cut exposure.', SCENE.apron, 'Fleet')
      }
    }
    pushNews(s, 'Demand is rolling over', 'Business travel is thinner. Fares and fleet size both matter.', SCENE.recession, 'Economy')
  } else if (id === 'tourism') {
    addModifier(s, { id: 'tourism', label: 'Tourism boom', untilDay: until + 28, demandMul: choiceId === 'market' ? 1.22 : 1.14 })
    if (choiceId === 'market') {
      s.finance.cash -= 60_000
      s.reputation.brand = clamp(s.reputation.brand + 2, 0, 100)
    }
    pushNews(s, 'Leisure bookings surge', 'Terminals are busy. The question is whether the seats are yours.', SCENE.boom, 'Demand')
  } else if (id === 'pilot_pay') {
    if (choiceId === 'raise') {
      s.market.salaryIndex *= 1.12
      for (const p of s.pilots) p.fatigue = clamp(p.fatigue - 8, 0, 100)
      pushNews(s, 'Pilot pay increased', 'Crews stayed. The monthly bill did not.', SCENE.news, 'Crew')
    } else {
      s.market.salaryIndex *= 1.05
      for (const p of s.pilots) p.fatigue = clamp(p.fatigue + 10, 0, 100)
      pushNews(s, 'Pay freeze meets a shortage', 'Fatigue is up. So, quietly, is the market wage.', SCENE.news, 'Crew')
    }
  } else if (id === 'storm') {
    s.market.weather.push({ zone: getAirport(s.airline.home).weatherZone, untilDay: until + 3, severity: choiceId === 'operate' ? 0.85 : 0.55, label: 'Storm' })
    if (choiceId === 'waive') s.reputation.trust = clamp(s.reputation.trust + 1, 0, 100)
    else s.reputation.satisfaction = clamp(s.reputation.satisfaction - 1.5, 0, 100)
    pushNews(s, 'Storm system over the network', 'Delays will stack until the weather moves.', SCENE.rain, 'Weather')
  } else if (id === 'price_war') {
    if (choiceId === 'match' && s.routes[0]) {
      const cheapest = [...s.routes].sort((a, b) => a.price - b.price)[0]
      cheapest.price = Math.max(59, Math.round(cheapest.price * 0.88))
      pushNews(s, `Fare cut on ${cheapest.origin}–${cheapest.dest}`, 'You matched the war. Load may rise. Margin may not.', SCENE.gate, 'Competition')
    } else {
      pushNews(s, 'A rival is discounting', 'You held your fare. Some passengers will not.', SCENE.gate, 'Competition')
    }
  } else if (id === 'rival_fail') {
    const dying = [...s.rivals].filter((r) => r.alive).sort((a, b) => a.cash - b.cash)[0]
    if (dying) {
      dying.alive = false
      dying.routes = []
      s.market.usedPriceIndex = clamp(s.market.usedPriceIndex * 0.88, 0.55, 1.25)
      for (const group of dying.fleet) {
        if (!illustratedTypes().some((t) => t.id === group.typeId)) continue
        for (let i = 0; i < Math.min(3, group.count); i++) {
          s.listings.unshift(makeListing(s, group.typeId, { price: Math.round(getType(group.typeId).purchasePrice * 0.7), parkedAt: dying.home }))
        }
      }
      s.listings = s.listings.slice(0, 40)
      pushNews(s, `${dying.name} is bankrupt`, 'Used aircraft just got cheaper. Their routes will not stay empty.', SCENE.recession, 'Competition')
    }
  } else if (id === 'cheap_metal' || id === 'value_drop') {
    const mul = id === 'cheap_metal' ? 0.88 : 0.9
    s.market.usedPriceIndex = clamp(s.market.usedPriceIndex * mul, 0.5, 1.3)
    for (const listing of s.listings) listing.price = Math.round(listing.price * mul)
    pushNews(s, 'Aircraft asking prices moved down', 'The same airframe now costs less. The engines did not get younger.', SCENE.apron, 'Market')
  } else if (id === 'grounding') {
    const family = fam
    if (choiceId === 'comply') {
      s.market.groundedFamilies.push({ family, untilDay: until + 6, reason: 'Bulletin inspection' })
      for (const ac of s.fleet) {
        if (getType(ac.typeId).family === family && ac.status !== 'lost') {
          ac.status = 'maintenance'
          ac.maintenanceDaysLeft = 5
        }
      }
      s.reputation.safety = clamp(s.reputation.safety + 2, 0, 100)
      pushNews(s, `${family} aircraft grounded for inspection`, 'You complied. The schedule will hurt. The record will not.', SCENE.hangar, 'Safety')
    } else {
      for (const ac of s.fleet) {
        if (getType(ac.typeId).family === family) {
          const age = calendar(s.meta.day).year - ac.yearBuilt
          const ageW = 1 + Math.max(0, age - 20) / 26
          ac.neglect = clamp((ac.neglect ?? 0) + 22 * ageW, 0, 100)
          ac.ignoredFault = true
          ac.condition.engine1 = clamp(ac.condition.engine1 - 10, 5, 100)
        }
      }
      s.reputation.safety = clamp(s.reputation.safety - 6, 0, 100)
      pushNews(s, 'Bulletin deferred', 'The aircraft are still flying. The risk is now concentrated.', SCENE.hangar, 'Safety')
    }
  } else if (id === 'parts') {
    s.market.partsMul *= 1.35
    addModifier(s, { id: 'parts', label: 'Parts shortage', untilDay: until + 30, maintMul: 1.28 })
    pushNews(s, 'Shops are short of parts', 'Maintenance just got slower and more expensive.', SCENE.hangar, 'Maintenance')
  } else if (id === 'holiday') {
    addModifier(s, { id: 'holiday', label: 'Holiday peak', untilDay: until + 14, demandMul: 1.2 })
    pushNews(s, 'Holiday peak is here', 'Families are traveling. Missed departures will be remembered.', SCENE.boom, 'Demand')
  } else if (id === 'new_lcc') {
    if (!s.rivals.some((r) => r.id === 'fieldlight')) {
      const home = s.airline.home
      const dest = AIRPORT_OTHER(home)
      const dist = distanceNm(getAirport(home), getAirport(dest))
      s.rivals.push({
        id: 'fieldlight', name: 'Fieldlight Air', iata: 'FL', strategy: 'ulcc', cash: 3_800_000, debt: 11_000_000,
        reputation: 24, home, color: '#d98b6a', fleet: [{ typeId: 'b737-800', count: 2 }], alive: true,
        routes: [{ origin: home, dest, typeId: 'b737-800', dailySeats: 162, price: Math.round(referenceFare(dist) * 0.74), service: 'none', frequency: 'daily' }],
      })
      pushNews(s, 'Fieldlight Air launches', `A new low-cost carrier is selling ${home}–${dest} below a rational fare.`, SCENE.gate, 'Competition')
    }
  } else if (id === 'slots') {
    if (choiceId === 'take') {
      s.finance.cash -= 250_000
      const ap = getAirport(s.airline.home)
      s.market.slotBonus[ap.id] = (s.market.slotBonus[ap.id] ?? 0) + 2
      pushNews(s, `Extra gates at ${ap.city}`, 'You bought room to grow. The invoice is already paid.', SCENE.construction, 'Airport')
    }
  } else if (id === 'audit') {
    if (choiceId === 'open') {
      if (s.reputation.safety < 35 || s.meta.criticalDispatches > 0) {
        const fine = 350_000 + s.meta.criticalDispatches * 200_000
        s.finance.cash -= fine
        pushNews(s, 'Audit fine assessed', 'The records showed deferred risk. The check is large.', SCENE.news, 'Safety')
      } else {
        s.reputation.trust = clamp(s.reputation.trust + 2, 0, 100)
        pushNews(s, 'Audit closed clean', 'Inspectors left without a fine.', SCENE.news, 'Safety')
      }
    } else {
      s.finance.cash -= 180_000
      s.reputation.trust = clamp(s.reputation.trust - 3, 0, 100)
      s.reputation.safety = clamp(s.reputation.safety - 2, 0, 100)
      pushNews(s, 'Audit delayed', 'Counsel bought time. The agency noticed.', SCENE.news, 'Safety')
    }
  } else if (id === 'engine_warn') {
    const ac = s.fleet.find((a) => a.status !== 'lost' && a.status !== 'stored')
    if (ac) {
      const fault: Fault = {
        id: nid(s, 'F'), aircraftId: ac.id, system: 'engine1', severity: 'critical',
        title: `Engine trend — ${ac.tailNumber}`,
        detail: 'Monitoring shows abnormal vibration on engine 1. A shop visit is the conservative choice. Dispatching is a different kind of decision.',
        repairCost: Math.round(getType(ac.typeId).checkCost * 0.85), groundDays: 3, day: s.meta.day,
      }
      s.faults.push(fault)
      pushNews(s, fault.title, fault.detail, SCENE.hangar, 'Maintenance')
    }
  } else if (id === 'cargo') {
    if (choiceId === 'sign') {
      addModifier(s, { id: 'cargo', label: 'Cargo contract', untilDay: until + 45, cargoMul: 1.55 })
      pushNews(s, 'Belly cargo contract signed', 'Extra revenue on every departure. Cancellations now have a shipper attached.', SCENE.apron, 'Cargo')
    }
  } else if (id === 'rates') {
    s.market.interestBump += 0.018
    pushNews(s, 'Borrowing costs rise', 'New loans are priced higher. Old coupons are unchanged.', SCENE.news, 'Finance')
  } else if (id === 'subsidy') {
    if (choiceId === 'take') {
      addModifier(s, { id: 'subsidy', label: 'Route subsidy', untilDay: until + 60 })
      const short = [...s.routes].sort((a, b) => a.price - b.price)[0]
      if (short) {
        const cap = Math.round(referenceFare(distanceNm(getAirport(short.origin), getAirport(short.dest))) * 1.02)
        short.price = Math.min(short.price, cap)
      }
      pushNews(s, 'Public-service subsidy accepted', 'Short flights earn support. The fare cap is part of the deal.', SCENE.regional, 'Policy')
    }
  } else if (id === 'bailout') {
    if (choiceId === 'take') {
      s.finance.cash += 3_000_000
      s.meta.profitShare = 0.15
      s.meta.profitShareUntil = s.meta.day + 365
      const rate = 0.14
      s.loans.push({
        id: nid(s, 'LN'), name: 'Rescue note', principal: 3_000_000, balance: 3_000_000, rate, months: 18, monthsLeft: 18,
        payment: 3_000_000 * rate / 12, kind: 'bullet', openedDay: s.meta.day, maturityDay: s.meta.day + 540,
      })
      s.finance.credit = 'Poor'
      pushNews(s, 'Rescue financing closed', 'Three million arrived. A profit skim and a bullet maturity came with it.', SCENE.news, 'Finance')
    } else {
      pushNews(s, 'Rescue financing declined', 'Nobody is coming to refill the account.', SCENE.news, 'Finance')
    }
  } else if (id === 'noise') {
    addModifier(s, { id: 'noise', label: 'Noise surcharge', untilDay: until + 120, oldFeeAdd: 900 })
    pushNews(s, 'Noise surcharges begin', 'Older aircraft pay more every time they land.', SCENE.night, 'Regulation')
  } else if (id === 'runway') {
    s.market.closedAirports.push({ id: s.airline.home, untilDay: until + 6, reason: 'Runway construction' })
    s.market.weather.push({ zone: getAirport(s.airline.home).weatherZone, untilDay: until + 6, severity: 0.45, label: 'Construction' })
    pushNews(s, `${getAirport(s.airline.home).city} runway closed`, 'Capacity is down for six days.', SCENE.construction, 'Airport')
  } else if (id === 'recovery') {
    s.market.economyIndex = clamp(s.market.economyIndex * 1.08, 0.7, 1.25)
    addModifier(s, { id: 'recovery', label: 'Demand recovery', untilDay: until + 40, demandMul: 1.1 })
    pushNews(s, 'Bookings recover', 'The market is willing to fly again. Reliability decides who gets them.', SCENE.boom, 'Economy')
  } else if (id === 'snow') {
    s.market.weather.push({ zone: 'mountain', untilDay: until + 4, severity: 0.9, label: 'Snow' })
    s.market.weather.push({ zone: 'midwest', untilDay: until + 3, severity: 0.75, label: 'Snow' })
    pushNews(s, 'Winter storm in the north', 'Denver and Chicago are slowing down.', SCENE.snow, 'Weather')
  } else if (id === 'health') {
    addModifier(s, { id: 'health', label: 'Health emergency', untilDay: until + 80, demandMul: choiceId === 'park' ? 0.55 : 0.42, cargoMul: 1.8 })
    s.market.usedPriceIndex = clamp(s.market.usedPriceIndex * 0.75, 0.45, 1)
    if (choiceId === 'park') {
      const idle = s.fleet.filter((a) => a.status === 'idle')
      idle.slice(1).forEach((a) => { a.status = 'stored' })
    }
    pushNews(s, 'A global health emergency', 'Passenger demand has collapsed. Parked aircraft are suddenly everywhere.', SCENE.recession, 'Crisis')
  } else if (id === 'merger_seed') {
    const rival = [...s.rivals].filter((r) => r.alive).sort((a, b) => (a.cash - a.debt) - (b.cash - b.debt))[0]
    if (rival) {
      s.merger = { rivalId: rival.id, ask: Math.max(400_000, Math.round(rival.debt * 0.06)), day: s.meta.day }
      pushNews(s, `${rival.name} is entertaining a sale`, 'Read the debt before you read the fleet.', SCENE.merger, 'Deals')
    }
  } else if (id === 'strike') {
    if (choiceId === 'pay') {
      s.finance.cash -= 40_000
      pushNews(s, 'Contract ramp crews hired', 'You paid to keep the turns moving.', SCENE.strike, 'Airport')
    } else {
      s.market.weather.push({ zone: getAirport(s.airline.home).weatherZone, untilDay: until + 5, severity: 0.6, label: 'Labor action' })
      pushNews(s, 'Ramp slowdown', 'Turns at home will miss for several days.', SCENE.strike, 'Airport')
    }
  } else if (id === 'credit_up' && choiceId === 'take') {
    s.finance.credit = nextCredit(s.finance.credit, true)
    pushNews(s, `Credit is now ${s.finance.credit}`, 'The bank moved you up a notch. The limit moved with it.', SCENE.news, 'Finance')
  } else if (id === 'sport') {
    addModifier(s, { id: 'sport', label: 'City event', untilDay: until + 10, demandMul: 1.16 })
    if (choiceId === 'raise') {
      for (const r of s.routes) {
        if (r.origin === s.airline.home || r.dest === s.airline.home) r.price = Math.round(r.price * 1.15)
      }
    } else s.reputation.brand = clamp(s.reputation.brand + 1.5, 0, 100)
    pushNews(s, `Event week in ${getAirport(s.airline.home).city}`, 'The city is full. After that, it will not be.', SCENE.boom, 'Demand')
  }
  releaseModal(s, true)
  return s
}

function AIRPORT_OTHER(home: string): string {
  if (home === 'DFW') return 'AUS'
  if (home === 'AUS') return 'DFW'
  return 'DFW'
}

export function loanOffer(rating: CreditRating, bump: number, principal: number, months: number, kind: 'amortizing' | 'bullet') {
  const terms = creditTerms(rating, bump)
  const rate = terms.rate
  const payment = kind === 'bullet' ? principal * rate / 12 : amortize(principal, rate, months)
  return { rate, payment, allowed: principal <= terms.max }
}
