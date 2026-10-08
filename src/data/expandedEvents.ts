import { SCENE } from './airports'
import { SIMPLE_RESOLVE } from './eventExtras'
import type { EventCtx, EventDef } from './events'
import type { SimpleFx } from './eventExtras'

type SceneName = keyof typeof SCENE
type Fx = Omit<SimpleFx, 'id' | 'label' | 'headline' | 'body' | 'image' | 'tag' | 'days'> & { days?: number }

interface ChoiceInput {
  id: string
  label: string
  detail: string
  outcome: string
  fx: Fx
}

function makeEvent(
  id: string,
  tag: string,
  scene: SceneName,
  title: string,
  body: string,
  choices: ChoiceInput[],
  opt: { weight?: number; minDay?: number; once?: boolean; when?: (ctx: EventCtx) => boolean } = {},
): EventDef {
  const image = SCENE[scene]
  for (const c of choices) {
    SIMPLE_RESOLVE.set(`${id}:${c.id}`, {
      id: `${id}-${c.id}`,
      label: title,
      headline: title,
      body: c.outcome,
      image,
      tag,
      days: c.fx.days ?? 20,
      ...c.fx,
    })
  }

  return {
    id,
    title,
    image,
    weight: opt.weight ?? 3,
    minDay: opt.minDay ?? 4,
    once: opt.once ?? false,
    tag,
    build: (ctx) => {
      if (opt.when && !opt.when(ctx)) return null
      return {
        title,
        body,
        choices: choices.map((c) => ({ id: c.id, label: c.label, detail: c.detail })),
      }
    },
  }
}

export const EXPANDED_EVENTS: EventDef[] = [
  // ==========================================
  // OPERATIONS (4 events)
  // ==========================================
  makeEvent(
    'exp_ops_baggage_barcode',
    'Operations',
    'apron',
    'Baggage sorting upgrade',
    'Ramp supervisors report that handwritten luggage tags are causing misdirected bags on connecting turns. Ground equipment vendors offer optical laser scanners or commercial handheld leases.',
    [
      {
        id: 'laser',
        label: 'Purchase laser scanner stations ($35,000)',
        detail: 'Direct optical bag tracking reduces lost baggage and expedites gate turns.',
        outcome: 'New laser tag readers installed. Turnaround errors fell sharply and passengers noticed faster baggage carousel delivery.',
        fx: { cash: -35000, rep: { reliability: 2, satisfaction: 2, trust: 1 }, days: 40 },
      },
      {
        id: 'handheld',
        label: 'Lease handheld rugged scanners ($12,000)',
        detail: 'Low upfront cost for leased mobile scanners with modest accuracy improvements.',
        outcome: 'Handheld scanners deployed on ramp carts. Ramp misconnects decreased moderately.',
        fx: { cash: -12000, rep: { reliability: 1, satisfaction: 1 }, days: 30 },
      },
      {
        id: 'manual',
        label: 'Stick with clipboards & manual verification',
        detail: 'Zero capital expenditure. Periodic misplaced bag claims will continue.',
        outcome: 'Manual checks maintained. Cash preserved, though occasional baggage delays persist.',
        fx: { rep: { reliability: -1, satisfaction: -1 }, days: 20 },
      },
    ],
    { weight: 4, minDay: 5 },
  ),

  makeEvent(
    'exp_ops_turnaround_target',
    'Operations',
    'gate',
    'Turnaround buffer mandate',
    'The scheduling desk wants to tighten aircraft turn times from 45 minutes to 35 minutes to squeeze in extra utilization, while station managers warn tight turns increase delay cascades.',
    [
      {
        id: 'tight',
        label: 'Enforce aggressive 35-minute turns',
        detail: 'Maximizes fleet flying hours, but puts heavy strain on ground crews and cabin cleaners.',
        outcome: 'Aircraft utilization increased. Daily flights generate higher passenger yield, but occasional gate delays ripple.',
        fx: { demandMul: 1.05, maintMul: 1.08, rep: { reliability: -1, satisfaction: 1 }, days: 25 },
      },
      {
        id: 'buffer',
        label: 'Keep 45-minute scheduled turnaround buffer',
        detail: 'Protects on-time departure records and gives mechanics breathing room between legs.',
        outcome: 'Schedule buffer preserved. Flight crews regularly depart on the dot, strengthening passenger trust.',
        fx: { rep: { reliability: 2, trust: 1 }, days: 30 },
      },
      {
        id: 'slack',
        label: 'Extend to 50-minute leisure turns',
        detail: 'Guarantees on-time departures at the cost of fleet schedule efficiency.',
        outcome: 'Aircraft sit longer at gates. Departures are virtually always on schedule, but aircraft productivity drops.',
        fx: { demandMul: 0.96, rep: { reliability: 3, satisfaction: 1 }, days: 25 },
      },
    ],
    { weight: 4, minDay: 6 },
  ),

  makeEvent(
    'exp_ops_parts_consignment',
    'Operations',
    'hangar',
    'Line maintenance spare parts stock',
    'An aircraft components supplier proposes keeping a dedicated consignment inventory of wheel assemblies, brake packs, and avionics boxes in your home base maintenance bay.',
    [
      {
        id: 'deposit',
        label: 'Place $24,000 deposit for consignment stock',
        detail: 'Guarantees instant access to critical spares. Avoids AOG flight cancellations.',
        outcome: 'Consignment spares placed in hangar. Maintenance dispatch times improved and AOG risks were mitigated.',
        fx: { cash: -24000, maintMul: 0.92, rep: { reliability: 2, safety: 1 }, days: 45 },
      },
      {
        id: 'spot',
        label: 'Order parts on spot market as needed',
        detail: 'Keeps cash free today, but emergency express parts shipping costs more when faults strike.',
        outcome: 'No upfront capital spent on stock. Line repairs proceed on demand with occasional transit delays.',
        fx: { rep: { reliability: -1 }, days: 20 },
      },
    ],
    { weight: 3, minDay: 8 },
  ),

  makeEvent(
    'exp_ops_deice_truck_prebook',
    'Operations',
    'snow',
    'Seasonal de-icing apron reservation',
    'Airport ground services are opening seasonal priority reservation slots for heated fluid de-icing pads before winter congestion peaks.',
    [
      {
        id: 'priority',
        label: 'Contract guaranteed de-icing priority ($28,000)',
        detail: 'Your departures skip the standard de-ice queue during freeze events.',
        outcome: 'Priority de-icing agreement signed. Your flights taxi past long queues on freezing mornings.',
        fx: { cash: -28000, rep: { reliability: 3, trust: 1 }, days: 35 },
      },
      {
        id: 'standard',
        label: 'Pay standard secondary queue fee ($10,000)',
        detail: 'Modest advance fee with standard first-come first-served de-icing rights.',
        outcome: 'Standard de-ice rights secured. Flights take customary winter hold times without excessive delay.',
        fx: { cash: -10000, rep: { reliability: 1 }, days: 25 },
      },
      {
        id: 'ad_hoc',
        label: 'Rely on spot queue without reservation',
        detail: 'Zero upfront commitment. May face significant takeoff delays during unexpected snow.',
        outcome: 'Zero money spent upfront. Line crews will queue behind major carriers on freezing days.',
        fx: { rep: { reliability: -2, satisfaction: -1 }, days: 20 },
      },
    ],
    { weight: 3, minDay: 10 },
  ),

  // ==========================================
  // PASSENGERS (4 events)
  // ==========================================
  makeEvent(
    'exp_pax_lost_bag_policy',
    'Passengers',
    'gate',
    'Lost baggage resolution policy',
    'Consumer advocacy ratings highlighted passenger frustration with commercial airline lost luggage recovery timelines. Customer service seeks guidance on claim policies.',
    [
      {
        id: 'concierge',
        label: 'Immediate $150 credit & courier delivery ($18,000)',
        detail: 'Fast direct apology and home delivery transforms frustrated travelers into brand advocates.',
        outcome: 'Generous baggage concierge policy established. Passenger reviews applauded your rapid responsiveness.',
        fx: { cash: -18000, rep: { satisfaction: 3, trust: 2, brand: 1 }, days: 30 },
      },
      {
        id: 'standard',
        label: 'Standard regulatory claims workflow ($5,000)',
        detail: 'Complies with civil aviation bag delay minimums without extra perks.',
        outcome: 'Standard claims processing maintained. Modest processing expenses incurred without major PR impact.',
        fx: { cash: -5000, rep: { satisfaction: 0, trust: 0 }, days: 20 },
      },
      {
        id: 'strict',
        label: 'Strict documentation & travel voucher only',
        detail: 'Restricts payouts to travel credits after 14 business days. Minimizes immediate cash outlay.',
        outcome: 'Strict claims policy enforced. Cash saved, but disgruntled travelers voiced complaints online.',
        fx: { rep: { satisfaction: -2, trust: -2, brand: -1 }, days: 25 },
      },
    ],
    { weight: 4, minDay: 4 },
  ),

  makeEvent(
    'exp_pax_lounge_reciprocal',
    'Passengers',
    'gate',
    'Regional airport lounge partnership',
    'An independent airport hospitality network invites your airline to offer executive club lounge entry for your top-tier and full-fare business travelers.',
    [
      {
        id: 'full_lounge',
        label: 'Fund lounge access for full-fare passengers ($22,000)',
        detail: 'Enhances premium appeal and corporate flyer retention with quiet lounges and espresso bars.',
        outcome: 'Lounge partnership activated. High-yield business travelers commended the elevated departure experience.',
        fx: { cash: -22000, demandMul: 1.06, rep: { satisfaction: 2, brand: 2, trust: 1 }, days: 40 },
      },
      {
        id: 'copay_lounge',
        label: 'Offer discounted $25 co-pay pass ($8,000)',
        detail: 'Airlines co-funds half the entry fee; flyers pay a nominal access charge.',
        outcome: 'Co-pay lounge option launched. Budget-conscious business flyers welcomed the flexible amenity.',
        fx: { cash: -8000, demandMul: 1.02, rep: { satisfaction: 1, brand: 1 }, days: 30 },
      },
      {
        id: 'decline_lounge',
        label: 'Decline lounge agreement',
        detail: 'Focus strictly on affordable seats without non-essential terminal perks.',
        outcome: 'Lounge proposal declined. Airline remains dedicated to straightforward ticket economics.',
        fx: { rep: { price: 1 }, days: 20 },
      },
    ],
    { weight: 3, minDay: 7 },
  ),

  makeEvent(
    'exp_pax_overbook_bump',
    'Passengers',
    'gate',
    'Peak flight overbooking protocol',
    'Strong weekend traffic resulted in two peak departures being oversold by three seats each due to standard commercial statistical algorithms. Station managers require clear bump compensation.',
    [
      {
        id: 'generous',
        label: 'Offer $300 flight voucher & meal ($14,000)',
        detail: 'Enthusiastic volunteers step forward immediately; departures leave on schedule.',
        outcome: 'Volunteers willingly surrendered seats for vouchers. Flights departed on time without gate friction.',
        fx: { cash: -14000, rep: { satisfaction: 2, trust: 2, reliability: 1 }, days: 25 },
      },
      {
        id: 'voucher_modest',
        label: 'Offer minimal $100 travel credit ($4,000)',
        detail: 'Slow volunteer response may cause minor boarding delays.',
        outcome: 'Volunteers hesitated, creating a 20-minute boarding delay before seats were resolved.',
        fx: { cash: -4000, rep: { satisfaction: -1, reliability: -1 }, days: 15 },
      },
      {
        id: 'involuntary',
        label: 'Execute involuntary denied boarding',
        detail: 'Zero upfront bonus offered. Regulatory minimum legal reimbursement only.',
        outcome: 'Gate agents involuntarily bumped travelers. Loud arguments erupted at the podium and online.',
        fx: { rep: { satisfaction: -3, trust: -3, brand: -2 }, days: 25 },
      },
    ],
    { weight: 3, minDay: 6 },
  ),

  makeEvent(
    'exp_pax_infant_family_kits',
    'Passengers',
    'regional',
    'Family travel amenity program',
    'Cabin staff suggest distributing complimentary coloring packs, child wing pins, and gate-check stroller tags to ease boarding bottlenecks for families traveling during school breaks.',
    [
      {
        id: 'approve_kits',
        label: 'Deploy family boarding amenity kits ($6,000)',
        detail: 'Small operational expense that delights traveling parents and speeds up aisle seating.',
        outcome: 'Family kits rolled out. Parents praised the welcoming atmosphere and boarding aisles cleared faster.',
        fx: { cash: -6000, rep: { satisfaction: 2, brand: 1, trust: 1 }, days: 30 },
      },
      {
        id: 'skip_kits',
        label: 'Maintain standard cabin inventory',
        detail: 'Keeps onboard commissary simple and avoids recurring toy inventory costs.',
        outcome: 'Standard procedures maintained without additional cabin expenses.',
        fx: { days: 10 },
      },
    ],
    { weight: 3, minDay: 5 },
  ),

  // ==========================================
  // CREW (4 events)
  // ==========================================
  makeEvent(
    'exp_crew_uniform_update',
    'Crew',
    'regional',
    'Crew uniform & winter coat refresh',
    'Flight attendant union representatives note that initial cabin uniforms have worn thin and lack standardized cold-weather outerwear for outdoor ramp boarding.',
    [
      {
        id: 'designer_uniforms',
        label: 'Order tailored uniforms & wool coats ($32,000)',
        detail: 'High-quality tailored attire elevates corporate presence and crew pride.',
        outcome: 'New tailored uniforms delivered. Cabin crew morale surged and passenger remarks praised the professional appearance.',
        fx: { cash: -32000, salaryMul: 1.02, rep: { brand: 2, trust: 2, satisfaction: 1 }, days: 45 },
      },
      {
        id: 'standard_uniforms',
        label: 'Supply commercial durable uniform sets ($14,000)',
        detail: 'Practical, weather-resistant uniform issue meeting all functional crew needs.',
        outcome: 'Practical uniform replacement completed. Crew appreciated the durable winter jackets.',
        fx: { cash: -14000, rep: { trust: 1 }, days: 30 },
      },
      {
        id: 'defer_uniforms',
        label: 'Postpone uniform refresh to next fiscal year',
        detail: 'Conserves working capital during early carrier growth.',
        outcome: 'Uniform upgrade deferred. Crew voiced frustration over cold outdoor boarding conditions.',
        fx: { rep: { trust: -1, brand: -1 }, days: 20 },
      },
    ],
    { weight: 3, minDay: 8 },
  ),

  makeEvent(
    'exp_crew_hotel_downtown',
    'Crew',
    'night',
    'Crew layover hotel contract renewal',
    'Pilot and flight attendant safety committees petition to move overnight layover hotels from a noisy freeway motel to a quiet hotel in safe walking districts.',
    [
      {
        id: 'downtown_hotel',
        label: 'Contract quality downtown hotels ($16,000)',
        detail: 'Ensures uninterrupted crew rest, reducing chronic fatigue call-outs.',
        outcome: 'New hotel contract executed. Pilots reported superior rest and fatigue sick-calls dropped noticeably.',
        fx: { cash: -16000, salaryMul: 1.02, rep: { reliability: 2, safety: 1, trust: 1 }, days: 40 },
      },
      {
        id: 'airport_motel',
        label: 'Renew budget airport perimeter motel ($6,000)',
        detail: 'Economical solution with dedicated free terminal shuttle service.',
        outcome: 'Budget airport lodging retained. Costs controlled, though occasional complaints about highway noise continue.',
        fx: { cash: -6000, rep: { reliability: -1 }, days: 20 },
      },
    ],
    { weight: 4, minDay: 9 },
  ),

  makeEvent(
    'exp_crew_recurrent_sim',
    'Crew',
    'hangar',
    'Simulator training scheduling crunch',
    'Regional flight training centers have limited full-flight simulator slots available for upcoming pilot recurrent proficiency checks.',
    [
      {
        id: 'prime_sim',
        label: 'Book premium weekend simulator slots ($20,000)',
        detail: 'Maintains daytime pilot training rhythm without pulling crews off live line flying.',
        outcome: 'Proficiency checks completed smoothly on prime hours. Pilot qualification files remain spotless.',
        fx: { cash: -20000, rep: { safety: 2, reliability: 1 }, days: 30 },
      },
      {
        id: 'red_eye_sim',
        label: 'Accept discounted 2:00 AM simulator slots ($8,000)',
        detail: 'Saves cash by conducting mandatory maneuvers training during graveyard hours.',
        outcome: 'Overnight sim sessions conducted. Mandatory checks passed, though pilots incurred temporary fatigue.',
        fx: { cash: -8000, rep: { safety: 1, reliability: -1 }, days: 20 },
      },
      {
        id: 'delay_checks',
        label: 'File 30-day regulatory training extension',
        detail: 'Postpones check-rides to the regulatory grace-period limit.',
        outcome: 'Extension filed. Immediate costs avoided, though chief pilot expressed concern over scheduling backlog.',
        fx: { rep: { safety: -1 }, days: 20 },
      },
    ],
    { weight: 3, minDay: 12 },
  ),

  makeEvent(
    'exp_crew_reserve_pool',
    'Crew',
    'regional',
    'Standby pilot reserve staffing',
    'Chief pilot recommends keeping an additional standby crew pair on reserve duty each morning to absorb unexpected weather holds or medical sick-outs.',
    [
      {
        id: 'expand_reserve',
        label: 'Staff dedicated standby reserve pilot crews ($25,000)',
        detail: 'Provides dependable insurance against flight cancellations when line pilots are delayed.',
        outcome: 'Reserve crews established. Several potential cancellations were averted when relief crews stepped in instantly.',
        fx: { cash: -25000, salaryMul: 1.04, rep: { reliability: 3, trust: 1 }, days: 40 },
      },
      {
        id: 'lean_reserve',
        label: 'Maintain lean staffing without dedicated reserves',
        detail: 'Keeps monthly payroll low. High schedule reliability requires zero pilot sickness.',
        outcome: 'Lean rosters maintained. Payroll remained tight, though a crew duty timeout triggered a cancellation.',
        fx: { rep: { reliability: -2, satisfaction: -1 }, days: 25 },
      },
    ],
    { weight: 3, minDay: 11 },
  ),

  // ==========================================
  // FINANCE (4 events)
  // ==========================================
  makeEvent(
    'exp_fin_vendor_early_pay',
    'Finance',
    'fuel',
    'Aviation fuel early payment incentive',
    'Your primary jet fuel supplier offers a 3% gross billing discount if all fuel rack deliveries are settled within 10 days instead of the customary 45 days.',
    [
      {
        id: 'early_pay',
        label: 'Commit to 10-day early fuel cash payment',
        detail: 'Draws on cash liquidity today to lock in 3% ongoing fuel cost reduction.',
        outcome: 'Early fuel settlement terms established. Fuel billing statements reflected immediate cost reductions.',
        fx: { fuelMul: 0.94, rep: { trust: 1 }, days: 35 },
      },
      {
        id: 'standard_pay',
        label: 'Retain standard 45-day commercial terms',
        detail: 'Protects available cash reserves for aircraft maintenance and unexpected emergencies.',
        outcome: 'Standard payment schedule maintained. Full working capital remains on hand.',
        fx: { days: 15 },
      },
    ],
    { weight: 4, minDay: 7 },
  ),

  makeEvent(
    'exp_fin_short_term_treasury',
    'Finance',
    'news',
    'Operating cash treasury sweep',
    'Your commercial bank account executive suggests placing idle operating funds into overnight yield commercial paper to earn interest income.',
    [
      {
        id: 'treasury_sweep',
        label: 'Enroll in automated commercial cash sweep',
        detail: 'Earns safe liquid interest yield on working balances without locking capital.',
        outcome: 'Cash sweep activated. Bank statements credited modest monthly interest dividends.',
        fx: { cash: 18000, rep: { trust: 1 }, days: 30 },
      },
      {
        id: 'pay_loans',
        label: 'Use surplus to prepay $30,000 loan balance',
        detail: 'Directly lowers outstanding debt leverage and strengthens banking credit perception.',
        outcome: 'Debt principal curtailed early. Commercial bankers commended your conservative fiscal management.',
        fx: { cash: -30000, rep: { trust: 2, brand: 1 }, days: 30 },
      },
      {
        id: 'keep_checking',
        label: 'Keep 100% in primary checking account',
        detail: 'Zero effort or transaction risk. Immediate liquidity for operations.',
        outcome: 'Checking account left unchanged. Instant liquid access preserved.',
        fx: { days: 10 },
      },
    ],
    { weight: 3, minDay: 9 },
  ),

  makeEvent(
    'exp_fin_airport_bond_rebate',
    'Finance',
    'construction',
    'Municipal airport fee tax credit',
    'The local airport development authority launched a rebate program reimbursing eligible facility development fees for carriers creating regional aviation jobs.',
    [
      {
        id: 'file_rebate',
        label: 'Retain aviation tax consultant to file ($8,000)',
        detail: 'Consultant prepares certified documentation to claim municipal tax credits.',
        outcome: 'Municipal audit successfully approved. City treasurer issued a $45,000 airport fee credit rebate.',
        fx: { cash: 37000, feeMul: 0.92, rep: { trust: 1 }, days: 40 },
      },
      {
        id: 'skip_rebate',
        label: 'Forego rebate application',
        detail: 'Avoids consulting fees and administrative accounting overhead.',
        outcome: 'No tax rebate filed. Operations proceeded normally.',
        fx: { days: 10 },
      },
    ],
    { weight: 3, minDay: 13 },
  ),

  makeEvent(
    'exp_fin_insurance_underwriter',
    'Finance',
    'news',
    'Hull & liability insurance review',
    'Aviation underwriters completed their annual fleet risk audit and offered options for adjusting deductible tiers.',
    [
      {
        id: 'higher_deductible',
        label: 'Increase hull deductible for lower monthly premiums',
        detail: 'Saves cash immediately on monthly overhead, but increases exposure if damage occurs.',
        outcome: 'Higher deductible tier selected. Monthly insurance overhead dropped, freeing cash flow.',
        fx: { cash: 22000, maintMul: 1.04, days: 30 },
      },
      {
        id: 'full_coverage',
        label: 'Maintain comprehensive low deductible ($15,000)',
        detail: 'Protects balance sheet against unexpected ramp incidents or foreign object damage.',
        outcome: 'Comprehensive coverage retained. Underwriters confirmed top-tier risk rating for your fleet.',
        fx: { cash: -15000, rep: { safety: 2, trust: 1 }, days: 30 },
      },
    ],
    { weight: 3, minDay: 14 },
  ),

  // ==========================================
  // AIRCRAFT / FLEET (4 events)
  // ==========================================
  makeEvent(
    'exp_ac_cabin_deep_clean',
    'Fleet',
    'hangar',
    'Fleetwide cabin deep sanitization',
    'Line maintenance recommends an overnight deep cleaning and antimicrobial cabin fogging treatment to restore upholstery and sanitize air ducts across active airframes.',
    [
      {
        id: 'deep_detail',
        label: 'Contract thorough deep clean & steam ($24,000)',
        detail: 'Removes carpet stains, deep cleans galleys, and freshens cabin air filters.',
        outcome: 'Cabins deep cleaned overnight. Boarding passengers frequently commented on the immaculate interior aroma.',
        fx: { cash: -24000, rep: { satisfaction: 3, brand: 2, trust: 1 }, days: 35 },
      },
      {
        id: 'quick_wipe',
        label: 'Perform basic interior wipe & vacuum ($6,000)',
        detail: 'Standard quick turn cleaning addressing obvious trash and tray tables.',
        outcome: 'Quick interior wipe performed. Cabin looks acceptable for standard operations.',
        fx: { cash: -6000, rep: { satisfaction: 1 }, days: 20 },
      },
      {
        id: 'defer_clean',
        label: 'Defer until next scheduled heavy maintenance',
        detail: 'Saves cash now. Minor upholstery wear remains visible to passengers.',
        outcome: 'Deep clean postponed. Modest passenger survey marks on seat cleanliness.',
        fx: { rep: { satisfaction: -1, brand: -1 }, days: 20 },
      },
    ],
    { weight: 4, minDay: 5 },
  ),

  makeEvent(
    'exp_ac_avionics_fms_patch',
    'Fleet',
    'hangar',
    'Navigation database & FMS software patch',
    'Avionics manufacturers released a flight management software revision optimizing descent glide paths and RNAV approach transitions.',
    [
      {
        id: 'install_fleetwide',
        label: 'Accelerate fleetwide avionics flash update ($30,000)',
        detail: 'Mechanics work overtime to flash software across all jets immediately.',
        outcome: 'Avionics updated across the fleet. Flight crews reported smoother continuous descents and reduced fuel burn.',
        fx: { cash: -30000, fuelMul: 0.95, rep: { safety: 2, reliability: 1 }, days: 40 },
      },
      {
        id: 'phased_update',
        label: 'Phase in updates during scheduled C-checks ($10,000)',
        detail: 'Low-cost installation as aircraft rotate into maintenance bays.',
        outcome: 'Software patched progressively. Efficiency benefits will ramp in steadily without scheduling disruption.',
        fx: { cash: -10000, fuelMul: 0.98, rep: { safety: 1 }, days: 30 },
      },
      {
        id: 'defer_avionics',
        label: 'Operate current software until mandatory deadline',
        detail: 'Zero immediate cost. Existing navigation procedures remain legal.',
        outcome: 'Software update held in abeyance. Normal dispatch procedures continue.',
        fx: { days: 15 },
      },
    ],
    { weight: 3, minDay: 10 },
  ),

  makeEvent(
    'exp_ac_winglet_evaluation',
    'Fleet',
    'apron',
    'Aerodynamic winglet retrofit inquiry',
    'An aerospace engineering group offers blended winglet modification kits engineered to reduce cruise drag on your primary routes.',
    [
      {
        id: 'retrofit_winglets',
        label: 'Finance winglet retrofit kit ($65,000)',
        detail: 'Significant investment that pays back through lower cruise fuel burn and modern profile.',
        outcome: 'Winglet modification completed. Cruise fuel consumption dropped measurably and aircraft look razor-sharp.',
        fx: { cash: -65000, fuelMul: 0.92, rep: { brand: 2, trust: 1 }, days: 60 },
      },
      {
        id: 'standard_wingtips',
        label: 'Retain standard factory wingtips',
        detail: 'Avoids heavy capital expense and preserves cash for route development.',
        outcome: 'Winglet project declined. Aircraft continue flying in reliable stock configuration.',
        fx: { days: 15 },
      },
    ],
    { weight: 3, minDay: 15 },
  ),

  makeEvent(
    'exp_ac_leather_seat_covers',
    'Fleet',
    'regional',
    'Eco-leather seat refurbishment',
    'Interior cabin suppliers present durable synthetic leather seat dress covers that reduce maintenance cleaning labor and look modern.',
    [
      {
        id: 'leather_upgrade',
        label: 'Install premium synthetic leather seating ($40,000)',
        detail: 'Elevates passenger aesthetic appeal and speeds turnaround cleaning.',
        outcome: 'Modern seating covers installed. Passengers raved about the fresh cabin atmosphere.',
        fx: { cash: -40000, demandMul: 1.05, rep: { satisfaction: 3, brand: 2 }, days: 45 },
      },
      {
        id: 'spot_patch',
        label: 'Steam-clean and repair existing fabric ($12,000)',
        detail: 'Cost-effective repair addressing worn fabric seams and armrests.',
        outcome: 'Fabric seats cleaned and repaired. Cabin presents tidily at a fraction of full replacement.',
        fx: { cash: -12000, rep: { satisfaction: 1 }, days: 25 },
      },
    ],
    { weight: 3, minDay: 11 },
  ),

  // ==========================================
  // AIRPORTS & GATES (4 events)
  // ==========================================
  makeEvent(
    'exp_apt_secondary_incentive',
    'Airport',
    'runway',
    'Secondary airport service incentive',
    'A growing secondary airport authority seeks scheduled air service and offers complete landing fee waivers plus $35,000 in co-op marketing credits.',
    [
      {
        id: 'accept_incentive',
        label: 'Accept incentive package & launch promotional flights',
        detail: 'Receive municipal cash credits and fee waivers to build traffic.',
        outcome: 'Incentive agreement finalized. Regional authority wired marketing subsidy and local travelers embraced the route.',
        fx: { cash: 35000, demandMul: 1.06, rep: { brand: 2, satisfaction: 1 }, days: 35 },
      },
      {
        id: 'decline_incentive',
        label: 'Decline to split network focus',
        detail: 'Focus solely on primary hubs without distracting secondary field operations.',
        outcome: 'Incentive declined. Network planning concentrated on primary commercial corridors.',
        fx: { days: 10 },
      },
    ],
    { weight: 3, minDay: 7 },
  ),

  makeEvent(
    'exp_apt_gate_sublease_inquiry',
    'Airport',
    'gate',
    'Rival gate sublease request',
    'A competitor airline approaches your station director asking to sublease your leased gate during your aircraft’s empty afternoon layover window.',
    [
      {
        id: 'sublease_agree',
        label: 'Sublease gate window for steady rental income ($30,000)',
        detail: 'Generates immediate ancillary revenue from idle gate capacity.',
        outcome: 'Sublease agreement executed. Cash flowed into accounts while your station team monitored apron turns.',
        fx: { cash: 30000, feeMul: 0.94, rep: { reliability: -1 }, days: 30 },
      },
      {
        id: 'refuse_sublease',
        label: 'Refuse gate access to block rival expansion',
        detail: 'Denies competitor ground access and protects your local airport market share.',
        outcome: 'Gate request rejected. Rival was forced to hold aircraft off-gate, defending your market dominance.',
        fx: { rep: { brand: 1, trust: 1 }, days: 20 },
      },
    ],
    { weight: 4, minDay: 8 },
  ),

  makeEvent(
    'exp_apt_terminal_billboard',
    'Airport',
    'gate',
    'Concourse arrival billboard campaign',
    'The airport terminal concessionaire has an opening for a prominent illuminated billboard directly above the baggage claim exits.',
    [
      {
        id: 'buy_prime_board',
        label: 'Contract prime illuminated concourse billboard ($25,000)',
        detail: 'High-visibility branding reinforces local hometown airline presence.',
        outcome: 'Vibrant billboard launched. Departing and arriving business travelers recognized your airline prominently.',
        fx: { cash: -25000, demandMul: 1.07, rep: { brand: 3, trust: 1 }, days: 45 },
      },
      {
        id: 'buy_digital_kiosk',
        label: 'Contract digital rotating kiosk slot ($10,000)',
        detail: 'Rotating digital graphic displays in central security corridor.',
        outcome: 'Digital kiosk ads displayed. Steady passenger brand impressions achieved at moderate cost.',
        fx: { cash: -10000, demandMul: 1.03, rep: { brand: 1 }, days: 30 },
      },
      {
        id: 'skip_advertising',
        label: 'Rely purely on word-of-mouth and flight search engines',
        detail: 'Zero marketing overhead. Rely on fare price competitiveness.',
        outcome: 'Advertising bypassed. Ticket distribution continues through standard reservation channels.',
        fx: { days: 10 },
      },
    ],
    { weight: 4, minDay: 6 },
  ),

  makeEvent(
    'exp_apt_ground_power_mandate',
    'Airport',
    'gate',
    'Terminal bridge 400Hz ground power usage',
    'Airport environmental compliance mandates using terminal electric ground power cables instead of running kerosene APUs while parked at gates.',
    [
      {
        id: 'adopt_ground_power',
        label: 'Enforce bridge ground power hookup ($5,000)',
        detail: 'Reduces onboard engine fuel burn and carbon emissions during passenger boarding.',
        outcome: 'Bridge electric power adopted. Fuel burn during gate turns dropped and environmental inspectors praised compliance.',
        fx: { cash: -5000, fuelMul: 0.95, rep: { trust: 2, brand: 1 }, days: 30 },
      },
      {
        id: 'run_apu_discretion',
        label: 'Leave APU operation to captain discretion',
        detail: 'Avoids bridge hookup fees when turnarounds are short.',
        outcome: 'Captains operated APUs as desired. Gate turns proceeded smoothly with standard fuel consumption.',
        fx: { days: 15 },
      },
    ],
    { weight: 3, minDay: 5 },
  ),

  // ==========================================
  // ROUTES & PRICING (4 events)
  // ==========================================
  makeEvent(
    'exp_rt_midweek_flash_sale',
    'Pricing',
    'news',
    'Midweek fare yield optimization',
    'Revenue management analytics show Tuesday and Wednesday departures flying with surplus unbooked seats. The pricing desk suggests promotional adjustments.',
    [
      {
        id: 'flash_sale',
        label: 'Launch 48-hour midweek flash sale (25% off)',
        detail: 'Stimulates price-sensitive leisure travelers to fill otherwise empty seats.',
        outcome: 'Midweek flash sale was an instant hit. Load factors surged on light days, injecting quick cash.',
        fx: { demandMul: 1.12, rep: { satisfaction: 2, price: 2 }, days: 25 },
      },
      {
        id: 'free_bag_promo',
        label: 'Offer free checked bag on Tuesday/Wednesday flights',
        detail: 'Adds value without lowering ticket yield, attracting family bookings.',
        outcome: 'Free bag perk filled off-peak flights without discounting baseline fares.',
        fx: { demandMul: 1.06, rep: { satisfaction: 2, brand: 1 }, days: 25 },
      },
      {
        id: 'hold_fares',
        label: 'Maintain current published tariff structure',
        detail: 'Protects overall fare integrity and avoids conditioning buyers to wait for discounts.',
        outcome: 'Tariff discipline maintained. Unit yields remained intact despite lower seat occupancy.',
        fx: { rep: { price: -1 }, days: 15 },
      },
    ],
    { weight: 4, minDay: 6 },
  ),

  makeEvent(
    'exp_rt_corporate_travel_rfp',
    'Pricing',
    'gate',
    'Corporate enterprise travel partnership',
    'A major financial and medical corporate group solicits contracted business travel fares for their 400 traveling executives across your network.',
    [
      {
        id: 'win_corporate_contract',
        label: 'Offer 15% corporate discount with volume commitment ($50,000 contract)',
        detail: 'Secures high-volume business travelers who book flights regardless of season.',
        outcome: 'Corporate travel contract signed. High-yield business flyers consistently booked premium seats on weekday routes.',
        fx: { cash: 50000, demandMul: 1.08, rep: { trust: 2, brand: 2 }, days: 45 },
      },
      {
        id: 'offer_flexible_waivers',
        label: 'Offer free flight changes without fare discounts',
        detail: 'Appeals to corporate road-warriors valuing flexibility without slashing revenue.',
        outcome: 'Flexible change policy accepted by executive travel coordinators. Solid booking gains achieved.',
        fx: { demandMul: 1.04, rep: { satisfaction: 2, trust: 1 }, days: 30 },
      },
      {
        id: 'decline_corporate_discount',
        label: 'Decline corporate discounting',
        detail: 'Treat all passengers equally through standard retail booking engines.',
        outcome: 'Corporate group booked on rival carriers. Airline preserved 100% retail inventory control.',
        fx: { days: 15 },
      },
    ],
    { weight: 4, minDay: 9 },
  ),

  makeEvent(
    'exp_rt_redeye_freight_belly',
    'Pricing',
    'apron',
    'Late night belly freight contract',
    'An e-commerce regional distribution center offers a standing cargo container contract for freight space under passenger baggage.',
    [
      {
        id: 'guarantee_freight',
        label: 'Commit belly cargo allotment ($28,000 upfront)',
        detail: 'Boosts cargo revenue per flight with minimal operational interference.',
        outcome: 'Belly freight contract formalized. Baggage loaders filled remaining cargo volume each evening.',
        fx: { cash: 28000, cargoMul: 1.18, rep: { reliability: 1 }, days: 35 },
      },
      {
        id: 'standby_cargo',
        label: 'Accept space-available ad-hoc cargo only ($12,000)',
        detail: 'Prioritizes passenger luggage unconditionally and takes packages only when space permits.',
        outcome: 'Standby cargo accepted. Steady supplemental income earned without risk to passenger luggage.',
        fx: { cash: 12000, cargoMul: 1.08, days: 25 },
      },
      {
        id: 'pax_luggage_only',
        label: 'Restricted to passenger bags only',
        detail: 'Ensures zero ramp weight limits and rapid offloading at carousel.',
        outcome: 'Commercial freight excluded. Quickest possible baggage offload maintained.',
        fx: { rep: { satisfaction: 1 }, days: 15 },
      },
    ],
    { weight: 3, minDay: 8 },
  ),

  makeEvent(
    'exp_rt_seat_selection_fee',
    'Pricing',
    'news',
    'Advance seat selection policy',
    'The ancillary revenue team proposes updating the airline reservation engine regarding seat selection policies.',
    [
      {
        id: 'free_seat_choice',
        label: 'Keep standard advance seat choice free for all',
        detail: 'Distinguishes your airline from punitive ultra-low-cost carriers and delights travelers.',
        outcome: 'Free seat selection praised widely in consumer reviews. Word-of-mouth recommendations surged.',
        fx: { rep: { satisfaction: 3, trust: 2, brand: 2 }, days: 35 },
      },
      {
        id: 'front_row_fee',
        label: 'Charge modest $9 fee for front row & exit rows ($22,000)',
        detail: 'Fair compromise charging only for extra legroom while keeping standard seats free.',
        outcome: 'Front-row seat fees instituted smoothly. Ancillary revenue increased without customer blowback.',
        fx: { cash: 22000, rep: { satisfaction: 0, price: 1 }, days: 30 },
      },
      {
        id: 'unbundle_all_seats',
        label: 'Unbundle every seat with dynamic fees ($45,000)',
        detail: 'Maximizes ancillary booking cash while generating customer friction.',
        outcome: 'Full seat fee unbundling generated heavy ancillary cash, though survey satisfaction fell.',
        fx: { cash: 45000, rep: { satisfaction: -2, trust: -2, price: -2 }, days: 35 },
      },
    ],
    { weight: 4, minDay: 7 },
  ),

  // ==========================================
  // WEATHER (4 events)
  // ==========================================
  makeEvent(
    'exp_wx_summer_heat_wave',
    'Weather',
    'runway',
    'Midsummer heat wave density altitude',
    'An intense high-pressure heat dome pushed airfield temperatures to 104°F, thinning air density and constraining maximum aircraft takeoff weights on afternoon departures.',
    [
      {
        id: 'cap_tickets',
        label: 'Cap afternoon seat sales to guarantee takeoff margin ($15,000 cost)',
        detail: 'Safest operational response. Prevents takeoff performance overruns.',
        outcome: 'Load limits strictly enforced. Flights took off with pristine safety margins without any diversions.',
        fx: { cash: -15000, rep: { safety: 3, reliability: 2, trust: 1 }, days: 20 },
      },
      {
        id: 'offload_cargo',
        label: 'Offload non-essential belly cargo during heat peak',
        detail: 'Flies all booked passengers on time while holding heavy freight for night cooler air.',
        outcome: 'All passengers boarded smoothly. Freight was securely held for cooler late evening departures.',
        fx: { cargoMul: 0.9, rep: { satisfaction: 1, reliability: 1 }, days: 15 },
      },
      {
        id: 'retarget_departures',
        label: 'Delay afternoon flights to dusk cooler air',
        detail: 'Avoids passenger bumping, but creates arrival delays into the evening.',
        outcome: 'Departures held until twilight. Weight margins restored, though late arrivals drew passenger sighs.',
        fx: { rep: { reliability: -2, satisfaction: -1 }, days: 15 },
      },
    ],
    { weight: 4, minDay: 5 },
  ),

  makeEvent(
    'exp_wx_fog_holding_fuel',
    'Weather',
    'rain',
    'Morning coastal fog fuel policy',
    'Dense radiation fog is hovering over regional arrival corridors. Dispatch seeks fuel policy guidance for morning banks.',
    [
      {
        id: 'tanker_holding_fuel',
        label: 'Tanker 45 minutes extra reserve fuel on all legs ($12,000)',
        detail: 'Allows captains to comfortably hold above fog banks without diverting to alternate fields.',
        outcome: 'Generous holding fuel allowed your flights to hold until runways cleared, avoiding costly diversions.',
        fx: { cash: -12000, fuelMul: 1.05, rep: { safety: 2, reliability: 2 }, days: 20 },
      },
      {
        id: 'stagger_departures',
        label: 'Stagger departure slots with air traffic control',
        detail: 'Slows down departure bank to match reduced airport arrival rates.',
        outcome: 'Controlled departure staggering minimized fuel burn while keeping aircraft moving safely.',
        fx: { rep: { reliability: 1, safety: 1 }, days: 15 },
      },
      {
        id: 'legal_minimums',
        label: 'Fly standard legal minimum fuel',
        detail: 'Saves fuel cost, but unexpected runway closures will force diversions.',
        outcome: 'Flights operated with lean reserves. One flight had to divert to a secondary field when visibility dipped.',
        fx: { rep: { reliability: -2, satisfaction: -1 }, days: 15 },
      },
    ],
    { weight: 4, minDay: 4 },
  ),

  makeEvent(
    'exp_wx_winter_snow_prep',
    'Weather',
    'snow',
    'Forecasted winter blizzard mobilization',
    'Meteorologists forecast a major winter snowstorm passing across northern network stations within 24 hours.',
    [
      {
        id: 'pre_cancel_protect',
        label: 'Proactively cancel vulnerable flights with free rebooking',
        detail: 'Prevents aircraft and crews from becoming trapped at snowed-in outstations.',
        outcome: 'Proactive schedule pruning preserved fleet positioning. Passengers appreciated automated rebooking alerts.',
        fx: { demandMul: 0.96, rep: { trust: 2, satisfaction: 1, safety: 2 }, days: 20 },
      },
      {
        id: 'mobilize_heaters',
        label: 'Deploy emergency ramp blowers & heater carts ($20,000)',
        detail: 'Fight the storm on the ground to keep mainline routes operating.',
        outcome: 'Ground heaters mobilized. Crews worked tirelessly to keep jet bridges clear and engines protected.',
        fx: { cash: -20000, rep: { reliability: 2, brand: 1 }, days: 20 },
      },
      {
        id: 'await_storm',
        label: 'Wait for morning tower conditions before deciding',
        detail: 'Zero advance expenditures. React in real time.',
        outcome: 'Storm intensified overnight. Two aircraft were temporarily snowbound at an outstation.',
        fx: { rep: { reliability: -3, satisfaction: -2 }, days: 20 },
      },
    ],
    { weight: 3, minDay: 8 },
  ),

  makeEvent(
    'exp_wx_severe_thunderstorm',
    'Weather',
    'rain',
    'Squall line route deviation',
    'A violent fast-moving line of severe thunderstorms is bisecting the primary cruise airway between your busiest city pairs.',
    [
      {
        id: 'wide_detour',
        label: 'File 150-nautical-mile wide detour around weather ($16,000)',
        detail: 'Burns extra fuel, but delivers a glass-smooth ride completely out of severe turbulence.',
        outcome: 'Flights navigated safely around storm towers. Passengers experienced a tranquil flight and praised pilot airmanship.',
        fx: { cash: -16000, fuelMul: 1.06, rep: { safety: 3, satisfaction: 2, trust: 1 }, days: 20 },
      },
      {
        id: 'ground_stop',
        label: 'Hold aircraft at departure gates until squall passes',
        detail: 'Zero extra airborne fuel burn, at the expense of a 45-minute ground delay.',
        outcome: 'Aircraft held safely on concrete. Delays incurred, but fuel budgets and safety remained secure.',
        fx: { rep: { safety: 2, reliability: -1 }, days: 15 },
      },
    ],
    { weight: 4, minDay: 6 },
  ),

  // ==========================================
  // REPUTATION (4 events)
  // ==========================================
  makeEvent(
    'exp_rep_inflight_magazine',
    'Reputation',
    'regional',
    'Inflight regional lifestyle publication',
    'A high-end regional publishing house proposes creating a quarterly glossy inflight travel magazine tailored to your routes and destinations.',
    [
      {
        id: 'publish_print',
        label: 'Sponsor print seatback magazine edition ($15,000)',
        detail: 'Tactile reading material elevates brand prestige and highlights regional dining and culture.',
        outcome: 'Full-color travel magazine published. Cabin atmosphere felt refined and travelers loved destination features.',
        fx: { cash: -15000, demandMul: 1.04, rep: { brand: 3, satisfaction: 2 }, days: 35 },
      },
      {
        id: 'digital_guide',
        label: 'Publish digital mobile destination guide ($3,000)',
        detail: 'Lightweight QR code digital portal accessible on passenger smartphones.',
        outcome: 'Digital guide launched. Modest engagement achieved with zero seatback paper clutter.',
        fx: { cash: -3000, rep: { brand: 1 }, days: 25 },
      },
      {
        id: 'skip_publication',
        label: 'Decline publishing proposal',
        detail: 'Avoids weight and printing bills. Keeps seatback pockets uncluttered.',
        outcome: 'Publication proposal declined. Cabin operations remain simple.',
        fx: { days: 10 },
      },
    ],
    { weight: 3, minDay: 5 },
  ),

  makeEvent(
    'exp_rep_community_airlift',
    'Reputation',
    'apron',
    'University athletic charter inquiry',
    'A local university athletics department is stranded after their booked bus broke down and desperately needs an aircraft charter to their championship game.',
    [
      {
        id: 'fly_charter_friendly',
        label: 'Fly charter at competitive civic rate ($38,000 revenue)',
        detail: 'Utilizes idle aircraft slot, earns solid cash, and wins massive hometown community affection.',
        outcome: 'Athletic charter flew flawlessly. The university won the tournament and public acclaim flooded local press.',
        fx: { cash: 38000, rep: { brand: 3, trust: 2, satisfaction: 1 }, days: 35 },
      },
      {
        id: 'premium_charter',
        label: 'Quote top commercial charter rate ($55,000 revenue)',
        detail: 'Maximizes charter profit margin on short-notice equipment availability.',
        outcome: 'University accepted premium rate. Substantial cash secured with standard commercial goodwill.',
        fx: { cash: 55000, rep: { brand: 1 }, days: 25 },
      },
      {
        id: 'protect_schedule',
        label: 'Decline charter to keep spare aircraft in reserve',
        detail: 'Protects scheduled commercial operations against unexpected mechanical delays.',
        outcome: 'Charter politely declined. Commercial schedule protected without distraction.',
        fx: { rep: { reliability: 1 }, days: 15 },
      },
    ],
    { weight: 3, minDay: 9 },
  ),

  makeEvent(
    'exp_rep_social_service_team',
    'Reputation',
    'news',
    'Fast-response digital passenger care',
    'Customer service supervisors urge staffing a dedicated real-time digital assistance desk to resolve traveler rebooking questions on mobile channels.',
    [
      {
        id: 'staff_digital_care',
        label: 'Staff dedicated digital travel care team ($16,000)',
        detail: 'Rapid replies to traveler questions defuse frustrations before they become complaints.',
        outcome: 'Digital care team launched. Fast resolutions turned delay gripes into public compliments.',
        fx: { cash: -16000, rep: { satisfaction: 3, trust: 3, brand: 2 }, days: 40 },
      },
      {
        id: 'automated_chat',
        label: 'Implement standard FAQ automated responses ($4,000)',
        detail: 'Handles routine inquiries automatically at low operational cost.',
        outcome: 'Automated response system installed. Handled basic queries adequately.',
        fx: { cash: -4000, rep: { satisfaction: 1 }, days: 20 },
      },
    ],
    { weight: 4, minDay: 6 },
  ),

  makeEvent(
    'exp_rep_mileage_expiration',
    'Reputation',
    'news',
    'Frequent flyer program policy overhaul',
    'Loyalty consultants suggest revising customer loyalty rules to improve long-term traveler retention.',
    [
      {
        id: 'never_expire',
        label: 'Declare that loyalty points never expire',
        detail: 'Bold customer-first commitment building immense customer trust and loyalty.',
        outcome: 'No-expiry loyalty guarantee announced. Massive traveler acclaim and surge in repeat bookings.',
        fx: { demandMul: 1.07, rep: { trust: 3, satisfaction: 3, brand: 2 }, days: 45 },
      },
      {
        id: 'activity_extension',
        label: 'Extend expiry to 24 months with any account activity',
        detail: 'Balanced policy keeping loyalty liabilities manageable while reassuring casual flyers.',
        outcome: '24-month activity rule enacted. Travelers appreciated the reasonable policy.',
        fx: { demandMul: 1.03, rep: { trust: 1, satisfaction: 1 }, days: 30 },
      },
    ],
    { weight: 3, minDay: 12 },
  ),

  // ==========================================
  // ECONOMY (4 events)
  // ==========================================
  makeEvent(
    'exp_econ_hotel_association',
    'Economy',
    'boom',
    'Regional tourism board joint marketing',
    'A destination hotel association offers to co-fund an advertising push promoting weekend getaway package trips along your routes.',
    [
      {
        id: 'co_fund_campaign',
        label: 'Co-fund $18,000 seasonal tourism package campaign',
        detail: 'Pours matching funds into billboard, radio, and travel site promotional banners.',
        outcome: 'Campaign launched across regional markets. Weekend leisure bookings surged nicely.',
        fx: { cash: -18000, demandMul: 1.1, rep: { brand: 2, satisfaction: 1 }, days: 35 },
      },
      {
        id: 'decline_tourism_coop',
        label: 'Decline joint marketing campaign',
        detail: 'Avoids marketing spend and relies on baseline organic route demand.',
        outcome: 'Proposal declined. Route traffic maintained normal seasonal patterns.',
        fx: { days: 10 },
      },
    ],
    { weight: 4, minDay: 7 },
  ),

  makeEvent(
    'exp_econ_fuel_storage_lease',
    'Economy',
    'fuel',
    'Off-airport fuel terminal storage lease',
    'A bulk petrochemical depot near your home hub offers a long-term lease on a 50,000-barrel dedicated jet kerosene storage tank.',
    [
      {
        id: 'lease_storage_tank',
        label: 'Lease storage tank to buffer fuel volatility ($35,000 lease)',
        detail: 'Enables strategic purchasing during price dips and insulates against pipeline spikes.',
        outcome: 'Storage tank leased. Fuel purchasing managers cushioned the airline from unexpected market swings.',
        fx: { cash: -35000, fuelMul: 0.93, rep: { trust: 1 }, days: 45 },
      },
      {
        id: 'spot_rack_delivery',
        label: 'Continue relying on spot rack deliveries',
        detail: 'Zero capital or fixed lease obligations. Take fuel at prevailing day rates.',
        outcome: 'Spot delivery continued. Financial flexibility preserved with standard price exposure.',
        fx: { days: 15 },
      },
    ],
    { weight: 3, minDay: 13 },
  ),

  makeEvent(
    'exp_econ_interest_rate_shift',
    'Economy',
    'news',
    'Commercial banking credit rate adjustment',
    'Financial analysts forecast rate adjustments from central banks, influencing regional credit lines and equipment lease renewals.',
    [
      {
        id: 'lock_fixed_terms',
        label: 'Lock in fixed borrowing rate terms ($15,000 structuring fee)',
        detail: 'Insulates airline debt and leases against rising interest rate shocks.',
        outcome: 'Fixed terms locked. Treasury department secured predictable monthly obligations.',
        fx: { cash: -15000, rep: { trust: 2 }, days: 40 },
      },
      {
        id: 'remain_floating',
        label: 'Remain on variable commercial floating rate',
        detail: 'Zero transaction fee today. Accepts market interest rate fluctuations.',
        outcome: 'Floating rate maintained. Monthly borrowing costs remain subject to broader economic currents.',
        fx: { days: 20 },
      },
    ],
    { weight: 3, minDay: 14 },
  ),

  makeEvent(
    'exp_econ_industrial_boom',
    'Economy',
    'boom',
    'Regional industrial manufacturing boom',
    'A new advanced manufacturing corridor opened near one of your network cities, driving sudden demand for business and technical travel.',
    [
      {
        id: 'tailor_schedule',
        label: 'Tailor schedules to commuter plant shifts ($20,000)',
        detail: 'Adjust early-morning departures to capture high-yield corporate engineering contracts.',
        outcome: 'Commuter schedule adjustments paid off immediately. Plant managers established standing weekly seat blocks.',
        fx: { cash: 32000, demandMul: 1.09, rep: { brand: 2, trust: 1 }, days: 40 },
      },
      {
        id: 'maintain_existing_times',
        label: 'Maintain current published timetable',
        detail: 'Takes organic spillover traffic without re-allocating gate slots.',
        outcome: 'Existing flights absorbed steady extra traffic without operational complexity.',
        fx: { demandMul: 1.04, days: 25 },
      },
    ],
    { weight: 4, minDay: 10 },
  ),

  // ==========================================
  // STRATEGY (4 events)
  // ==========================================
  makeEvent(
    'exp_strat_regional_codeshare',
    'Strategy',
    'regional',
    'Commuter carrier interline agreement',
    'A well-regarded small turboprop operator servicing rural mountain communities proposes an interline ticketing and baggage transfer alliance.',
    [
      {
        id: 'sign_full_interline',
        label: 'Establish full joint ticketing & baggage interline ($30,000)',
        detail: 'Channels rural connecting passengers onto your mainline trunk routes.',
        outcome: 'Interline agreement signed. Connecting travelers from small towns fed into your jet network with seamless checked bags.',
        fx: { cash: -30000, demandMul: 1.1, rep: { brand: 2, satisfaction: 2, trust: 1 }, days: 45 },
      },
      {
        id: 'simple_baggage_only',
        label: 'Agree to baggage transfer agreement only ($12,000)',
        detail: 'Helps connecting flyers without complex joint revenue ticketing software.',
        outcome: 'Baggage agreement activated. Modest traffic boost realized smoothly.',
        fx: { cash: -12000, demandMul: 1.04, rep: { trust: 1 }, days: 30 },
      },
      {
        id: 'reject_interline',
        label: 'Politely decline interline partnership',
        detail: 'Keeps passenger manifest handling independent and avoids third-party delay exposure.',
        outcome: 'Interline proposal declined. Airline remains entirely self-contained.',
        fx: { days: 15 },
      },
    ],
    { weight: 3, minDay: 10 },
  ),

  makeEvent(
    'exp_strat_maint_base_hub',
    'Strategy',
    'hangar',
    'In-house line maintenance base development',
    'The VP of Technical Operations recommends leasing a dedicated hangar stall at home base to perform line maintenance and overnight phase checks in-house.',
    [
      {
        id: 'lease_hangar_bay',
        label: 'Lease dedicated home hangar maintenance bay ($45,000 setup)',
        detail: 'Higher fixed facility cost, but permanently cuts per-flight maintenance expenses and reduces downtime.',
        outcome: 'Dedicated hangar bay opened. In-house mechanics turned scheduled work orders faster and with higher precision.',
        fx: { cash: -45000, maintMul: 0.88, rep: { safety: 3, reliability: 2 }, days: 50 },
      },
      {
        id: 'outsource_mro',
        label: 'Continue contracting third-party MRO shops on demand',
        detail: 'Zero fixed hangar rent. Pay contract technicians on an hourly as-needed basis.',
        outcome: 'Contract MRO retained. Keeps fixed overhead light while paying variable maintenance rates.',
        fx: { maintMul: 1.03, days: 25 },
      },
    ],
    { weight: 3, minDay: 12 },
  ),

  makeEvent(
    'exp_strat_charter_wetlease',
    'Strategy',
    'runway',
    'High-yield weekend corporate wet-lease',
    'A major tech enterprise requests a 3-day wet-lease charter of one of your active aircraft and crew for a corporate leadership conference.',
    [
      {
        id: 'accept_wetlease',
        label: 'Accept 3-day corporate charter wet-lease ($46,000 profit)',
        detail: 'Substantial immediate profit cash, requiring careful crew schedule adjustment.',
        outcome: 'Executive charter operated with precision. Substantial cash wired and corporate organizers left enthusiastic reviews.',
        fx: { cash: 46000, demandMul: 1.03, rep: { brand: 2, trust: 1 }, days: 30 },
      },
      {
        id: 'decline_wetlease',
        label: 'Keep aircraft dedicated to scheduled public routes',
        detail: 'Protects commercial passengers and ensures zero schedule disruption.',
        outcome: 'Charter declined. Standard timetable operated without modification.',
        fx: { rep: { reliability: 1 }, days: 15 },
      },
    ],
    { weight: 4, minDay: 8 },
  ),

  makeEvent(
    'exp_strat_fleet_commonality',
    'Strategy',
    'hangar',
    'Fleet type commonality policy',
    'The director of flight operations urges establishing a clear corporate fleet policy to favor pilot type-rating commonality and streamlined spare parts.',
    [
      {
        id: 'commit_commonality',
        label: 'Formally commit to fleet family commonality ($15,000 policy)',
        detail: 'Standardizes cockpit procedures, cross-crew scheduling, and maintenance tooling.',
        outcome: 'Fleet commonality doctrine adopted. Cross-utilization efficiency improved and training costs dropped.',
        fx: { cash: -15000, maintMul: 0.92, salaryMul: 0.97, rep: { safety: 2, reliability: 2 }, days: 45 },
      },
      {
        id: 'opportunistic_fleet',
        label: 'Stay opportunistic and purchase whichever airframe is cheapest',
        detail: 'Maximizes flexibility to acquire bargains on the used market regardless of manufacturer.',
        outcome: 'Opportunistic fleet acquisition retained. Airline stands ready to snap up market bargains.',
        fx: { usedPrice: 0.94, days: 30 },
      },
    ],
    { weight: 3, minDay: 9 },
  ),
]
