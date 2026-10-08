import { buyListing, createMeal, leaseGate, openRoute } from './actions'
import { cateringCost } from '../data/meals'
import { placeRoute } from './gates'
import { applyChoice } from './eventsApply'
import { forecastLeg } from './economy'
import { simulateDay } from './engine'
import { createNewGame } from './setup'

let s = createNewGame({ name: 'Red Mesa Air', iata: 'RM', home: 'AUS', strategy: 'regional', color: '#c9843d' })
const listing = s.listings.find((l) => l.typeId === 'b737-300')!
const bought = buyListing(s, listing.id, 'cash')
if (bought.error) throw new Error(bought.error)
s = bought.state
const ac = s.fleet[0]
const forecast = forecastLeg(s, {
  origin: 'AUS', dest: 'DFW', typeId: ac.typeId, price: 129, service: 'snack', baggageFee: 35,
  cabinLayout: 'economy', frequency: 'daily', condition: ac.condition,
})
console.log('FORECAST', {
  pax: forecast.paxPerLeg, seats: forecast.seats, load: forecast.loadFactor.toFixed(2),
  contribution: Math.round(forecast.contribution), rival: forecast.competitorName, fare: forecast.competitorPrice,
  notes: forecast.notes,
})
const leasedAus = leaseGate(s, 'AUS-A1', 'leased')
if (leasedAus.error) throw new Error(leasedAus.error)
s = leasedAus.state
const leasedDfw = leaseGate(s, 'DFW-A1', 'leased')
if (leasedDfw.error) throw new Error(leasedDfw.error)
s = leasedDfw.state
const snackCost = cateringCost('meal-snack', 'meal-cabin', 100, 0, s.meals, 'snack', 100)
const mealCost = cateringCost('meal-full', 'meal-cabin', 80, 12, s.meals, 'meal', 92)
if (!(mealCost > snackCost)) throw new Error(`meal cost ${mealCost} should exceed snack ${snackCost}`)
const custom = createMeal(s, { name: 'Hill Country plate', tier: 'meal', note: 'Chicken and roasted vegetables.' })
if (custom.error) throw new Error(custom.error)
s = custom.state
const opened = openRoute(s, {
  origin: 'AUS', dest: 'DFW', aircraftId: ac.id, price: 129, frequency: 'daily', service: 'snack', baggageFee: 35, cabinLayout: 'economy',
  departHour: 8, economyMealId: 'meal-snack', cabinMealId: 'meal-cabin',
})
if (opened.error) throw new Error(opened.error)
s = opened.state
if (!s.routes[0].gateOrigin || !s.routes[0].gateDest) throw new Error('route filed without gates')
const second = structuredClone(s)
const extra = structuredClone(second.fleet[0])
extra.id = 'AC2'
extra.tailNumber = 'N96TEST'
second.fleet.push(extra)
const clash = placeRoute(second, { origin: 'AUS', dest: 'DFW', aircraftId: extra.id, frequency: 'daily', departHour: 8 })
if (clash.ok) throw new Error('two flights took the same gate at the same time')
const later = placeRoute(second, { origin: 'AUS', dest: 'DFW', aircraftId: extra.id, frequency: 'daily', departHour: 15 })
if (!later.ok) throw new Error(`later turn should share the gate: ${later.error}`)
const packed = structuredClone(s)
packed.routes.push({ ...packed.routes[0], id: 'slot-fill', origin: 'JFK', dest: 'BOS', departHour: 8, gateOrigin: '', gateDest: '' })
const slot = placeRoute(packed, { origin: 'JFK', dest: 'BOS', aircraftId: ac.id, frequency: 'daily', departHour: 8, id: 'slot-new' })
if (!slot.error.toLowerCase().includes('slot')) throw new Error(`expected a slot refusal, got ${slot.error}`)
console.log('GATES', s.routes[0].gateOrigin, s.routes[0].gateDest, 'meal', s.meals[0]?.name, 'clash', clash.error)
for (let i = 0; i < 20; i++) {
  if (s.pending) s = applyChoice(s, s.pending.choices[0].id)
  if (s.merger) s.merger = null
  if (s.faultPrompt) {
    const id = s.faultPrompt.faultId
    const fault = s.faults.find((f) => f.id === id)
    if (fault && s.finance.cash > fault.repairCost) {
      s.finance.cash -= fault.repairCost
      s.faults = s.faults.filter((f) => f.id !== id)
      const plane = s.fleet.find((a) => a.id === fault.aircraftId)
      if (plane) plane.condition[fault.system] = 90
    }
    s.faultPrompt = null
  }
  const day = simulateDay(s)
  s = day.state
  const f = day.report.flights[0]
  console.log(day.report.dateLabel, 'profit', Math.round(day.report.profit), 'cash', Math.round(s.finance.cash), 'pax', f ? `${f.pax}/${f.seats} ${f.status}` : 'no flight', f?.note ?? '')
}
console.log('END', { cash: Math.round(s.finance.cash), routes: s.routes.length, fleet: s.fleet.length, brand: s.reputation.brand.toFixed(1) })
