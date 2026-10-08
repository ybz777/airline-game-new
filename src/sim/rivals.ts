import { getType, illustratedTypes } from '../data/aircraft'
import { AIRPORTS, getAirport } from '../data/airports'
import type { GameState, Rival } from '../types'
import { distanceNm, pairKey } from './geo'
import { effects, fliesOn, referenceFare } from './economy'
import { makeListing, pushNews } from './setup'
import { calendar, clamp, pick, rand } from './util'
import { SCENE } from '../data/airports'

export function simulateRivals(s: GameState, headlines: string[]) {
  const eff = effects(s)
  const cal = calendar(s.meta.day)
  for (const rival of s.rivals) {
    if (!rival.alive) continue
    let profit = 0
    for (const route of [...rival.routes]) {
      if (!fliesOn(route.frequency, cal.dow)) continue
      const type = getType(route.typeId)
      const dist = distanceNm(getAirport(route.origin), getAirport(route.dest))
      const ref = referenceFare(dist)
      const load = clamp(0.42 + (ref / Math.max(60, route.price)) * 0.28 + rival.reputation / 500 + (eff.demand - 1) * 0.35, 0.22, 0.97)
      const pax = route.dailySeats * load
      const revenue = pax * route.price * 0.9
      const cost = dist * 3.1 * type.fuelIndex * eff.fuel + pax * 14 + 1600
      profit += revenue - cost
    }
    const fleetCount = rival.fleet.reduce((a, f) => a + f.count, 0)
    profit -= fleetCount * 260 + rival.debt * 0.00016
    rival.cash += profit
    if (cal.day === 1) rival.cash -= Math.min(rival.cash * 0.5, rival.debt * 0.004)
    if (s.meta.day > 0 && s.meta.day % 5 === 0) adjustRival(s, rival, headlines)
    if (rival.cash < -5_000_000) failRival(s, rival, headlines)
  }
}

function adjustRival(s: GameState, rival: Rival, headlines: string[]) {
  for (const route of rival.routes) {
    const dist = distanceNm(getAirport(route.origin), getAirport(route.dest))
    const ref = referenceFare(dist)
    if (rival.strategy === 'ulcc' || rival.strategy === 'lcc') {
      if (route.price > ref * 0.92) route.price = Math.round(route.price * 0.96)
      else if (rand(s.meta) < 0.3) route.price = Math.max(59, Math.round(route.price * 0.97))
    } else if (rival.strategy === 'premium' || rival.strategy === 'full') {
      if (route.price < ref * 1.15) route.price = Math.round(route.price * 1.03)
    } else if (rand(s.meta) < 0.4) {
      route.price = Math.round(route.price * (0.98 + rand(s.meta) * 0.04))
    }
    const player = s.routes.find((r) => pairKey(r.origin, r.dest) === pairKey(route.origin, route.dest))
    if (player && rival.strategy === 'ulcc' && route.price > player.price && rand(s.meta) < 0.55) {
      route.price = Math.max(59, player.price - rand(s.meta) < 0.5 ? 10 : 0)
      headlines.push(`${rival.name} answered your fare on ${route.origin}–${route.dest}.`)
    }
  }
  if (rival.cash > 12_000_000 && rand(s.meta) < 0.35 && rival.routes.length < 10) {
    const typeId = rival.fleet[0]?.typeId ?? 'b737-800'
    const type = getType(typeId)
    const home = getAirport(rival.home)
    const options = AIRPORTS.filter((a) => {
      if (a.id === rival.home) return false
      const d = distanceNm(home, a)
      if (d < 80 || d * 1.12 >= type.rangeNm) return false
      if (type.category !== 'widebody' && d > 1800) return false
      if (d > 4200) return false
      return true
    })
    const same = options.filter((a) => a.theater === home.theater)
    const pool = same.length > 0 && rand(s.meta) < 0.72 ? same : options
    const dest = pool.length ? pick(s.meta, pool) : undefined
    if (dest && !rival.routes.some((r) => pairKey(r.origin, r.dest) === pairKey(rival.home, dest.id))) {
      const dist = distanceNm(home, dest)
      const factor = rival.strategy === 'ulcc' ? 0.78 : rival.strategy === 'premium' ? 1.25 : 1
      rival.routes.push({
        origin: rival.home,
        dest: dest.id,
        typeId,
        dailySeats: Math.min(type.seatCapacity * 2, type.seatCapacity),
        price: Math.round(referenceFare(dist) * factor),
        service: rival.strategy === 'premium' ? 'meal' : 'snack',
        frequency: 'daily',
      })
      headlines.push(`${rival.name} opened ${rival.home}–${dest.id}.`)
      pushNews(s, `${rival.name} adds ${home.city}–${dest.city}`, 'Another airline is still expanding while you decide.', SCENE.gate, 'Competition')
    }
  }
  if (rival.cash < 3_000_000 && rival.routes.length > 3 && rand(s.meta) < 0.4) {
    const cut = rival.routes[rival.routes.length - 1]
    rival.routes.pop()
    headlines.push(`${rival.name} dropped ${cut.origin}–${cut.dest}.`)
  }
}

function failRival(s: GameState, rival: Rival, headlines: string[]) {
  rival.alive = false
  rival.routes = []
  headlines.push(`${rival.name} has collapsed.`)
  pushNews(s, `${rival.name} files for bankruptcy protection`, 'Their aircraft are being offered cheaply. The debt did not survive the fare war.', SCENE.recession, 'Competition')
  const dumps = rival.fleet.flatMap((f) => Array.from({ length: Math.min(3, f.count) }, () => f.typeId))
  for (const typeId of dumps.slice(0, 6)) {
    if (!illustratedTypes().some((t) => t.id === typeId)) continue
    const listing = makeListing(s, typeId, { price: Math.round(getType(typeId).purchasePrice * 0.72), parkedAt: rival.home })
    s.listings.unshift(listing)
  }
  s.market.usedPriceIndex = clamp(s.market.usedPriceIndex * 0.9, 0.55, 1.3)
  s.listings = s.listings.slice(0, 40)
}
