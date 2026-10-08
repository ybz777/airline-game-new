import { SCENE } from './airports'
import type { EventDef } from './events'

export interface SimpleFx {
  id: string
  label: string
  days: number
  headline: string
  body: string
  image: string
  tag: string
  demandMul?: number
  fuelMul?: number
  maintMul?: number
  cargoMul?: number
  salaryMul?: number
  feeMul?: number
  cash?: number
  economy?: number
  fuelIndex?: number
  cargoIndex?: number
  interest?: number
  usedPrice?: number
  rep?: Partial<Record<'satisfaction' | 'reliability' | 'safety' | 'service' | 'price' | 'trust' | 'brand', number>>
  weather?: { zone: string; days: number; severity: number; label: string }
}

export const SIMPLE_RESOLVE = new Map<string, SimpleFx>()

type SceneName = keyof typeof SCENE
type Fx = Omit<SimpleFx, 'id' | 'label' | 'headline' | 'body' | 'image' | 'tag' | 'days'> & { days?: number }

function one(
  id: string, title: string, body: string, tag: string, scene: SceneName,
  weight: number, minDay: number, label: string, detail: string, fx: Fx, once = false,
): EventDef {
  const image = SCENE[scene]
  SIMPLE_RESOLVE.set(`${id}:ok`, {
    id, label: title, headline: title, body, image, tag, days: fx.days ?? 30, ...fx,
  })
  return {
    id, title, image, weight, minDay, once, tag,
    build: () => ({ title, body, choices: [{ id: 'ok', label, detail }] }),
  }
}

function two(
  id: string, title: string, body: string, tag: string, scene: SceneName,
  weight: number, minDay: number,
  a: { id: string; label: string; detail: string; fx: Fx },
  b: { id: string; label: string; detail: string; fx: Fx },
  once = false,
): EventDef {
  const image = SCENE[scene]
  for (const choice of [a, b]) {
    SIMPLE_RESOLVE.set(`${id}:${choice.id}`, {
      id: `${id}-${choice.id}`, label: title, headline: title, body, image, tag, days: choice.fx.days ?? 30, ...choice.fx,
    })
  }
  return {
    id, title, image, weight, minDay, once, tag,
    build: () => ({
      title, body,
      choices: [
        { id: a.id, label: a.label, detail: a.detail },
        { id: b.id, label: b.label, detail: b.detail },
      ],
    }),
  }
}

const singles: EventDef[] = [
  one('oil_spike', 'Oil prices jump', 'A supply scare lifted crude. Jet fuel follows, and thirsty aircraft get expensive first.', 'Fuel', 'fuel', 5, 6, 'Fly the higher price', 'The fuel index rises.', { fuelIndex: 0.14, fuelMul: 1.08, days: 40 }),
  one('oil_slide', 'Oil prices fall', 'Refiners caught up. The spot price of jet fuel eases for a few weeks.', 'Fuel', 'fuel', 4, 10, 'Note the market', 'Fuel costs ease.', { fuelIndex: -0.08, days: 28 }),
  one('fuel_tax', 'Fuel tax increase', 'A new excise tax lands on uplift. It does not care what you paid for the airplane.', 'Fuel', 'fuel', 3, 14, 'Update the cost model', 'Fuel stays more expensive.', { fuelMul: 1.06, days: 80 }),
  one('fuel_tax_cut', 'Fuel tax relief', 'A temporary tax holiday trims the pump price. Old aircraft look less hopeless.', 'Fuel', 'fuel', 3, 16, 'Take the relief', 'Fuel is cheaper for a month.', { fuelMul: 0.94, days: 30 }),
  one('jet_shortage', 'Jet fuel shortage', 'A terminal at a major hub is short of product. Tankering gets expensive.', 'Fuel', 'fuel', 3, 12, 'Pay up and uplift', 'Fuel index and burn cost both rise.', { fuelIndex: 0.1, fuelMul: 1.1, days: 20 }),
  one('supplier_fail', 'Fuel supplier fails', 'A contract supplier missed a delivery window. Spot uplift is the backup.', 'Fuel', 'fuel', 3, 8, 'Buy spot fuel', 'A cash hit, then a short spike.', { cash: -45000, fuelMul: 1.12, days: 14 }),
  one('inflation', 'Inflation picks up', 'Wages, parts, and airport invoices move together. Fares will not move as fast.', 'Economy', 'news', 4, 12, 'Absorb the costs', 'Maintenance and salaries rise.', { maintMul: 1.08, salaryMul: 1.06, days: 45 }),
  one('disinflation', 'Inflation cools', 'Vendors stop rewriting invoices every week. The cost base steadies.', 'Economy', 'news', 3, 18, 'Hold the plan', 'The economy index improves slightly.', { economy: 0.03, days: 20 }),
  one('rates_down', 'Interest rates ease', 'Lenders are competing again. New debt gets cheaper. Old debt does not.', 'Finance', 'news', 3, 14, 'Revisit financing', 'The rate add-on falls.', { interest: -0.008, days: 10 }),
  one('credit_tight', 'Credit tightens', 'Banks want more cushion. A startup with a thin balance sheet feels it first.', 'Finance', 'news', 4, 10, 'Protect cash', 'New loans cost more.', { interest: 0.01, days: 10 }),
  one('bank_wobble', 'A lender wobbles', 'A regional bank that finances aircraft is in trouble. Appraisals get harsher.', 'Finance', 'recession', 2, 20, 'Mark the risk', 'Used prices slip.', { usedPrice: -0.06, interest: 0.006 }),
  one('investor_mood', 'Investors get brave', 'Equity stories are back in fashion. It does not put cash in your account, but the market believes airlines again.', 'Finance', 'boom', 3, 16, 'Stay disciplined', 'Demand and resale values tick up.', { economy: 0.04, usedPrice: 0.04, demandMul: 1.04, days: 25 }),
  one('consumer_dip', 'Households pull back', 'Discretionary trips are the first thing cut. Business traffic holds up better than leisure.', 'Economy', 'recession', 4, 12, 'Watch the loads', 'Passenger demand softens.', { demandMul: 0.9, days: 28, rep: { price: 1 } }),
  one('biz_collapse', 'Business travel stalls', 'Corporate travel desks freeze nonessential trips. High fares on short notice get lonely.', 'Economy', 'recession', 3, 18, 'Shift toward leisure', 'Demand falls, especially at a high fare.', { demandMul: 0.86, days: 35 }),
  one('tourism_bust', 'Tourism drops off', 'A strong currency and ugly headlines empty the leisure cabins.', 'Demand', 'recession', 4, 10, 'Cut the yield', 'Demand falls for three weeks.', { demandMul: 0.88, days: 21 }),
  one('record_tourism', 'Tourism hits a record', 'Beaches, cities, and visiting friends are all sold. The airplanes that show up get paid.', 'Demand', 'boom', 4, 8, 'Keep the schedule', 'Demand rises.', { demandMul: 1.1, days: 18 }),
  one('christmas_peak', 'Holiday peak', 'Year-end travel fills seats that were empty in November. It ends the week after New Year.', 'Demand', 'boom', 5, 6, 'Staff the bank', 'A short demand surge.', { demandMul: 1.12, days: 12 }),
  one('spring_break', 'Spring break', 'Students and families move at once. Reliability matters more than a clever fare.', 'Demand', 'boom', 4, 8, 'Add the snacks', 'Leisure demand rises.', { demandMul: 1.08, days: 14, rep: { service: 1 } }),
  one('summer_rush', 'Summer travel rush', 'The long school holiday is here. Frequency beats a one-off charter.', 'Demand', 'boom', 4, 10, 'Fly the schedule', 'Demand stays elevated.', { demandMul: 1.09, days: 30 }),
  one('conference', 'A conference week', 'A major meeting dumps thousands of walk-up tickets onto the trunk routes.', 'Demand', 'news', 3, 7, 'Hold the fares', 'A brief demand bump.', { demandMul: 1.07, days: 8 }),
  one('ecommerce', 'E-commerce cargo boom', 'Parcels need airplanes. Belly freight pays even when the cabin is soft.', 'Cargo', 'apron', 4, 6, 'Take the freight', 'Cargo rates rise.', { cargoMul: 1.18, cargoIndex: 0.08, days: 30 }),
  one('cargo_recession', 'Cargo rates collapse', 'Too many freighters chased the same contracts. Belly revenue thins out.', 'Cargo', 'apron', 3, 12, 'Accept the rate', 'Cargo demand falls.', { cargoMul: 0.82, cargoIndex: -0.08, days: 28 }),
  one('medical_cargo', 'Medical cargo priority', 'Hospitals are paying for lift. Cancellations will be noticed.', 'Cargo', 'news', 3, 8, 'Protect the flights', 'Cargo pays more. Trust is on the line.', { cargoMul: 1.15, days: 16, rep: { trust: 1 } }),
  one('shipping_snarl', 'Ocean shipping snarl', 'Containers are stuck. Some of that freight is suddenly willing to fly.', 'Cargo', 'apron', 3, 10, 'Quote the space', 'A cargo windfall.', { cargoMul: 1.2, cargoIndex: 0.06, days: 20 }),
  one('hurricane', 'Hurricane threat', 'A storm is aimed at the Gulf and Florida. Airports in that weather will not argue with the forecast.', 'Weather', 'rain', 4, 4, 'Plan the cancellations', 'Southeast flying gets harder.', { weather: { zone: 'southeast', days: 4, severity: 0.8, label: 'Hurricane' } }),
  one('norther', 'Gulf thunderstorms', 'Lines of storms sit on the Texas hubs. Turns miss. Crews time out.', 'Weather', 'rain', 4, 3, 'Pad the block', 'Texas weather slows the operation.', { weather: { zone: 'texas', days: 2, severity: 0.55, label: 'Storms' } }),
  one('fog_coast', 'Coastal fog', 'A marine layer shuts the visual approaches on the Pacific coast.', 'Weather', 'rain', 3, 3, 'Hold for the ceiling', 'Pacific airports slow down.', { weather: { zone: 'pacific', days: 2, severity: 0.5, label: 'Fog' } }),
  one('ice', 'Freezing rain', 'A glaze event hits the northeast. Deice fluid becomes the schedule.', 'Weather', 'snow', 3, 4, 'Deice and wait', 'Northeast delays rise.', { weather: { zone: 'northeast', days: 2, severity: 0.7, label: 'Ice' } }),
  one('blizzard_canada', 'Canadian blizzard', 'Prairie and eastern Canadian fields are in it. The airplanes can leave later.', 'Weather', 'snow', 3, 5, 'Delay the bank', 'Canadian airports slow down.', { weather: { zone: 'canada', days: 3, severity: 0.75, label: 'Blizzard' } }),
  one('heat', 'Heat wave', 'High temperatures steal climb performance. Long stages on hot afternoons get tight.', 'Weather', 'news', 3, 8, 'Lighten the departures', 'Desert airports are harder.', { weather: { zone: 'desert', days: 5, severity: 0.35, label: 'Heat' }, demandMul: 0.97, days: 8 }),
  one('smoke', 'Wildfire smoke', 'Visibility and public nerves both drop across the West.', 'Weather', 'news', 3, 8, 'Publish the waivers', 'Pacific demand and operations suffer.', { weather: { zone: 'pacific', days: 4, severity: 0.45, label: 'Smoke' }, demandMul: 0.94, days: 10, rep: { trust: 1 } }),
  one('ash', 'Volcanic ash', 'An ash cloud closes a band of European airspace. Detours burn fuel and patience.', 'Weather', 'rain', 2, 15, 'Reroute', 'Europe slows down.', { weather: { zone: 'europe', days: 5, severity: 0.85, label: 'Ash' }, fuelMul: 1.06, days: 8 }),
  one('dust', 'Dust storm', 'Gulf airports are in a brown-out. Engines do not enjoy it.', 'Weather', 'news', 2, 10, 'Ground the turns', 'Gulf operations pause.', { weather: { zone: 'gulf', days: 2, severity: 0.7, label: 'Dust' } }),
  one('flood', 'Flooded airport', 'A river airport loses a taxiway. The runway is open. The schedule is not.', 'Airport', 'rain', 2, 9, 'Retime', 'Fees and delays rise briefly.', { feeMul: 1.08, days: 8, weather: { zone: 'midwest', days: 3, severity: 0.4, label: 'Flood' } }),
  one('quake', 'Earthquake disruption', 'A quake rattles a Pacific city. The runways get inspected before anyone sells a ticket.', 'Crisis', 'news', 2, 12, 'Wait for the inspection', 'Demand and trust both dip.', { demandMul: 0.9, days: 10, rep: { trust: -1 } }),
  one('euro_strike', 'European ATC strike', 'Controllers walk out across part of the continent. The NOTAMs are the schedule.', 'Airport', 'strike', 3, 10, 'Thin the Europe flying', 'European zones congest.', { weather: { zone: 'europe', days: 3, severity: 0.6, label: 'ATC strike' }, feeMul: 1.05, days: 6 }),
  one('gate_shortage', 'Gate shortage', 'A terminal renovation takes gates offline. Turns happen at hardstands, slowly.', 'Airport', 'construction', 4, 8, 'Accept the tows', 'Airport fees rise for two weeks.', { feeMul: 1.1, days: 14 }),
  one('fee_hike', 'Airport fees rise', 'The authority repriced landings. Your cost model was already optimistic.', 'Airport', 'construction', 4, 7, 'Pay the new tariff', 'Fees stay higher.', { feeMul: 1.07, days: 60 }),
  one('fee_cut', 'Airport fee holiday', 'A city trying to grow service discounts the landing fee for a season.', 'Airport', 'boom', 3, 8, 'Take the discount', 'Fees fall for a while.', { feeMul: 0.92, days: 40 }),
  one('new_terminal', 'A terminal opens', 'More gates, for a while. Then every other airline notices too.', 'Airport', 'construction', 3, 14, 'Ask for the space', 'Fees ease and demand ticks up.', { feeMul: 0.96, demandMul: 1.04, days: 30 }),
  one('security', 'Security screening slows', 'A new procedure doubles the queue. Missed departures become a brand problem.', 'Airport', 'gate', 3, 6, 'Open the counters early', 'Satisfaction slips unless you communicate.', { rep: { satisfaction: -2, reliability: -1 }, days: 12 }),
  one('night_ban', 'Night curfew tightens', 'Late arrivals get expensive. Aircraft that cannot make the window sit until morning.', 'Regulation', 'night', 3, 12, 'Rebuild the rotations', 'Reliability pressure rises.', { rep: { reliability: -1 }, feeMul: 1.04, days: 40 }),
  one('carbon', 'Carbon charge', 'A new emissions charge hits every departure. Four engines feel it most, but everyone pays.', 'Regulation', 'news', 3, 16, 'Pay it', 'A cash cost and a higher fee base.', { cash: -60000, feeMul: 1.05, days: 50 }),
  one('saf', 'Sustainable fuel mandate', 'A blend requirement raises the price of uplift. It is not optional local color.', 'Regulation', 'fuel', 3, 18, 'Buy the blend', 'Fuel costs rise.', { fuelMul: 1.07, days: 45 }),
  one('compensation', 'Passenger compensation law', 'Delays you used to apologize for now have a price. Cancellations cost twice.', 'Regulation', 'news', 3, 14, 'Brief the stations', 'Trust can rise if you comply. The cash still leaves.', { cash: -25000, rep: { trust: 2, satisfaction: 1 } }),
  one('maint_rule', 'Maintenance rule change', 'A directive shortens an inspection interval. The hangar gets busier.', 'Maintenance', 'hangar', 4, 8, 'Schedule the work', 'Maintenance costs rise.', { maintMul: 1.12, days: 40 }),
  one('parts_glut', 'Parts get cheaper', 'A surplus of rotable stock hits the market. Checks hurt less.', 'Maintenance', 'hangar', 3, 12, 'Restock', 'Maintenance eases.', { maintMul: 0.92, days: 30 }),
  one('engine_recall', 'Engine bulletin', 'A manufacturer wants borescope inspections. The airplanes that fly anyway are a bet.', 'Maintenance', 'hangar', 3, 10, 'Inspect', 'Maintenance rises. Safety reputation holds.', { maintMul: 1.1, days: 20, rep: { safety: 2 } }),
  one('value_rise', 'Aircraft values rise', 'Delivery delays made used metal scarce. Your old jets are suddenly collateral.', 'Fleet', 'apron', 3, 12, 'Do not get romantic', 'Resale values rise.', { usedPrice: 0.08 }),
  one('delivery_delay', 'Deliveries slip', 'A manufacturer pushed handovers to the right. Anyone who needed a new jet is shopping used.', 'Fleet', 'news', 3, 14, 'Watch the listings', 'Used prices firm up.', { usedPrice: 0.06, demandMul: 1.02, days: 20 }),
  one('oversupply', 'Too many aircraft', 'Lease returns flooded the market. Buyers can be picky. Sellers cannot.', 'Fleet', 'apron', 3, 10, 'Mark the books', 'Used prices fall.', { usedPrice: -0.08 }),
  one('pilot_strike', 'Pilot union ballot', 'A strike vote passed at a large carrier. Their passengers are suddenly available, and so is the wage pressure.', 'Crew', 'strike', 3, 16, 'Hold your pay scale', 'Demand rises. So do salaries.', { demandMul: 1.06, salaryMul: 1.08, days: 20 }),
  one('training_gap', 'Training slots vanish', 'Simulators are booked out. Fatigue does not wait for a training date.', 'Crew', 'news', 3, 10, 'Fly the crews you have', 'Salary pressure and a reliability nick.', { salaryMul: 1.05, rep: { reliability: -1 }, days: 25 }),
  one('crew_rest', 'Tighter rest rules', 'The regulator added an hour to minimum rest. You will cancel before you will roster through it.', 'Crew', 'news', 3, 12, 'Rewrite the pairings', 'Reliability improves if you obey. Costs rise.', { salaryMul: 1.04, rep: { safety: 1, reliability: 1 }, days: 40 }),
  one('airspace', 'Airspace closure', 'A corridor used by long-haul flights is shut. The detour is fuel, time, and a worse arrival.', 'Geopolitics', 'news', 3, 12, 'Accept the reroute', 'Fuel burn rises. International demand softens.', { fuelMul: 1.08, demandMul: 0.94, days: 18 }),
  one('visa', 'Visa rules tighten', 'A paperwork change cuts spontaneous international trips. Connecting traffic notices.', 'Geopolitics', 'news', 3, 10, 'Adjust the forecast', 'Demand eases.', { demandMul: 0.93, days: 30 }),
  one('sanctions', 'Sanctions disrupt tickets', 'Some itineraries become unsellable overnight. The airplanes still have to be somewhere.', 'Geopolitics', 'news', 2, 16, 'Drop the exposure', 'Demand and cargo both move.', { demandMul: 0.92, cargoMul: 0.9, days: 25 }),
  one('border', 'Border restrictions', 'A short-notice entry rule empties a set of international bookings.', 'Geopolitics', 'news', 3, 8, 'Rebook who you can', 'Demand falls. Trust holds if you waive the fees.', { demandMul: 0.9, days: 16, rep: { trust: 1, satisfaction: -1 } }),
  one('trade', 'Trade disruption', 'A tariff fight moves freight off its usual path. Some of it flies. Some of it waits.', 'Geopolitics', 'apron', 2, 12, 'Quote carefully', 'Cargo is jumpy.', { cargoMul: 1.08, cargoIndex: 0.04, days: 20 }),
  one('lcc_fares', 'A rival slashes fares', 'An ultra-low-cost carrier published a fare that is mostly a bag fee in disguise. Your passengers can do that math.', 'Competition', 'gate', 5, 5, 'Decide later on the route page', 'Price reputation is under pressure.', { rep: { price: -2 }, demandMul: 0.95, days: 14 }),
  one('rival_growth', 'A competitor adds aircraft', 'Someone with a better credit rating just took delivery. They will need routes for the metal.', 'Competition', 'apron', 3, 8, 'Watch their map', 'Competition for passengers ticks up.', { demandMul: 0.97, days: 20 }),
  one('loyalty', 'A rival launches a loyalty scheme', 'Points are not a product, until your regulars start asking where theirs are.', 'Competition', 'news', 3, 14, 'Stay a simple airline', 'Brand pressure.', { rep: { brand: -1 }, days: 10 }),
  one('penalty', 'A rival is fined', 'A competitor paid a safety penalty in public. Some of their passengers would like a different tail.', 'Competition', 'news', 2, 12, 'Do not gloat', 'A small demand opening. Your own standard is now the story.', { demandMul: 1.04, days: 14, rep: { safety: 1 } }),
  one('alliance_rumor', 'Alliance rumor', 'Two carriers are talking about a joint venture. Connecting traffic may bypass you.', 'Competition', 'merger', 2, 18, 'Keep your own banks', 'Demand softens on overlapping routes.', { demandMul: 0.96, days: 24 }),
  one('insurance', 'Insurance premiums rise', 'Underwriters repriced hull and liability. The invoice arrives whether or not you had an incident.', 'Finance', 'news', 3, 9, 'Pay the premium', 'Cash leaves.', { cash: -70000 }),
  one('pr_win', 'A quiet month of on-time flights', 'Nothing dramatic happened. That is the whole story, and passengers noticed.', 'Brand', 'boom', 3, 6, 'Keep doing that', 'Reliability and trust rise.', { rep: { reliability: 2, trust: 1, satisfaction: 1 } }),
  one('press_hit', 'A rough operations story', 'A missed connection and a rude agent became the clip everyone saw. The airplane was fine.', 'Brand', 'gate', 3, 5, 'Apologize in public', 'Satisfaction and trust dip.', { rep: { satisfaction: -3, trust: -2, service: -1 } }),
  one('safety_award', 'A safety audit goes well', 'Inspectors left without a finding worth a headline. That is rarer than it should be.', 'Safety', 'hangar', 2, 15, 'Publish nothing cute', 'Safety reputation rises.', { rep: { safety: 3, trust: 1 } }),
  one('bird', 'Bird-strike inspections', 'A migration week produced two strikes in the region. Engines get a look before the next departure.', 'Safety', 'hangar', 3, 4, 'Inspect', 'A small maintenance bump. Safety holds.', { maintMul: 1.05, days: 8, rep: { safety: 1 } }),
  one('runway_incursion', 'Runway incident elsewhere', 'A close call at another airline reset the national conversation. Your operation is not exempt from the mood.', 'Safety', 'news', 2, 10, 'Brief the crews', 'The public is jumpy. Trust can still rise if you are boring.', { rep: { trust: -1, safety: 1 } }),
  one('currency', 'Currency swing', 'A move in the dollar changes the price of fuel, leases, and foreign tickets at the same time.', 'Economy', 'news', 3, 11, 'Hedge nothing heroic', 'Fuel and demand both shift.', { fuelIndex: 0.04, demandMul: 0.98, days: 25 }),
  one('boom_asia', 'Asian demand surges', 'Long-haul bookings into East Asia jump. You only benefit if you can actually fly there.', 'Demand', 'boom', 3, 14, 'Note the markets', 'Overall demand rises a little.', { demandMul: 1.05, days: 20 }),
  one('europe_soft', 'Europe goes quiet', 'A soft season and a strike calendar empty some transatlantic cabins.', 'Demand', 'recession', 3, 12, 'Do not add a wide-body on a hunch', 'Demand eases.', { demandMul: 0.93, days: 22 }),
  one('latam_peak', 'South American peak', 'Southern summer fills the north-south routes. The airplanes have to be there.', 'Demand', 'boom', 3, 10, 'Watch the yields', 'Demand rises.', { demandMul: 1.05, days: 18 }),
  one('slot_auction', 'A slot auction', 'A coordinator is selling a pair of peak slots. The price is the strategy.', 'Airport', 'construction', 2, 20, 'Let it pass', 'Fees for scarce airports feel tighter.', { feeMul: 1.04, days: 30 }),
  one('modernize', 'Airport modernization', 'New taxiways take a year. This month they only take a delay.', 'Airport', 'construction', 3, 9, 'Brief the crews', 'Short congestion.', { weather: { zone: 'texas', days: 4, severity: 0.3, label: 'Works' }, feeMul: 1.03, days: 12 }),
]

const choices: EventDef[] = [
  two('hedge_window', 'A hedge desk calls', 'You can lock a slice of fuel for 45 days at a small premium, or keep buying spot.', 'Fuel', 'fuel', 4, 7,
    { id: 'lock', label: 'Pay $50,000 and lock it', detail: 'Cash now. Fuel exposure falls.', fx: { cash: -50000, fuelMul: 0.95, days: 45 } },
    { id: 'spot', label: 'Stay on spot', detail: 'No cash today. You keep the price risk.', fx: { days: 5 } }),
  two('storm_choice', 'Storms over Texas', 'Lines of storms are on the Texas hubs. You can cancel early, or push departures into the weather.', 'Weather', 'rain', 5, 3,
    { id: 'cancel', label: 'Cancel early', detail: 'Satisfaction holds up better than a ramp full of stranded people.', fx: { rep: { satisfaction: 1, reliability: -1, trust: 1 }, days: 3, weather: { zone: 'texas', days: 2, severity: 0.4, label: 'Storm' } } },
    { id: 'push', label: 'Operate into it', detail: 'You keep the revenue and the complaints.', fx: { rep: { satisfaction: -3, reliability: -2, trust: -1 }, days: 4, weather: { zone: 'texas', days: 2, severity: 0.65, label: 'Storm' } } }),
  two('labor', 'Ramp crews want a raise', 'The contractor will walk on Friday unless the rate moves.', 'Crew', 'strike', 3, 12,
    { id: 'pay', label: 'Pay the increase — $35,000', detail: 'Turns keep moving.', fx: { cash: -35000, rep: { reliability: 1 }, days: 10 } },
    { id: 'wait', label: 'Wait them out', detail: 'Several days of slow turns.', fx: { rep: { reliability: -2, satisfaction: -2 }, feeMul: 1.06, days: 8 } }),
  two('ash_choice', 'Ash on a long-haul track', 'You can cancel the exposed flights or fly a longer route around the cloud.', 'Weather', 'rain', 2, 14,
    { id: 'stop', label: 'Cancel the exposed flights', detail: 'Safety reputation holds. The revenue does not.', fx: { rep: { safety: 2, satisfaction: -1 }, demandMul: 0.96, days: 6 } },
    { id: 'around', label: 'Fly around it', detail: 'Fuel cost jumps. You keep the passengers.', fx: { fuelMul: 1.12, days: 6, rep: { reliability: -1 } } }),
  two('merger_rumor', 'A distressed carrier is shopping itself', 'Bankers are floating a sale. You are not required to be the buyer.', 'Deals', 'merger', 3, 22,
    { id: 'look', label: 'Take the meeting', detail: 'No cash yet. The industry notices you are hunting.', fx: { rep: { brand: 1 }, days: 8 } },
    { id: 'no', label: 'Stay out', detail: 'You keep your balance sheet boring.', fx: { days: 4 } }, true),
  two('health_watch', 'A health advisory', 'Bookings hesitate. This is not the full emergency. It can still become one.', 'Crisis', 'recession', 2, 24,
    { id: 'waive', label: 'Waive change fees', detail: 'You give up some cash and keep more trust.', fx: { cash: -20000, demandMul: 0.94, rep: { trust: 2, satisfaction: 1 }, days: 20 } },
    { id: 'hold', label: 'Keep the fare rules', detail: 'You keep the revenue and lose the goodwill.', fx: { demandMul: 0.9, rep: { trust: -2, satisfaction: -2 }, days: 20 } }),
]

export const EXTRA_EVENTS: EventDef[] = [...singles, ...choices]
