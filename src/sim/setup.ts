import { forSaleTypes, getType, marketShot } from '../data/aircraft'
import { availabilityWeight, builtCount, rarityOf } from '../data/production'
import { AIRPORTS, SCENE } from '../data/airports'
import { takeIdentity } from '../data/pilotRoster'
import { PAST_AIRLINES, RIVALS } from '../data/world'
import type { Condition, GameState, HistoryEntry, Listing, OwnedAircraft, Pilot, Strategy } from '../types'
import { calendar, clamp, formatDate, pick, rand, randInt } from './util'

export function nid(s: GameState, prefix: string): string {
  s.meta.nextId += 1
  return `${prefix}${s.meta.nextId}`
}

export function pushNews(s: GameState, headline: string, body: string, image: string, tag: string) {
  s.news.unshift({ id: nid(s, 'N'), day: s.meta.day, headline, body, image, tag })
  s.news = s.news.slice(0, 48)
}

export function tailNumber(meta: { rng: number }): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  const n = randInt(meta, 100, 999)
  return `N${n}${letters[randInt(meta, 0, letters.length - 1)]}${letters[randInt(meta, 0, letters.length - 1)]}`
}

export type MaintGrade = 'Poor' | 'Fair' | 'Good' | 'Excellent'

export function conditionGrade(c: Condition): MaintGrade {
  const avg = (c.airframe + c.engine1 + c.engine2 + c.avionics + c.landingGear + c.cabin + c.interior) / 7
  if (avg >= 86) return 'Excellent'
  if (avg >= 74) return 'Good'
  if (avg >= 58) return 'Fair'
  return 'Poor'
}

export function buildHistory(meta: { rng: number }, yearBuilt: number, yearNow: number, grade: MaintGrade): { history: HistoryEntry[]; tailStrike: boolean; operators: number } {
  const a = pick(meta, PAST_AIRLINES)
  let b = pick(meta, PAST_AIRLINES)
  if (b === a) b = PAST_AIRLINES[0] === a ? PAST_AIRLINES[1] : PAST_AIRLINES[0]
  const rows: HistoryEntry[] = [{ year: yearBuilt, text: `Manufactured and delivered to ${a}.` }]
  let operators = 1
  const age = yearNow - yearBuilt
  if (age > 6) {
    operators += 1
    rows.push({ year: yearBuilt + randInt(meta, 4, Math.min(10, age)), text: `Sold to ${b}.` })
  }
  if (age > 16 && rand(meta) > 0.4) {
    operators += 1
    const c = PAST_AIRLINES.find((name) => name !== a && name !== b) ?? b
    rows.push({ year: yearBuilt + randInt(meta, 12, Math.min(20, age)), text: `Moved to ${c} for shorter sectors.` })
  }
  let tailStrike = false
  if (age > 8 && rand(meta) < 0.16) {
    tailStrike = true
    const y = yearBuilt + randInt(meta, 6, Math.max(7, age - 1))
    rows.push({ year: y, text: grade === 'Poor'
      ? `Minor tail strike in ${y}. The repair was signed off, but the records are thin.`
      : `Minor tail strike in ${y}. Repaired and returned to service.` })
  }
  if (age > 5 && rand(meta) < 0.2) {
    const y = yearBuilt + randInt(meta, 3, Math.max(4, age - 1))
    rows.push({ year: y, text: 'Bird strike on departure. The engine was inspected and the aircraft returned to service.' })
  }
  if (age > 7 && rand(meta) < 0.12) {
    const y = yearBuilt + randInt(meta, 4, Math.max(5, age - 1))
    rows.push({ year: y, text: 'Hard landing. Gear and fuselage checks were completed before the next revenue flight.' })
  }
  if (age > 4 && rand(meta) < 0.1) {
    rows.push({ year: yearBuilt + randInt(meta, 2, Math.max(3, age - 1)), text: 'Minor ground damage from a tug. Skin repaired.' })
  }
  if (age > 6 && rand(meta) < 0.1) {
    rows.push({ year: yearBuilt + randInt(meta, 3, Math.max(4, age - 1)), text: 'Lightning strike. Systems checked, no lasting write-up.' })
  }
  if (rand(meta) < (grade === 'Excellent' ? 0.45 : 0.18)) {
    rows.push({ year: Math.max(yearBuilt + 1, yearNow - randInt(meta, 1, 4)), text: 'Engines overhauled. Shop visit closed with the current time and cycles.' })
  } else if (grade === 'Poor' && rand(meta) < 0.5) {
    rows.push({ year: Math.max(yearBuilt + 1, yearNow - 2), text: 'An engine shop visit was quoted and then deferred.' })
  }
  if (rand(meta) < 0.35) rows.push({ year: Math.max(yearBuilt + 1, yearNow - 1), text: 'Parked after the previous operator cut the route.' })
  rows.push({ year: yearNow, text: `Listed. Maintenance record: ${grade.toLowerCase()}. ${operators} previous operator${operators === 1 ? '' : 's'}.` })
  return { history: rows, tailStrike, operators }
}

function cond(meta: { rng: number }, base: number, spread: number): Condition {
  const j = () => clamp(Math.round(base + (rand(meta) - 0.5) * spread), 12, 98)
  return { airframe: j(), engine1: j(), engine2: j(), avionics: j(), landingGear: j(), cabin: j(), interior: j() }
}

function askPrice(typeId: string, yearBuilt: number, year: number, condition: Condition, grade: MaintGrade, tailStrike: boolean, cycles: number, usedIndex: number): number {
  const type = getType(typeId)
  const age = Math.max(1, year - yearBuilt)
  const avg = (condition.airframe + condition.engine1 + condition.engine2 + condition.avionics + condition.landingGear + condition.cabin + condition.interior) / 7
  let price = type.purchasePrice * (0.55 + avg / 140)
  const ageDelta = age - type.typicalAskAge
  price *= Math.max(0.32, 1 - ageDelta * 0.028)
  const heavy = age * 1400
  if (cycles > heavy * 1.25) price *= 0.86
  else if (cycles < heavy * 0.72) price *= 1.08
  if (grade === 'Poor') price *= 0.78
  else if (grade === 'Fair') price *= 0.92
  else if (grade === 'Excellent') price *= 1.1
  if (tailStrike && grade === 'Poor') price *= 0.84
  else if (tailStrike) price *= 0.92
  const built = builtCount(typeId)
  const rare = rarityOf(typeId)
  if (rare === 'Very rare') price *= 1.18
  else if (rare === 'Rare') price *= 1.08
  else if (built >= 3000) price *= 0.94
  price *= usedIndex
  return Math.max(180_000, Math.round(price))
}

export function makeListing(s: GameState, typeId: string, opts: Partial<Listing> & { yearBuilt?: number } = {}): Listing {
  const type = getType(typeId)
  const year = calendar(s.meta.day).year
  let yearBuilt = opts.yearBuilt ?? (year - type.typicalAskAge + randInt(s.meta, -5, 4))
  if (opts.yearBuilt == null) {
    yearBuilt = Math.max(type.productionStart, yearBuilt)
    yearBuilt = Math.min(yearBuilt, type.productionEnd ?? (year - 1), year - 1)
  }
  const age = Math.max(1, year - yearBuilt)
  const condition = opts.condition ?? cond(s.meta, clamp(94 - age * 1.05, 38, 92), 22)
  const grade = opts.maintenance ?? conditionGrade(condition)
  const told = opts.history
    ? { history: opts.history, tailStrike: opts.tailStrike ?? false, operators: opts.operators ?? 2 }
    : buildHistory(s.meta, yearBuilt, year, grade)
  const cycles = opts.cycles ?? Math.round(age * randInt(s.meta, grade === 'Poor' ? 1300 : 800, grade === 'Excellent' ? 1200 : 1700))
  const price = opts.price ?? askPrice(typeId, yearBuilt, year, condition, grade, told.tailStrike, cycles, s.market.usedPriceIndex)
  return {
    id: opts.id ?? nid(s, 'L'),
    typeId,
    yearBuilt,
    price,
    leaseMonthly: opts.leaseMonthly ?? Math.round(type.leaseMonthly * (grade === 'Poor' ? 0.82 : grade === 'Excellent' ? 1.08 : 0.94) * (0.92 + rand(s.meta) * 0.16)),
    cycles,
    flightHours: opts.flightHours ?? Math.round(cycles * (1.15 + rand(s.meta) * 0.55)),
    condition,
    history: told.history,
    tailNumber: opts.tailNumber ?? tailNumber(s.meta),
    parkedAt: opts.parkedAt ?? pick(s.meta, AIRPORTS).id,
    daysListed: opts.daysListed ?? randInt(s.meta, 1, 50),
    forced: opts.forced ?? false,
    photo: opts.photo ?? marketShot(typeId, Math.floor(rand(s.meta) * 1000)),
    maintenance: grade,
    operators: told.operators,
    tailStrike: told.tailStrike,
  }
}

export function pickSaleType(meta: { rng: number }) {
  const types = forSaleTypes()
  const weights = types.map((t) => availabilityWeight(t.id, t.era, t.category, t.seatCapacity))
  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = rand(meta) * total
  for (let i = 0; i < types.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return types[i]
  }
  return types[types.length - 1]
}

export function topUpMarket(s: GameState, target = 28) {
  while (s.listings.length < target) {
    s.listings.push(makeListing(s, pickSaleType(s.meta).id))
  }
}

export function evolveMarket(s: GameState) {
  if (s.meta.day <= 0) return
  for (const listing of s.listings) listing.daysListed += 1
  if (s.listings.length > 22 && rand(s.meta) < 0.45) {
    const aged = s.listings.filter((l) => l.daysListed > 10)
    const pool = aged.length ? aged : s.listings
    const gone = pool[Math.floor(rand(s.meta) * pool.length)]
    s.listings = s.listings.filter((l) => l.id !== gone.id)
  }
  const addOne = () => s.listings.push(makeListing(s, pickSaleType(s.meta).id))
  if (s.listings.length < 36 && rand(s.meta) < 0.72) addOne()
  while (s.listings.length < 24) addOne()
  for (const listing of s.listings) {
    if (rand(s.meta) < 0.16) {
      listing.price = Math.max(180_000, Math.round(listing.price * (0.97 + rand(s.meta) * 0.06)))
    }
  }
  if (s.meta.day % 7 === 0) {
    const roll = rand(s.meta)
    if (roll < 0.1) {
      s.market.usedPriceIndex = clamp(s.market.usedPriceIndex * 1.06, 0.55, 1.35)
      for (const listing of s.listings) listing.price = Math.round(listing.price * 1.04)
      pushNews(s, 'Used aircraft are scarce', 'Lessors are holding metal. Asking prices moved up.', SCENE.apron, 'Market')
    } else if (roll < 0.2) {
      s.market.usedPriceIndex = clamp(s.market.usedPriceIndex * 0.94, 0.5, 1.3)
      for (const listing of s.listings) listing.price = Math.round(listing.price * 0.96)
      pushNews(s, 'A lessor is clearing the book', 'Several airframes hit the market at once. Prices eased.', SCENE.apron, 'Market')
      addOne(); addOne()
    } else if (roll < 0.28) {
      const aging = forSaleTypes().filter((t) => t.era === 'aging' || t.era === 'classic')
      const type = pick(s.meta, aging.length ? aging : forSaleTypes())
      addOne()
      s.listings.push(makeListing(s, type.id, { parkedAt: pick(s.meta, AIRPORTS).id }))
      pushNews(s, `${type.manufacturer} ${type.model} retirements`, 'An airline is parking the type. The used market just got deeper.', SCENE.apron, 'Market')
    }
  }
  if (s.listings.length > 40) {
    s.listings.sort((a, b) => a.daysListed - b.daysListed)
    s.listings.length = 40
  }
}

export function seedMarket(s: GameState) {
  const year = calendar(s.meta.day).year
  s.listings = [
    makeListing(s, 'md-82', {
      forced: true, yearBuilt: 1988, price: 1_200_000, cycles: 51_000, flightHours: 68_400, parkedAt: 'DFW',
      condition: { airframe: 69, engine1: 47, engine2: 54, avionics: 63, landingGear: 77, cabin: 32, interior: 36 },
      history: [
        { year: 1988, text: 'Manufactured and delivered to Civic Air.' },
        { year: 1999, text: 'Sold to Red Canyon during a fleet renewal.' },
        { year: 2011, text: 'Moved to high-cycle short-haul flying.' },
        { year: 2024, text: 'Stored in the desert after an engine shop visit was deferred.' },
        { year: year, text: 'Listed. The price is low because the engines and cabin are not.' },
      ],
    }),
    makeListing(s, 'b737-300', {
      forced: true, yearBuilt: 1992, price: 2_400_000, cycles: 42_800, flightHours: 61_200, parkedAt: 'AUS',
      condition: { airframe: 74, engine1: 71, engine2: 76, avionics: 80, landingGear: 84, cabin: 58, interior: 55 },
      history: [
        { year: 1992, text: 'Manufactured.' },
        { year: 1992, text: 'Operated by Lakeshore for eleven years.' },
        { year: 2003, text: 'Transferred to Harbor Pacific.' },
        { year: 2016, text: 'Used on leisure routes with high summer utilization.' },
        { year: 2025, text: 'Parked after a cabin refresh was quoted and declined.' },
        { year: year, text: 'Offered to a startup that can live with classic economics.' },
      ],
    }),
    makeListing(s, 'b737-800', {
      forced: true, yearBuilt: 2003, price: 11_800_000, cycles: 28_400, flightHours: 49_100, parkedAt: 'DEN',
      condition: { airframe: 86, engine1: 84, engine2: 88, avionics: 90, landingGear: 91, cabin: 82, interior: 80 },
    }),
    makeListing(s, 'a319', {
      forced: true, yearBuilt: 2005, price: 8_700_000, cycles: 26_200, flightHours: 44_600, parkedAt: 'IAH',
      condition: { airframe: 88, engine1: 90, engine2: 87, avionics: 92, landingGear: 90, cabin: 84, interior: 83 },
    }),
  ]
  while (s.listings.length < 30) {
    s.listings.push(makeListing(s, pickSaleType(s.meta).id, { parkedAt: pick(s.meta, AIRPORTS).id }))
  }
}

export function makePilot(s: GameState, typeId: string): Pilot {
  const type = getType(typeId)
  const who = takeIdentity(new Set(s.pilots.map((p) => p.portraitId)))
  const hours = randInt(s.meta, 2800, 14000)
  const certifications = ['ATP', 'Instrument', `${type.model} type rating`]
  if (hours >= 8000) certifications.push('Line check')
  return {
    id: nid(s, 'P'),
    name: who.name,
    hours,
    salaryMonthly: Math.round(type.crewPayMonthly * (0.92 + rand(s.meta) * 0.2)),
    fatigue: randInt(s.meta, 8, 28),
    training: randInt(s.meta, 62, 95),
    reliability: randInt(s.meta, 70, 96),
    typeId,
    hiredDay: s.meta.day,
    rested: true,
    gender: who.gender,
    age: who.age,
    portraitId: who.id,
    morale: randInt(s.meta, 58, 92),
    certifications,
  }
}

function openingNeglect(listing: Listing): number {
  let n = 0
  if (listing.maintenance === 'Poor') n += 8
  else if (listing.maintenance === 'Fair') n += 3
  if (listing.tailStrike && listing.maintenance === 'Poor') n += 6
  else if (listing.tailStrike) n += 3
  return Math.min(14, n)
}

export function deliverAircraft(s: GameState, listing: Listing, ownership: OwnedAircraft['ownership'], price: number, leaseMonthly: number): OwnedAircraft {
  const cal = calendar(s.meta.day)
  const prevOp = listing.history.find((h) => h.text.includes('Manufactured and delivered to'))?.text.replace('Manufactured and delivered to ', '').replace('.', '') || 'Global Aviation Capital'
  const ac: OwnedAircraft = {
    id: nid(s, 'A'),
    tailNumber: listing.tailNumber,
    typeId: listing.typeId,
    yearBuilt: listing.yearBuilt,
    ownership,
    acquiredPrice: price,
    leaseMonthly,
    leaseMonthsLeft: ownership === 'leased' ? 36 : 0,
    condition: structuredClone(listing.condition),
    flightHours: listing.flightHours,
    cycles: listing.cycles,
    status: 'idle',
    location: s.airline.home,
    history: [...listing.history, { year: cal.year, text: `Acquired by ${s.airline.name}.` }],
    maintenanceDaysLeft: 0,
    holdToday: false,
    ignoredFault: false,
    neglect: openingNeglect(listing),
    maintenance: listing.maintenance,
    tailStrike: listing.tailStrike,
    totalRevenue: 0,
    cabinLayout: 'economy',
    purchaseDay: s.meta.day,
    purchaseDateLabel: formatDate(s.meta.day),
    previousOperator: prevOp,
    flightsCompleted: 0,
    delaysCount: 0,
    repairsCount: 0,
    serviceLog: [
      {
        day: s.meta.day,
        dateLabel: formatDate(s.meta.day),
        kind: 'delivery',
        title: 'Delivered to airline fleet',
        detail: `Acquired via ${ownership} agreement. Previous operator: ${prevOp}.`,
        cost: price,
      },
    ],
  }
  s.fleet.push(ac)
  s.pilots.push(makePilot(s, listing.typeId), makePilot(s, listing.typeId), makePilot(s, listing.typeId), makePilot(s, listing.typeId))
  s.cabinCrew = (s.cabinCrew ?? 0) + Math.max(1, Math.ceil(getType(listing.typeId).seatCapacity / 50))
  return ac
}

export function freshState(seed: number): GameState {
  return {
    meta: {
      created: false, day: 0, rng: seed, speed: 0, gameOver: false, gameOverReason: '', gameOverImage: SCENE.recession,
      flightSeq: 0, nextId: 10, criticalDispatches: 0, campaignDay: -99, profitShare: 0, profitShareUntil: 0,
      seen: [], accidents: 0, insuranceLoad: 1, investigationUntil: 0, view: 'overview', showBriefing: true,
    },
    airline: { name: '', iata: '', home: 'AUS', strategy: 'regional', color: '#c52828' },
    finance: { cash: 5_000_000, credit: 'Poor', overdue: 0, lifetimeRevenue: 0, lifetimeExpenses: 0 },
    reputation: { satisfaction: 8, reliability: 9, safety: 22, service: 6, price: 7, trust: 6, brand: 5 },
    fleet: [], routes: [], gates: [], accidentLog: [], meals: [], pilots: [], cabinCrew: 0, loans: [], rivals: structuredClone(RIVALS), listings: [], news: [], faults: [],
    pending: null, eventQueue: [], merger: null, faultPrompt: null, reports: [], history: [], modifiers: [], lastReport: null,
    inspectId: null, inspectKind: null,
    market: {
      fuelIndex: 1, demandIndex: 1, economyIndex: 1, usedPriceIndex: 1, interestBump: 0, hedgeUntilDay: 0, hedgeIndex: 1,
      groundedFamilies: [], closedAirports: [], salaryIndex: 1, cargoIndex: 1, weather: [], partsMul: 1, slotBonus: {},
    },
  }
}

export function createNewGame(input: { name: string; iata: string; home: string; strategy: Strategy; color: string }): GameState {
  const s = freshState((Date.now() ^ (input.name.length * 997)) >>> 0)
  s.meta.created = true
  s.airline = { name: input.name.trim(), iata: input.iata.trim().toUpperCase(), home: input.home, strategy: input.strategy, color: input.color }
  if (input.strategy === 'ulcc') s.reputation.price = 14
  if (input.strategy === 'premium' || input.strategy === 'full') s.reputation.service = 12
  seedMarket(s)
  s.news = [
    { id: 'n1', day: 0, headline: 'Used narrow-body prices stay soft', body: 'Aging MD-80s and 737 Classics are available to anyone with a tolerance for fuel and maintenance.', image: SCENE.apron, tag: 'Market' },
    { id: 'n2', day: 0, headline: 'Prairie Jet trims Texas fares', body: 'The Dallas-based low-cost carrier is defending share with sub-$100 seats.', image: SCENE.gate, tag: 'Competition' },
    { id: 'n3', day: 0, headline: 'MesaLink holds the Austin bank', body: 'The regional flies multiple daily frequencies to Dallas and Houston with E175s.', image: SCENE.regional, tag: 'Competition' },
    { id: 'n4', day: 0, headline: 'Summit Airways keeps premium yields', body: 'Denver’s full-service carrier is not interested in a race to the bottom.', image: SCENE.boom, tag: 'Competition' },
  ]
  s.history.push({ day: 0, cash: s.finance.cash, profit: 0, pax: 0, fuel: s.market.fuelIndex })
  return s
}
