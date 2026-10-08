import { SCENE } from './airports'
import { CATALOG_EVENTS } from './eventCatalog'
import { EXTRA_EVENTS } from './eventExtras'
import { EXPANDED_EVENTS } from './expandedEvents'
import type { Choice } from '../types'

export interface EventDef {
  id: string
  title: string
  image: string
  weight: number
  minDay: number
  once?: boolean
  tag: string
  build: (ctx: EventCtx) => { title: string; body: string; choices: Choice[] } | null
}

export interface EventCtx {
  day: number
  home: string
  homeName: string
  fuel: number
  cash: number
  fleetFamilies: string[]
  weakestRival: string | null
  playerRoute: string | null
  fatigue?: number
  hasRoute?: boolean
}

export const EVENTS: EventDef[] = [
  {
    id: 'fuel_spike', title: 'Jet fuel jumps', image: SCENE.fuel, weight: 8, minDay: 4, tag: 'Fuel',
    build: () => ({
      title: 'Global jet fuel prices rise',
      body: 'A supply scare lifted spot jet fuel. Older, thirstier aircraft will feel this first. You can buy a 60-day hedge at a premium, or stay exposed.',
      choices: [
        { id: 'hedge', label: 'Hedge for 60 days', detail: 'Pay 4% of cash (minimum $80,000) to lock today’s price.' },
        { id: 'float', label: 'Stay exposed', detail: 'Fuel index rises about 22% until the market cools.' },
      ],
    }),
  },
  {
    id: 'fuel_slide', title: 'Fuel prices ease', image: SCENE.fuel, weight: 6, minDay: 10, tag: 'Fuel',
    build: () => ({
      title: 'Jet fuel prices fall',
      body: 'Refinery output recovered and the spot price slipped. Thirsty aircraft get a temporary reprieve.',
      choices: [{ id: 'ok', label: 'Note the market', detail: 'Fuel index declines for the next month.' }],
    }),
  },
  {
    id: 'recession', title: 'Recession', image: SCENE.recession, weight: 5, minDay: 20, tag: 'Economy',
    build: () => ({
      title: 'Passenger demand softens',
      body: 'Business travel budgets are being cut. Load factors will sag unless fares move. Airlines with heavy debt are the first to wobble.',
      choices: [
        { id: 'hold', label: 'Hold the network', detail: 'Demand falls about 18% for two months.' },
        { id: 'cut', label: 'Park the weakest jet', detail: 'Store your oldest active aircraft and trim exposure.' },
      ],
    }),
  },
  {
    id: 'tourism', title: 'Tourism boom', image: SCENE.boom, weight: 7, minDay: 8, tag: 'Demand',
    build: () => ({
      title: 'Leisure demand surges',
      body: 'Hotels are full and weekend flights are selling. You can add a modest marketing push or simply take the traffic.',
      choices: [
        { id: 'market', label: 'Spend $60,000 on ads', detail: 'Brand ticks up and you catch more of the boom.' },
        { id: 'ride', label: 'Take the demand as it comes', detail: 'Demand rises for about a month.' },
      ],
    }),
  },
  {
    id: 'pilot_pay', title: 'Pilot shortage', image: SCENE.news, weight: 6, minDay: 12, tag: 'Crew',
    build: () => ({
      title: 'Pilot salaries are rising',
      body: 'Regionals and majors are bidding for the same crews. If you do not adjust pay, fatigue and resignations follow. If you do, the monthly bill grows.',
      choices: [
        { id: 'raise', label: 'Raise pilot pay 12%', detail: 'Fatigue eases. Payroll stays higher.' },
        { id: 'freeze', label: 'Freeze wages', detail: 'Salary pressure still leaks in, and fatigue climbs.' },
      ],
    }),
  },
  {
    id: 'storm', title: 'Severe weather', image: SCENE.rain, weight: 9, minDay: 2, tag: 'Weather',
    build: (ctx) => ({
      title: 'Weather system disrupts flying',
      body: `A slow storm is sitting on the ${ctx.homeName} region. Expect delays, a few cancellations, and irritable connecting passengers.`,
      choices: [
        { id: 'waive', label: 'Waive change fees and absorb it', detail: 'Smaller reputation hit. No cash today.' },
        { id: 'operate', label: 'Operate everything you can', detail: 'More delays, more complaints, less immediate cost.' },
      ],
    }),
  },
  {
    id: 'price_war', title: 'Price war', image: SCENE.gate, weight: 8, minDay: 6, tag: 'Competition',
    build: (ctx) => ({
      title: 'A rival cuts fares on your market',
      body: ctx.playerRoute
        ? `An aggressive fare just appeared on ${ctx.playerRoute}. Load factor may rise across the market while profits thin out.`
        : 'Rivals are discounting across the Texas triangle. Your next fare decision matters.',
      choices: [
        { id: 'match', label: 'Match the cut on your cheapest route', detail: 'You drop price 12% to defend share.' },
        { id: 'ignore', label: 'Keep your fare', detail: 'You may lose passengers for a while.' },
      ],
    }),
  },
  {
    id: 'rival_fail', title: 'Competitor bankruptcy', image: SCENE.recession, weight: 4, minDay: 25, once: true, tag: 'Competition',
    build: (ctx) => ctx.weakestRival ? ({
      title: `${ctx.weakestRival} files for bankruptcy`,
      body: 'Aircraft are being parked and dumped into the used market. Prices soften. Routes they abandon will not stay empty for long.',
      choices: [{ id: 'ok', label: 'Watch the used market', detail: 'Their fleet hits the listings. Used prices fall.' }],
    }) : null,
  },
  {
    id: 'cheap_metal', title: 'Used aircraft glut', image: SCENE.apron, weight: 6, minDay: 8, tag: 'Fleet',
    build: () => ({
      title: 'Stored aircraft return to market',
      body: 'Lessors are discounting mid-life narrow-bodies. A few airframes on your screen just got cheaper. Condition still varies wildly.',
      choices: [{ id: 'ok', label: 'Review listings', detail: 'Asking prices fall about 12%.' }],
    }),
  },
  {
    id: 'grounding', title: 'Fleet inspection', image: SCENE.hangar, weight: 4, minDay: 15, tag: 'Safety',
    build: (ctx) => {
      const fam = ctx.fleetFamilies[0]
      if (!fam) return null
      return {
        title: 'Manufacturer bulletin',
        body: `A bulletin hits the ${fam} family. You can ground affected aircraft for inspections or keep flying and accept the risk.`,
        choices: [
          { id: 'comply', label: 'Ground and inspect', detail: 'Those aircraft sit for several days. Safety reputation holds.' },
          { id: 'defer', label: 'Defer the bulletin', detail: 'You keep revenue. A later failure becomes much more likely.' },
        ],
      }
    },
  },
  {
    id: 'parts', title: 'Parts shortage', image: SCENE.hangar, weight: 6, minDay: 10, tag: 'Maintenance',
    build: () => ({
      title: 'Maintenance parts are scarce',
      body: 'Lead times on engines and avionics have stretched. Every shop visit costs more for the next month.',
      choices: [{ id: 'ok', label: 'Adjust the plan', detail: 'Maintenance costs rise for 30 days.' }],
    }),
  },
  {
    id: 'holiday', title: 'Holiday peak', image: SCENE.boom, weight: 7, minDay: 6, tag: 'Demand',
    build: () => ({
      title: 'Holiday travel fills the terminals',
      body: 'Families are traveling. Frequency and a tolerable fare will sell. Miss the operation and the complaints last longer than the holiday.',
      choices: [{ id: 'ok', label: 'Staff the bank', detail: 'Demand rises for two weeks.' }],
    }),
  },
  {
    id: 'new_lcc', title: 'New entrant', image: SCENE.gate, weight: 4, minDay: 18, once: true, tag: 'Competition',
    build: () => ({
      title: 'A new low-cost airline launches',
      body: 'Fieldlight Air has certificates, two leased 737s, and a habit of pricing below cost. They just picked a city you know.',
      choices: [{ id: 'ok', label: 'Track their fares', detail: 'A fourth competitor enters the world.' }],
    }),
  },
  {
    id: 'slots', title: 'Gate offer', image: SCENE.construction, weight: 5, minDay: 14, tag: 'Airport',
    build: (ctx) => ({
      title: `${ctx.homeName} offers more gates`,
      body: 'The airport will lease you two extra daily slot pairs. The rent is real, and so is the construction dust.',
      choices: [
        { id: 'take', label: 'Pay $250,000 and take the gates', detail: 'Your slot cap at home increases.' },
        { id: 'pass', label: 'Decline', detail: 'No change.' },
      ],
    }),
  },
  {
    id: 'audit', title: 'Regulatory audit', image: SCENE.news, weight: 4, minDay: 20, tag: 'Safety',
    build: () => ({
      title: 'Inspectors request your records',
      body: 'A routine audit became specific. Deferred defects and ignored warnings are exactly what they asked to see.',
      choices: [
        { id: 'open', label: 'Open the books', detail: 'A fine if your safety reputation is weak. Trust rises slightly.' },
        { id: 'delay', label: 'Delay and lawyer up', detail: 'Cash cost now, and they will not forget.' },
      ],
    }),
  },
  {
    id: 'engine_warn', title: 'Engine warning', image: SCENE.hangar, weight: 7, minDay: 5, tag: 'Maintenance',
    build: () => ({
      title: 'Trend monitoring flagged an engine',
      body: 'One of your aircraft is making more metal than the manual likes. Cancelling is expensive. Ignoring it is how investigations start.',
      choices: [{ id: 'ok', label: 'Open the defect', detail: 'A critical fault is added. You will have to dispatch or repair.' }],
    }),
  },
  {
    id: 'cargo', title: 'Cargo contract', image: SCENE.apron, weight: 6, minDay: 7, tag: 'Cargo',
    build: () => ({
      title: 'A shipper wants belly space',
      body: 'A regional freight forwarder will pay for guaranteed belly capacity on your existing flights for 45 days. The rate is decent. The penalty for missing departures is not.',
      choices: [
        { id: 'sign', label: 'Sign the contract', detail: 'Cargo revenue rises. Cancellations will hurt trust.' },
        { id: 'no', label: 'Decline', detail: 'No change.' },
      ],
    }),
  },
  {
    id: 'rates', title: 'Interest rates rise', image: SCENE.news, weight: 5, minDay: 12, tag: 'Finance',
    build: () => ({
      title: 'Credit markets tighten',
      body: 'New borrowing just became more expensive. Existing loans keep their coupons, which is the only good news.',
      choices: [{ id: 'ok', label: 'Revisit the debt plan', detail: 'New-loan rates increase.' }],
    }),
  },
  {
    id: 'subsidy', title: 'Route subsidy', image: SCENE.regional, weight: 4, minDay: 10, tag: 'Policy',
    build: () => ({
      title: 'A public-service offer',
      body: 'A state program will pay $18,000 per departure on one short route for 60 days if you keep a cap on the walk-up fare and do not drop the frequency.',
      choices: [
        { id: 'take', label: 'Accept the subsidy', detail: 'Cash support, and a fare ceiling on your shortest route.' },
        { id: 'no', label: 'Stay independent', detail: 'No change.' },
      ],
    }),
  },
  {
    id: 'bailout', title: 'Emergency credit', image: SCENE.news, weight: 3, minDay: 30, tag: 'Finance',
    build: (ctx) => ctx.cash < 800_000 ? ({
      title: 'A lender offers rescue financing',
      body: 'The terms are blunt: $3 million, a high coupon, and they skim 15% of operating profit until the loan is gone. Rejecting it is allowed. So is going broke.',
      choices: [
        { id: 'take', label: 'Take the money', detail: 'Cash now. Profit share and a bullet loan.' },
        { id: 'no', label: 'Refuse', detail: 'No rescue.' },
      ],
    }) : null,
  },
  {
    id: 'noise', title: 'Noise rule', image: SCENE.night, weight: 4, minDay: 16, tag: 'Regulation',
    build: () => ({
      title: 'Night noise restrictions tighten',
      body: 'Older, louder aircraft pick up an extra airport charge. The rule will not be repealed because you own an MD-80.',
      choices: [{ id: 'ok', label: 'Update the cost model', detail: 'Classic and aging aircraft pay more per departure.' }],
    }),
  },
  {
    id: 'runway', title: 'Runway closure', image: SCENE.construction, weight: 5, minDay: 9, tag: 'Airport',
    build: (ctx) => ({
      title: `${ctx.homeName} closes a runway`,
      body: 'Construction takes a runway for six days. Expect delays and a hard cap on how many of your departures actually leave.',
      choices: [{ id: 'ok', label: 'Retime the bank', detail: 'Your home airport is congested for six days.' }],
    }),
  },
  {
    id: 'recovery', title: 'Demand recovery', image: SCENE.boom, weight: 5, minDay: 24, tag: 'Economy',
    build: () => ({
      title: 'Bookings are coming back',
      body: 'Corporate travel desks are reopening routes they cut. Airlines with a reputation for showing up will take more than their share.',
      choices: [{ id: 'ok', label: 'Keep the schedule', detail: 'Demand and the economy index improve.' }],
    }),
  },
  {
    id: 'snow', title: 'Winter storm', image: SCENE.snow, weight: 5, minDay: 3, tag: 'Weather',
    build: () => ({
      title: 'Snow closes a northern field',
      body: 'Denver and Chicago are in it. Aircraft already airborne may divert. Aircraft on the ground will wait.',
      choices: [{ id: 'ok', label: 'Hold the deice plan', detail: 'Mountain and midwest zones slow down.' }],
    }),
  },
  {
    id: 'health', title: 'Demand shock', image: SCENE.recession, weight: 2, minDay: 50, once: true, tag: 'Crisis',
    build: () => ({
      title: 'A global health emergency',
      body: 'International bookings collapse within a week. Aircraft are being parked worldwide. Cargo is the only line still growing. This is not a normal month.',
      choices: [
        { id: 'park', label: 'Park half the fleet and cut exposure', detail: 'You store aircraft and keep cash.' },
        { id: 'fly', label: 'Keep flying the network', detail: 'Demand craters. You burn cash to hold the brand.' },
      ],
    }),
  },
  {
    id: 'merger_seed', title: 'Merger approach', image: SCENE.merger, weight: 4, minDay: 28, tag: 'Deals',
    build: (ctx) => ctx.weakestRival ? ({
      title: `${ctx.weakestRival} wants a deal`,
      body: 'Their bankers called. The airline is intact enough to sell and distressed enough to be dangerous. Open the offer and read the debt before you fall in love with the airplanes.',
      choices: [{ id: 'ok', label: 'Open the offer', detail: 'A buy, merge, or reject decision follows.' }],
    }) : null,
  },
  {
    id: 'strike', title: 'Airport labor action', image: SCENE.strike, weight: 4, minDay: 14, tag: 'Airport',
    build: (ctx) => ({
      title: 'Ground crews slow down',
      body: `${ctx.homeName} ramp crews are staging a work action. Turns will miss. You can pay a premium contractor or wait it out.`,
      choices: [
        { id: 'pay', label: 'Hire contract ramp crews — $40,000', detail: 'Delays ease.' },
        { id: 'wait', label: 'Wait it out', detail: 'Several days of congestion.' },
      ],
    }),
  },
  {
    id: 'credit_up', title: 'Credit improves', image: SCENE.news, weight: 3, minDay: 20, tag: 'Finance',
    build: (ctx) => ctx.cash > 1_500_000 ? ({
      title: 'A bank revises your file',
      body: 'On-time flying and a positive cash balance got you a meeting. They are willing to move you up a credit notch if you want the relationship.',
      choices: [
        { id: 'take', label: 'Accept the review', detail: 'Credit rating improves one step if you are not already strong.' },
        { id: 'no', label: 'Not now', detail: 'No change.' },
      ],
    }) : null,
  },
  {
    id: 'value_drop', title: 'Aircraft values fall', image: SCENE.apron, weight: 4, minDay: 12, tag: 'Fleet',
    build: () => ({
      title: 'Appraisers mark the fleet down',
      body: 'A wave of lease returns hit the market. Your aircraft are still the same machines. The number a buyer will wire is not.',
      choices: [{ id: 'ok', label: 'Mark the books', detail: 'Used prices and resale values fall.' }],
    }),
  },
  {
    id: 'sport', title: 'Citywide event', image: SCENE.boom, weight: 5, minDay: 8, tag: 'Demand',
    build: (ctx) => ({
      title: `A major event is coming to ${ctx.homeName}`,
      body: 'For ten days the city is sold out. Fares can rise without the usual punishment, and then the city goes quiet again.',
      choices: [
        { id: 'raise', label: 'Raise your home-route fares 15%', detail: 'You take the yield.' },
        { id: 'steady', label: 'Keep fares and win goodwill', detail: 'Brand rises a little. Demand still rises.' },
      ],
    }),
  },
  ...EXTRA_EVENTS,
  ...CATALOG_EVENTS,
  ...EXPANDED_EVENTS,
]

export function eventById(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id)
}
