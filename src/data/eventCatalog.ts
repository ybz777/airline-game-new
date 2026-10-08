import { SCENE } from './airports'
import { SIMPLE_RESOLVE } from './eventExtras'
import type { EventCtx, EventDef } from './events'
import type { GameState } from '../types'
import { pushNews } from '../sim/setup'
import { calendar, clamp, rand } from '../sim/util'

type SceneName = keyof typeof SCENE
type Bite = {
  cash?: number
  dem?: number
  days?: number
  trust?: number
  safe?: number
  rel?: number
  brand?: number
  sat?: number
  price?: number
  fuel?: number
  maint?: number
  sal?: number
  cargo?: number
  used?: number
}

function parseBite(code: string): Bite {
  const out: Bite = { days: 16 }
  if (!code || code === '-') return out
  for (const part of code.split(',')) {
    const [k, raw] = part.split(':')
    const n = Number(raw)
    if (!k || Number.isNaN(n)) continue
    if (k === 'cash') out.cash = n
    else if (k === 'dem') out.dem = n
    else if (k === 'days') out.days = n
    else if (k === 'trust') out.trust = n
    else if (k === 'safe') out.safe = n
    else if (k === 'rel') out.rel = n
    else if (k === 'brand') out.brand = n
    else if (k === 'sat') out.sat = n
    else if (k === 'price') out.price = n
    else if (k === 'fuel') out.fuel = n
    else if (k === 'maint') out.maint = n
    else if (k === 'sal') out.sal = n
    else if (k === 'cargo') out.cargo = n
    else if (k === 'used') out.used = n
  }
  return out
}

function repOf(b: Bite): SimpleFxRep | undefined {
  const row: SimpleFxRep = {
    trust: b.trust, safety: b.safe, reliability: b.rel, brand: b.brand, satisfaction: b.sat, price: b.price,
  }
  const out: SimpleFxRep = {}
  for (const key of Object.keys(row) as (keyof SimpleFxRep)[]) {
    const n = row[key]
    if (n) out[key] = n
  }
  return Object.keys(out).length ? out : undefined
}

type SimpleFxRep = Partial<Record<'satisfaction' | 'reliability' | 'safety' | 'service' | 'price' | 'trust' | 'brand', number>>

const catalog: EventDef[] = []

function dilemma(
  id: string, tag: string, scene: SceneName, title: string, body: string,
  a: [string, string, string], b: [string, string, string],
  opt: { weight?: number; min?: number; once?: boolean; when?: (ctx: EventCtx) => boolean } = {},
) {
  const image = SCENE[scene]
  for (const [choiceId, , code] of [['a', a[0], a[2]], ['b', b[0], b[2]]] as const) {
    const bite = parseBite(code)
    const rep = repOf(bite)
    SIMPLE_RESOLVE.set(`${id}:${choiceId}`, {
      id: `${id}-${choiceId}`,
      label: title,
      headline: title,
      body: choiceId === 'a' ? a[1] : b[1],
      image,
      tag,
      days: bite.days ?? 16,
      cash: bite.cash,
      demandMul: bite.dem,
      fuelMul: bite.fuel,
      maintMul: bite.maint,
      salaryMul: bite.sal,
      cargoMul: bite.cargo,
      usedPrice: bite.used,
      rep,
    })
  }
  catalog.push({
    id, title, image, weight: opt.weight ?? 1, minDay: opt.min ?? 6, once: opt.once, tag,
    build: (ctx) => {
      if (opt.when && !opt.when(ctx)) return null
      return {
        title, body,
        choices: [
          { id: 'a', label: a[0], detail: a[1] },
          { id: 'b', label: b[0], detail: b[1] },
        ],
      }
    },
  })
}

function three(
  id: string, tag: string, scene: SceneName, title: string, body: string,
  choices: [string, string, string, string][],
  opt: { weight?: number; min?: number; once?: boolean } = {},
) {
  const image = SCENE[scene]
  choices.forEach((c, i) => {
    const bite = parseBite(c[3])
    SIMPLE_RESOLVE.set(`${id}:${c[0] || String(i)}`, {
      id: `${id}-${c[0] || i}`,
      label: title,
      headline: title,
      body: c[2],
      image, tag,
      days: bite.days ?? 18,
      cash: bite.cash,
      demandMul: bite.dem,
      fuelMul: bite.fuel,
      maintMul: bite.maint,
      salaryMul: bite.sal,
      cargoMul: bite.cargo,
      usedPrice: bite.used,
      rep: repOf(bite),
    })
  })
  catalog.push({
    id, title, image, weight: opt.weight ?? 1, minDay: opt.min ?? 8, once: opt.once, tag,
    build: () => ({
      title, body,
      choices: choices.map((c, i) => ({ id: c[0] || String(i), label: c[1], detail: c[2] })),
    }),
  })
}

const freight: [string, string, string, string, string][] = [
  ['electronics', 'Electronics', 'A forwarder wants belly space for high-value electronics. Theft and delay claims are the risk, not the flying.', 'cargo:1.18,days:30', 'rel:-1,days:8'],
  ['perishables', 'Perishables', 'Berries and greens need the cold chain and a same-day connection. Miss the bank and the cargo is a write-off.', 'cargo:1.22,cash:18000,days:20', '-'],
  ['flowers', 'Flowers', 'A flower importer will pay for the morning arrival. The product dies if the airplane sits.', 'cargo:1.16,days:14', 'brand:1,days:6'],
  ['food', 'Food', 'A grocery chain wants steady belly space for chilled food. The rate is ordinary. The volume is not.', 'cargo:1.14,days:40', '-'],
  ['mail', 'Mail', 'A postal contract pays modestly and punishes cancellations harder than passengers do.', 'cargo:1.12,rel:1,days:45', '-'],
  ['express', 'Express packages', 'An integrator wants your late-night departure. The premium is real. So is the crew duty.', 'cargo:1.2,sal:1.04,days:30', '-'],
  ['auto', 'Auto parts', 'A factory will idle if a pallet of parts misses tomorrow. They will pay for the priority.', 'cash:42000,cargo:1.08,days:10', 'rel:-1,days:6'],
  ['industrial', 'Industrial equipment', 'Outsize freight needs a careful load plan. The rate is high for one week.', 'cash:70000,days:8', '-'],
  ['medical-supplies', 'Medical supplies', 'A hospital supplier wants a standing lane for ordinary medical freight. It is legal, dull, and useful.', 'cargo:1.15,brand:1,days:40', '-'],
  ['humanitarian-supplies', 'Relief supplies', 'An aid agency asks for space at a discount after a flood. The freight is documented.', 'brand:2,trust:1,cash:-15000,days:12', 'cash:22000,trust:-1,days:10'],
  ['temp', 'Temperature-sensitive freight', 'A pharmaceutical shipper needs a temperature log and a priority unload. Mishandling is a claim.', 'cargo:1.2,days:25', '-'],
  ['dg', 'Declared dangerous goods', 'A chemical shipper offers a legal dangerous-goods consignment with the paperwork already done. The rate is higher. The ramp has to follow the book.', 'cash:55000,safe:1,days:12', '-'],
]

for (const [id, name, body, take, skip] of freight) {
  dilemma(
    `x_cargo_${id}`, 'Cargo', 'apron', `${name} freight`,
    body,
    [`Take the ${name.toLowerCase()}`, take === '-' ? 'No change.' : 'The contract changes the next few weeks.', take],
    ['Leave the space for passengers', 'You keep the operation simple.', skip],
    { min: 5 },
  )
}

const groups: [string, string, string][] = [
  ['sports', 'A professional team wants the airplane for a road trip.', 'sat:1,brand:2,cash:60000,days:6'],
  ['students', 'A university is moving a few hundred students for a bowl game.', 'dem:1.08,days:8'],
  ['business', 'A company will buy a block of flexible tickets if the fare is boring and the operation is not.', 'cash:35000,brand:1,days:40'],
  ['tour', 'A tour operator wants a seasonal block. The seats are full. The yield is thin.', 'dem:1.1,price:-1,days:25'],
  ['gov', 'A government delegation needs a reliable departure, not a spectacle.', 'trust:2,cash:25000,days:8'],
  ['military', 'Military personnel on ordinary tickets are asking for a group move. It is a legal charter, not a stunt.', 'cash:48000,days:5'],
  ['medpax', 'A hospital is sending a surgical team to another city today.', 'brand:2,trust:1,cash:12000,days:4'],
  ['workers', 'Emergency utility crews need seats after a storm.', 'brand:2,dem:1.04,days:8'],
  ['aid', 'Humanitarian staff are trying to position before a relief window closes.', 'trust:2,brand:1,days:10'],
  ['connect', 'A wave of misconnecting passengers from another airline is in your lobby.', 'sat:2,cash:-18000,days:3'],
  ['vip', 'A well-known executive asks for a held departure and a quiet cabin. They do not run the airline.', 'brand:1,rel:-1,cash:20000,days:2'],
  ['celebrity', 'A celebrity’s team wants the airplane held twelve minutes. The rest of the cabin does not.', 'brand:1,sat:-1,days:2'],
  ['family', 'A family with a tight connection asks you to hold. The crew is still legal.', 'sat:2,rel:-1,days:2'],
  ['school', 'A school band missed their inbound. Forty seats, one angry director, one clock.', 'sat:1,cash:-8000,days:2'],
]

for (const [id, body, take] of groups) {
  dilemma(
    `x_pax_${id}`, 'Passengers', 'gate', 'A group is at the gate',
    body,
    ['Make room for them', 'You take the goodwill and the disruption that comes with it.', take],
    ['Keep the published schedule', 'The group finds another way. Your clock does not move.', 'rel:1,sat:-1,days:3'],
    { min: 4 },
  )
}

const crewRows: [string, string, string, string, string][] = [
  ['sick', 'Two pilots called in sick', 'The pair is legal on paper and gone in practice.', 'cash:-30000,rel:1,days:4', 'sat:-2,rel:-2,days:4'],
  ['training', 'The simulator is full', 'Recurrent training is backed up. You can buy a slot from another airline or fly the crews you have.', 'cash:-45000,safe:1,days:20', 'safe:-1,sal:1.03,days:25'],
  ['overtime', 'Duty time is tight tonight', 'The return will land inside the limit only if nothing slips.', 'cash:-22000,safe:1,days:3', 'rel:-1,safe:-1,days:4'],
  ['reserve', 'Hire a contract crew for the week', 'A staffing agency can cover one aircraft. They are not cheap, and they are legal.', 'cash:-38000,rel:1,days:8', 'sat:-1,days:6'],
  ['morale', 'The crew room is sour', 'Rosters have been tight. A bonus would be noticed. A speech would not.', 'cash:-25000,sat:1,rel:1,days:20', 'rel:-1,days:20'],
  ['union', 'The pilots want a meeting', 'They are not on strike. They are counting duty days out loud.', 'sal:1.06,trust:1,days:40', 'rel:-2,sat:-1,days:20'],
  ['fa', 'Cabin crew are short for the morning bank', 'You can cancel one departure or pay overtime and fly it.', 'rel:-1,sat:-1,days:2', 'cash:-12000,rel:1,days:2'],
  ['burnout', 'A senior captain asks for a month off', 'Grant it and the reserve gets thinner. Refuse and you may lose them anyway.', 'rel:-1,safe:1,days:30', 'safe:-1,days:20'],
  ['newhire', 'A training class can start early', 'You pay for it now. The reserve exists later.', 'cash:-60000,safe:1,rel:1,days:40', '-'],
  ['strikevote', 'A strike vote is scheduled', 'It is a vote, not a walkout. How you answer it is the story.', 'sal:1.05,trust:1,days:30', 'trust:-2,rel:-1,days:20'],
  ['contract', 'A contract maintenance crew walks', 'The heavy check slips unless you pay the new rate.', 'cash:-50000,maint:1.05,days:15', 'maint:1.12,rel:-1,days:15'],
  ['fatigue', 'Fatigue reports are up', 'This is a roster problem, not a crash. More pilots, or a thinner schedule.', 'sal:1.04,safe:1,days:30', 'safe:-1,rel:-1,days:20'],
]

for (const [id, title, body, pay, hold] of crewRows) {
  dilemma(
    `x_crew_${id}`, 'Crew', id === 'fatigue' ? 'news' : 'strike', title, body,
    ['Spend the money and cover the trip', 'Cost now. The operation looks boring, which is the point.', pay],
    ['Fly with the roster you have', 'You save the cash and accept a tighter operation.', hold],
    { min: 8, when: id === 'fatigue' ? (ctx) => (ctx.fatigue ?? 0) >= 48 : undefined },
  )
}

const ethics: [string, string, string, string, string][] = [
  ['remote', 'The only flight to a small city is losing money', 'About $20,000 a day, and it is the air service that town has.', 'cash:-20000,brand:2,trust:2,days:20', 'brand:-2,trust:-2,dem:1.02,days:20'],
  ['gouge', 'Fares could jump during a local emergency', 'Seats will sell either way. The price you file is the story.', 'cash:40000,trust:-3,brand:-2,days:10', 'trust:2,brand:2,days:10'],
  ['strand', 'Another airline cancelled and their passengers are in your terminal', 'You can take some of them at a discount or leave them to the rebooking desk.', 'sat:2,trust:2,cash:-12000,days:4', 'trust:-1,days:4'],
  ['community', 'A mayor asks you not to drop a thin route', 'There is no subsidy attached. There is a microphone.', 'brand:2,trust:1,days:30', 'brand:-1,days:12'],
  ['discount-relief', 'Offer a relief fare for a week', 'You will carry people who need to get home. You will not make a profit on them.', 'trust:2,sat:1,cash:-20000,days:8', 'cash:15000,trust:-1,days:8'],
  ['full-price-relief', 'Charge a normal fare for the relief flying', 'The capacity is real. So is the photograph of the fare.', 'cash:28000,trust:-2,days:8', 'trust:1,days:6'],
  ['unprofitable', 'A route has not made money in a month', 'Closing it is clean. Keeping it is a choice about what kind of airline you are.', 'rel:1,brand:-1,days:15', 'brand:2,trust:1,cash:-15000,days:20'],
  ['overbook-ethics', 'You can deny boarding or pay volunteers', 'The flight is four seats over. The rule book allows either.', 'cash:-16000,sat:1,days:2', 'sat:-3,trust:-2,cash:-4000,days:6'],
]

for (const [id, title, body, keep, cut] of ethics) {
  dilemma(`x_eth_${id}`, 'Ethical', 'regional', title, body,
    ['Take the costly, public choice', keep.startsWith('cash:-') || keep.includes('trust:2') ? 'Goodwill is the product you are buying.' : 'You take the money and the reputation that comes with it.', keep],
    ['Take the financially cleaner choice', 'The books look better. Someone will remember.', cut],
    { min: 10, once: id === 'remote' || id === 'unprofitable' },
  )
}

const memorable: [string, string, string, string, string, string][] = [
  ['lease-ask', 'A stranded airline wants to wet-lease one of your jets for ten days', 'They will pay. Your own schedule gives up the airplane.', 'apron', 'cash:160000,dem:0.94,days:10', '-'],
  ['hub-left', 'A competitor is leaving a hub you do not serve', 'Slots and passengers will not sit there forever.', 'gate', 'dem:1.08,brand:1,days:30', '-'],
  ['charter-team', 'A famous club needs a charter this weekend', 'One airplane, two days, a large check, and a hole in the schedule.', 'boom', 'cash:140000,dem:0.97,days:3', 'brand:1,days:3'],
  ['corp-contract', 'A corporation wants a year of employee travel at a discount', 'Volume in exchange for yield.', 'news', 'dem:1.06,price:-1,cash:80000,days:60', '-'],
  ['town-left', 'A remote town lost its only airline', 'They are asking you to start a thin route. No one is promising it will pay.', 'regional', 'brand:3,trust:2,cash:-30000,days:40', 'brand:-1,days:10'],
  ['concert', 'A stadium show will fill every hotel in your home city', 'Three days of demand. Then it is over.', 'boom', 'dem:1.16,days:4', 'dem:1.08,brand:1,days:4'],
  ['disaster-cargo', 'Relief coordinators need lift after an earthquake', 'You can donate space, discount it, or sell it.', 'rain', 'brand:3,trust:2,cash:-25000,days:12', 'cash:60000,trust:-2,days:10'],
  ['subsidy-temp', 'A state offers a six-week subsidy on a thin route', 'The fare has a ceiling. The check is real.', 'regional', 'cash:90000,dem:1.05,days:42', '-'],
  ['early-delivery', 'A lessor can hand you an airplane early, at a discount', 'The interior is unfinished. The price is not a favor you should trust blindly.', 'apron', 'cash:-120000,brand:1,days:20', '-'],
  ['fleet-flood', 'A bankrupt carrier’s airplanes hit the market at once', 'Some are cheap because they are tired.', 'recession', 'used:-0.2,maint:1.08,days:45', '-'],
  ['investor', 'An investor offers growth capital', 'The money is real. So is the opinion that comes with it.', 'news', 'cash:400000,brand:-1,days:30', 'brand:1,days:8'],
  ['premium-cut', 'Your insurer will cut the premium if the next quarter is dull', 'No accidents, no deferred critical defects, and they will notice.', 'hangar', 'safe:1,trust:1,days:40', '-'],
  ['capacity-loss', 'Your home airport just lost a runway for three weeks', 'Not a mystery. A construction overrun.', 'construction', 'dem:0.92,rel:-1,days:21', 'fuel:1.06,days:21'],
  ['new-airport', 'A new airport opens in a city you already serve', 'Some passengers will split. Some will be new.', 'construction', 'dem:0.96,days:40', 'dem:1.04,days:30'],
  ['sports-final', 'A final is in your hub and every fare is already high', 'You can add a charter or let the scheduled flights take the yield.', 'boom', 'cash:100000,days:3', 'dem:1.12,days:3'],
]

for (const [id, title, body, scene, yes, no] of memorable) {
  dilemma(`x_once_${id}`, 'Special opportunity', scene as SceneName, title, body,
    ['Take the opportunity', 'You accept the upside and the mess attached to it.', yes],
    ['Let it pass', 'The airline stays on the plan you already had.', no],
    { min: 12, once: true, weight: 1 },
  )
}

const ops: [string, string, string, string, string, string, string, string, string][] = [
  ['hold-connect', 'Passengers', 'A bank of connections is twenty minutes late', 'Hold the outbound', 'The connections make it. Crew overtime and a later night follow.', 'sat:2,cash:-14000,rel:-1,days:2', 'Depart on schedule', 'Reliability holds. Some people sleep in the terminal.', 'rel:2,sat:-2,trust:-1,cash:-6000,days:3'],
  ['oversold', 'Passengers', 'The noon flight is booked past the seats', 'Pay volunteers to step off', 'It costs money and the airplane leaves full and calm.', 'cash:-18000,sat:1,days:2', 'Deny boarding by the rule', 'Cheaper today. The complaint file is not cheap.', 'sat:-3,trust:-2,days:8'],
  ['bag-late', 'Passengers', 'A bag cart missed the airplane', 'Deliver the bags tonight on the next flight', 'You pay the courier and the apology.', 'cash:-7000,sat:1,days:2', 'Tell them to file a claim', 'The process is correct and cold.', 'sat:-2,trust:-1,days:6'],
  ['bag-wrong', 'Passengers', 'Twenty bags went to the wrong city', 'Reroute them on the next departure', 'Cost and a day of embarrassment.', 'cash:-11000,sat:1,days:3', 'Wait for the scheduled recovery', 'Slower, cheaper, angrier.', 'sat:-2,days:5'],
  ['bag-claim', 'Passengers', 'A passenger says a valuable bag is missing', 'Settle quickly', 'You close it before it becomes a story.', 'cash:-9000,trust:1,days:4', 'Investigate first', 'You might pay less. You will pay slower.', 'sat:-1,days:10'],
  ['wx-divert', 'Weather', 'The destination just went below minimums', 'Divert to the filed alternate', 'Extra fuel, landing fees, and passengers who are not where they bought a ticket to.', 'cash:-22000,sat:-1,safe:1,days:2', 'Hold and hope for a window', 'You might save the diversion. You might run the crew out of duty.', 'rel:-1,safe:-1,days:2'],
  ['wx-return', 'Weather', 'A line of storms is on the arrival', 'Turn back and try tomorrow', 'The honest choice. The hotel bill is yours if you promised them.', 'cash:-16000,trust:1,days:2', 'Press the arrival', 'Some will land. Some will not enjoy it.', 'sat:-2,safe:-1,days:2'],
  ['swap', 'Operational', 'The assigned airplane will not make the departure', 'Swap to the spare', 'If you have one, the trip goes. The spare’s own flight does not.', 'rel:1,dem:0.98,days:2', 'Cancel and rebook', 'Cleaner than a heroic delay. The passengers still lose the day.', 'sat:-2,rel:-1,cash:-8000,days:2'],
  ['delay-mx', 'Maintenance', 'A defect was found at the gate', 'Fix it before departure', 'The flight is late and the airplane is honest.', 'cash:-20000,safe:2,rel:-1,days:2', 'Defer it onto the book', 'You leave on time. The record gets heavier.', 'safe:-1,rel:1,days:6'],
  ['engine-light', 'Maintenance', 'An engine indication flickered and came back', 'Return for an inspection', 'A cancelled sector and a quiet night.', 'cash:-25000,safe:2,days:2', 'Continue to destination', 'Legal if the indication is stable. It is still a bet.', 'safe:-1,days:3'],
  ['bird-report', 'Safety', 'Departure reported a bird strike on rotation. The airplane is flying fine.', 'Return for an inspection', 'Most of these are nothing. The inspection is how you know.', 'cash:-12000,safe:1,days:1', 'Continue and inspect at arrival', 'You keep the trip and look at the engines on the ground.', 'safe:-1,rel:1,days:1'],
  ['cargo-smoke', 'Cargo', 'The crew smells something in the cargo hold. It may be nothing.', 'Return to the airport', 'This is the call the book expects.', 'cash:-18000,safe:2,days:2', 'Continue while the crew monitors', 'You are choosing to stay airborne with an unknown smell.', 'safe:-2,days:2'],
  ['slot-buy', 'Airport', 'A peak slot opened at a congested airport you already want', 'Buy it', 'Cash now. A better bank later, if you can fill it.', 'cash:-180000,dem:1.05,days:60', 'Walk away', 'The slot will not wait.', '-'],
  ['closure', 'Airport', 'An airport on your network will close for a day', 'Reroute the flights', 'Fuel and confusion, and people still travel.', 'fuel:1.08,sat:-1,days:2', 'Cancel the day', 'Simple, and the passengers will say so.', 'sat:-2,rel:-1,cash:-5000,days:2'],
  ['hedge12', 'Fuel', 'A bank will lock your fuel price for twelve months', 'Hedge', 'You win if fuel rises. You look foolish if it falls.', 'cash:-90000,fuel:0.97,days:80', 'Stay on the spot price', 'You keep the freedom and the risk.', '-'],
  ['lease-deal', 'Fleet', 'A lessor offers three narrow-bodies at a low monthly rate', 'Sign the leases', 'The exit fee is large. The airplanes are available.', 'cash:-70000,dem:1.04,days:40', 'Decline', 'You do not take on the term.', '-'],
  ['price-entry', 'Competition', 'A rival just filed a very low fare on your best route', 'Match them', 'You keep the passengers and give away the yield.', 'price:-1,dem:1.04,days:20', 'Hold your fare and add a snack', 'Some people leave. The ones who stay paid you.', 'sat:1,dem:0.96,days:20'],
  ['leave-route', 'Competition', 'The same rival is now under your cost on a second route', 'Leave that route to them', 'You stop the bleeding.', 'brand:-1,days:15', 'Stay and spend on reliability', 'A dull operation is a product.', 'rel:1,cash:-20000,days:20'],
  ['liquidate', 'Aircraft market', 'A competitor is selling airplanes cheap and fast', 'Look at the metal', 'The price is the easy part. Cycles and missing records are the hard part.', 'used:-0.16,maint:1.06,days:40', 'Stay out of the auction', 'Your cash stays where it is.', '-'],
  ['slots-free', 'Airport', 'A bankrupt rival released gates at your home airport', 'Take two gates', 'You pay, and you have room to grow.', 'cash:-140000,dem:1.03,days:50', 'Let another airline have them', 'You stay the size you are.', '-'],
  ['bonus', 'Labor', 'The maintenance crew hit every departure this month', 'Pay the bonus you mentioned', 'It was said out loud. They remember.', 'cash:-20000,rel:1,safe:1,days:20', 'Say thank you and stop there', 'Free, and a little thinner next month.', 'rel:-1,days:15'],
  ['burn', 'Labor', 'Ramp staff are working their sixth long week', 'Add heads', 'The overtime bill falls later.', 'cash:-30000,rel:1,days:30', 'Keep the overtime', 'You pay it forever and call it flexible.', 'sal:1.05,rel:-1,days:25'],
  ['organ', 'Medical', 'A transplant team needs a departure in two hours', 'Go now', 'The organ moves. Your scheduled passengers wait.', 'brand:3,trust:2,cash:8000,sat:-1,days:2', 'Keep the scheduled flight', 'The team finds another airplane, or they do not.', 'days:2'],
  ['medevac', 'Medical', 'A medevac request would take one of your airplanes off a bank', 'Accept the medevac', 'Special revenue, a broken schedule, and a story people retell.', 'cash:35000,brand:2,dem:0.97,days:2', 'Decline', 'Your own passengers leave on time.', 'rel:1,days:2'],
  ['relief-free', 'Humanitarian', 'Relief supplies are sitting in your warehouse city', 'Donate the space', 'You eat the fuel and the handling.', 'brand:3,trust:2,cash:-20000,days:10', 'Fly it at a commercial rate', 'Legal, paid, and easy to quote back at you.', 'cash:45000,trust:-1,days:8'],
  ['env', 'Environmental', 'A city wants a noise curfew you can meet by retiming one arrival', 'Retire the late arrival', 'One bank moves. The neighbors notice.', 'brand:1,dem:0.98,days:30', 'Keep the late slot', 'The curfew becomes a fight.', 'trust:-1,days:20'],
  ['geo', 'Geopolitical', 'An overflight restriction adds forty minutes to a long route', 'Fly the longer path', 'Fuel up, schedule slips, passengers still go.', 'fuel:1.1,days:20', 'Suspend the route for the month', 'You stop the loss. You also stop the presence.', 'dem:0.95,brand:-1,days:20'],
  ['econ', 'Economic', 'A currency swing made an international fare suddenly cheap in local money', 'Leave the fare', 'You fill seats and wreck the yield.', 'dem:1.1,price:-1,days:20', 'Reprice in a week', 'You look slow. You might look sane.', 'days:8'],
  ['regulator', 'Regulatory', 'An inspector wants a voluntary demonstration of your duty-time software', 'Open it', 'If the roster is clean, trust rises. If it is not, you will know together.', 'trust:1,safe:1,days:10', 'Ask them to come back next month', 'Legal delay. Noted delay.', 'trust:-1,days:12'],
  ['env2', 'Environmental', 'Sustainable fuel is available at a vanity price', 'Buy a small batch and say so', 'The climate math is modest. The brand math is the point.', 'cash:-35000,brand:2,days:20', 'Skip the press release', 'You do not buy the fuel.', '-'],
]

for (const [id, tag, title, aLab, aDet, aCode, bLab, bDet, bCode] of ops) {
  const scene: SceneName = tag === 'Weather' ? 'rain' : tag === 'Medical' || tag === 'Humanitarian' ? 'news' : tag === 'Fuel' ? 'fuel' : tag === 'Maintenance' || tag === 'Safety' ? 'hangar' : 'gate'
  dilemma(`x_ops_${id}`, tag, scene, title, `${title}. The choice is operational, and it will not decide the whole airline by itself.`,
    [aLab, aDet, aCode],
    [bLab, bDet, bCode],
    { min: 5, weight: tag === 'Safety' || tag === 'Maintenance' ? 1 : 1 },
  )
}

three('x_relief_choice', 'Humanitarian', 'rain', 'Relief agencies need lift',
  'Supplies are ready. You can give the space away, sell it cheap, or sell it at the ordinary cargo rate.',
  [
    ['donate', 'Donate the capacity', 'Fuel and handling are on you. The city will remember.', 'brand:3,trust:2,cash:-28000,days:12'],
    ['discount', 'Fly it at a discount', 'You cover the cost and a little more. Goodwill is partial.', 'cash:18000,brand:1,days:12'],
    ['full', 'Charge the commercial rate', 'The freight moves. The press release writes itself, and not in your favor.', 'cash:52000,trust:-2,brand:-1,days:10'],
  ],
  { min: 14, once: true },
)

three('x_oversell_3', 'Passengers', 'gate', 'Four passengers will not fit',
  'The airplane is oversold. You can buy volunteers, upgrade someone and shuffle, or deny boarding.',
  [
    ['volunteer', 'Offer compensation', 'People step off for money. The flight leaves whole.', 'cash:-20000,sat:1,days:2'],
    ['upgrade', 'Upgrade and rebook the rest', 'A few are happy. A few are merely moved.', 'cash:-8000,sat:1,days:2'],
    ['deny', 'Deny boarding', 'The rule allows it. The memory is worse than the rule.', 'sat:-3,trust:-2,dem:0.98,days:10'],
  ],
  { min: 7 },
)

three('x_vip_3', 'Passengers', 'gate', 'A delegation wants special handling',
  'They are important to someone. They are not in charge of your airline.',
  [
    ['priority', 'Give them a quiet, on-time departure', 'Small cost. No theater.', 'brand:1,cash:-4000,days:2'],
    ['hold', 'Hold the airplane for them', 'The rest of the cabin pays for their clock.', 'brand:1,sat:-2,rel:-1,days:2'],
    ['no', 'Treat them as ordinary passengers', 'Fair, and someone will call it rude.', 'rel:1,days:2'],
  ],
  { min: 9 },
)

three('x_bird_3', 'Safety', 'runway', 'Bird strike on departure',
  'The strike was real. The airplane is still flying. This is an inspection decision, not a disaster movie.',
  [
    ['return', 'Return for a look', 'You lose the sector and you see the engines.', 'cash:-15000,safe:2,days:1'],
    ['dest', 'Continue and inspect on arrival', 'Common when the indication is stable. You still write it up.', 'safe:1,rel:1,days:1'],
    ['defer', 'Note it and keep the schedule tight', 'You save the turn and you skip the careful version.', 'safe:-2,days:4'],
  ],
  { min: 8, weight: 1 },
)

export const CATALOG_EVENTS: EventDef[] = catalog

function oldest(s: GameState) {
  return s.fleet.filter((a) => a.status !== 'lost' && a.status !== 'stored').sort((a, b) => a.yearBuilt - b.yearBuilt)[0]
}

function bump(s: GameState, rep: Partial<GameState['reputation']>) {
  for (const key of Object.keys(rep) as (keyof GameState['reputation'])[]) {
    const n = rep[key]
    if (n) s.reputation[key] = clamp(s.reputation[key] + n, 0, 100)
  }
}

function shock(s: GameState, mul: number, days: number, label: string) {
  s.modifiers = s.modifiers.filter((m) => m.id !== 'special-shock')
  s.modifiers.push({ id: 'special-shock', label, untilDay: s.meta.day + days, demandMul: mul })
}

/** Probabilistic choices. The common result is the quiet one. */
export function applyCatalogChoice(s: GameState, id: string, choiceId: string): boolean {
  if (id === 'x_undeclared') return undeclared(s, choiceId)
  if (id === 'x_wildlife') return wildlife(s, choiceId)
  if (id === 'x_signoff') return signoff(s, choiceId)
  if (id === 'x_skipcheck') return skipcheck(s, choiceId)
  return false
}

function undeclared(s: GameState, choiceId: string): boolean {
  if (choiceId === 'report') {
    bump(s, { trust: 2, safety: 1 })
    pushNews(s, 'You reported the offer', 'The intermediary wanted $180,000 for freight with paperwork that did not match the shipment. You handed the approach to the authorities. There is no cargo revenue.', SCENE.news, 'Cargo')
    return true
  }
  if (choiceId === 'reject') {
    pushNews(s, 'You declined the undeclared freight', 'No payment. No inspection. The offer goes somewhere else.', SCENE.apron, 'Cargo')
    return true
  }
  if (choiceId !== 'accept') return true
  s.finance.cash += 180_000
  s.finance.lifetimeRevenue += 180_000
  const inspected = rand(s.meta) < 0.12
  if (!inspected) {
    pushNews(s, 'The shipment was delivered', 'You were paid $180,000. Nothing in the paperwork was clearer than it was yesterday. This time, nobody opened it.', SCENE.apron, 'Cargo')
    return true
  }
  const severe = rand(s.meta) < 0.22
  const fine = severe ? 1_100_000 : 420_000
  s.finance.cash -= fine
  s.finance.lifetimeExpenses += fine
  bump(s, severe ? { trust: -8, safety: -4, brand: -6 } : { trust: -4, brand: -3, safety: -1 })
  if (severe) {
    shock(s, 0.86, 70, 'After a cargo investigation')
    s.meta.insuranceLoad = clamp((s.meta.insuranceLoad ?? 1) + 0.35, 1, 4)
    pushNews(s, 'The freight was seized', `Inspectors did not like the documents. The shipment is gone. The fine is ${fine.toLocaleString('en-US')}. The certificate is being discussed, and demand will feel it.`, SCENE.news, 'Regulatory')
    if (s.reputation.safety < 10 && s.finance.cash < 0) {
      s.meta.gameOver = true
      s.meta.gameOverReason = 'A cargo investigation ended in a fine the airline could not carry, and the certificate was pulled.'
      s.meta.gameOverImage = SCENE.news
      s.meta.speed = 0
    }
  } else {
    pushNews(s, 'An inspection caught the paperwork', `The freight was confiscated. You paid ${fine.toLocaleString('en-US')}. The operation continues, with a mark on it.`, SCENE.news, 'Regulatory')
  }
  return true
}

function wildlife(s: GameState, choiceId: string): boolean {
  if (choiceId === 'report') {
    bump(s, { trust: 3, brand: 1, safety: 1 })
    pushNews(s, 'You reported the animal offer', 'Someone wanted a large payment to move undocumented animals. You refused and reported it. There is no instruction in this beyond the decision.', SCENE.news, 'Regulatory')
    return true
  }
  if (choiceId === 'reject') {
    pushNews(s, 'You refused the animal shipment', 'No payment. No quarantine. No story.', SCENE.apron, 'Cargo')
    return true
  }
  if (choiceId !== 'accept') return true
  s.finance.cash += 240_000
  s.finance.lifetimeRevenue += 240_000
  const caught = rand(s.meta) < 0.18
  if (!caught) {
    bump(s, { brand: -1 })
    pushNews(s, 'The animals were delivered', 'You were paid $240,000. No inspector opened the crates. That is the reward. It is also the risk you already took.', SCENE.apron, 'Cargo')
    return true
  }
  const fine = 1_600_000
  s.finance.cash -= fine
  s.finance.lifetimeExpenses += fine
  bump(s, { trust: -10, brand: -8, safety: -3 })
  shock(s, 0.8, 90, 'After a wildlife case')
  s.market.closedAirports.push({ id: s.airline.home, untilDay: s.meta.day + 2, reason: 'Quarantine hold on a cargo shipment' })
  pushNews(s, 'The crates were opened', `Quarantine, a welfare case, and a fine of ${fine.toLocaleString('en-US')}. The airline is now the story.`, SCENE.news, 'Regulatory')
  return true
}

function signoff(s: GameState, choiceId: string): boolean {
  const ac = oldest(s)
  if (choiceId === 'reject' || !ac) {
    pushNews(s, 'You kept the normal inspection', 'The contractor’s early sign-off stays unused.', SCENE.hangar, 'Maintenance')
    return true
  }
  s.finance.cash += 90_000
  const age = calendar(s.meta.day).year - ac.yearBuilt
  const ageW = 1 + Math.max(0, age - 20) / 26
  ac.neglect = clamp((ac.neglect ?? 0) + 20 * ageW, 0, 100)
  ac.ignoredFault = true
  bump(s, { safety: -2 })
  if (rand(s.meta) < 0.1) {
    const fine = 250_000
    s.finance.cash -= fine
    bump(s, { trust: -3, safety: -2 })
    pushNews(s, 'The early sign-off did not hold', `${ac.tailNumber} was signed off early. A later look disagreed. The fine is ${fine.toLocaleString('en-US')}, and the maintenance record is worse, especially because the airplane is ${age} years old.`, SCENE.hangar, 'Regulatory')
  } else {
    pushNews(s, 'The inspection was signed off early', `${ac.tailNumber} is back on the line. You saved time and money. The deferred risk is now on the airplane, and it counts for more on an older airframe.`, SCENE.hangar, 'Maintenance')
  }
  return true
}

function skipcheck(s: GameState, choiceId: string): boolean {
  const ac = oldest(s)
  if (choiceId === 'full') {
    const cost = 280_000
    s.finance.cash -= cost
    s.finance.lifetimeExpenses += cost
    if (ac) {
      ac.neglect = clamp((ac.neglect ?? 0) - 28, 0, 100)
      ac.ignoredFault = false
    }
    bump(s, { safety: 2, trust: 1 })
    pushNews(s, 'The inspection was done in full', `You spent ${cost.toLocaleString('en-US')}. The record is cleaner.`, SCENE.hangar, 'Maintenance')
    return true
  }
  if (ac) {
    const age = calendar(s.meta.day).year - ac.yearBuilt
    const ageW = 1 + Math.max(0, age - 20) / 26
    ac.neglect = clamp((ac.neglect ?? 0) + 16 * ageW, 0, 100)
    ac.ignoredFault = true
    pushNews(s, 'The inspection was deferred', `${ac.tailNumber} stays in service. You kept $280,000. The maintenance exposure went up, and it went up faster because the airplane is old.`, SCENE.hangar, 'Maintenance')
  } else {
    pushNews(s, 'There was no airplane to defer', 'The choice did not find an active aircraft.', SCENE.hangar, 'Maintenance')
  }
  bump(s, { safety: -1 })
  return true
}

catalog.push(
  {
    id: 'x_undeclared', title: 'Undeclared cargo', image: SCENE.apron, weight: 1, minDay: 18, once: true, tag: 'Cargo',
    build: () => ({
      title: 'An offer for undeclared cargo',
      body: 'An intermediary offers $180,000 to carry freight whose documents do not match the shipment. You are not told what it is. The payment is far above a normal cargo rate. High payment, real chance of an inspection.',
      choices: [
        { id: 'accept', label: 'Accept', detail: 'Most of the time the money clears. An inspection means confiscation, a fine, and a record.' },
        { id: 'reject', label: 'Reject', detail: 'No payment and no exposure.' },
        { id: 'report', label: 'Report', detail: 'You hand the offer to the authorities. Trust rises. There is no cargo revenue.' },
      ],
    }),
  },
  {
    id: 'x_wildlife', title: 'Undocumented animals', image: SCENE.news, weight: 1, minDay: 24, once: true, tag: 'Cargo',
    build: () => ({
      title: 'A payment for undocumented animals',
      body: 'An intermediary offers $240,000 to move several exotic animals with no proper papers. This is a decision about the offer, not a method. The payment is high because the downside is a quarantine, a welfare case, and a heavy fine.',
      choices: [
        { id: 'accept', label: 'Accept', detail: 'A large payment if nobody opens the crates. If they do, the consequences are public.' },
        { id: 'reject', label: 'Refuse', detail: 'No payment. No case.' },
        { id: 'report', label: 'Report the authorities', detail: 'You refuse and report the approach.' },
      ],
    }),
  },
  {
    id: 'x_signoff', title: 'Early sign-off', image: SCENE.hangar, weight: 1, minDay: 12, tag: 'Maintenance',
    build: () => ({
      title: 'A contractor will sign the inspection early',
      body: 'The work is not finished. The signature can be. You get the airplane back tonight and you take the regulatory risk, which sits harder on an older airframe.',
      choices: [
        { id: 'accept', label: 'Accept the early sign-off', detail: 'Save time and about $90,000. A later audit can disagree.' },
        { id: 'reject', label: 'Wait for the real inspection', detail: 'Normal operation.' },
      ],
    }),
  },
  {
    id: 'x_skipcheck', title: 'Inspection is due', image: SCENE.hangar, weight: 1, minDay: 10, tag: 'Maintenance',
    build: () => ({
      title: 'A heavy inspection is due',
      body: 'The book says the inspection is due. Performing it costs $280,000 and grounds the airplane. Deferring keeps the cash and adds maintenance risk, more so if the airplane is old.',
      choices: [
        { id: 'full', label: 'Perform the full inspection', detail: 'Pay $280,000. The risk record improves.' },
        { id: 'defer', label: 'Defer', detail: 'Keep the $280,000. Exposure accumulates.' },
      ],
    }),
  },
)
