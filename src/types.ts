export type Strategy = 'ulcc' | 'lcc' | 'regional' | 'full' | 'premium'
export type ServiceLevel = 'none' | 'snack' | 'meal' | 'premium'
export type Frequency = 'daily' | 'weekdays' | '3weekly'
export type CabinLayout = 'economy' | 'two-class'
export type ViewId =
  | 'overview'
  | 'map'
  | 'fleet'
  | 'market'
  | 'routes'
  | 'meals'
  | 'airports'
  | 'gates'
  | 'safetyLog'
  | 'finance'
  | 'crew'
  | 'rivals'
  | 'news'
export type AircraftStatus = 'idle' | 'maintenance' | 'grounded' | 'stored' | 'lost'
export type CreditRating = 'Poor' | 'Fair' | 'Good' | 'Strong'
export type ConditionKey =
  | 'airframe'
  | 'engine1'
  | 'engine2'
  | 'avionics'
  | 'landingGear'
  | 'cabin'
  | 'interior'

export interface Condition {
  airframe: number
  engine1: number
  engine2: number
  avionics: number
  landingGear: number
  cabin: number
  interior: number
}

export interface HistoryEntry {
  year: number
  text: string
}

export type AircraftCategory = 'turboprop' | 'regional' | 'narrowbody' | 'widebody'
export type AircraftEra = 'classic' | 'aging' | 'mature' | 'modern' | 'current'

export interface AircraftServiceLog {
  day: number
  dateLabel: string
  kind: 'delivery' | 'repair' | 'check' | 'incident' | 'accident' | 'delay' | 'inspection'
  title: string
  detail: string
  cost?: number
  accidentRecordId?: string
}

export type FuselageType = 'single-aisle' | 'twin-aisle' | 'double-deck-twin-aisle'
export type GateSize = 'Small' | 'Medium' | 'Heavy' | 'Super'
export type IcaoCodeCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface AircraftType {
  id: string
  manufacturer: string
  model: string
  variant: string
  family: string
  category: AircraftCategory
  era: AircraftEra
  productionYear: number
  productionStart: number
  productionEnd: number | null
  firstFlightYear: number
  seatCapacity: number
  maxSeatCapacity: number
  cargoTons: number
  rangeNm: number
  publishedRangeNm: number
  practicalRangeNm: number
  mtowLbs: number
  cruiseSpeedKt: number
  fuelCapacityGal: number
  fuelBurnGph: number
  fuelIndex: number
  purchasePrice: number
  leaseMonthly: number
  maintenancePerFlight: number
  checkCost: number
  costPerBlockHour: number
  reliability: number
  passengerAppeal: number
  noise: number
  crewPayMonthly: number
  engines: number
  engineType: string
  fuselageType: FuselageType
  seatingLayout: string
  icaoCode: string
  icaoCategory: IcaoCodeCategory
  gateSizeRequired: GateSize
  minRunwayFt: number
  typicalAskAge: number
  illustrated: boolean
  visual: string
}

export interface OwnedAircraft {
  id: string
  tailNumber: string
  typeId: string
  yearBuilt: number
  ownership: 'owned' | 'leased'
  acquiredPrice: number
  leaseMonthly: number
  leaseMonthsLeft: number
  condition: Condition
  flightHours: number
  cycles: number
  status: AircraftStatus
  location: string
  history: HistoryEntry[]
  maintenanceDaysLeft: number
  holdToday: boolean
  ignoredFault: boolean
  /** Deferred-maintenance exposure, 0–100. It fades slowly and raises risk. It does not schedule an accident. */
  neglect: number
  totalRevenue: number
  cabinLayout: CabinLayout
  maintenance?: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  tailStrike?: boolean
  color?: string
  purchaseDay?: number
  purchaseDateLabel?: string
  previousOperator?: string
  flightsCompleted?: number
  delaysCount?: number
  repairsCount?: number
  serviceLog?: AircraftServiceLog[]
}

export interface Listing {
  id: string
  typeId: string
  yearBuilt: number
  price: number
  leaseMonthly: number
  cycles: number
  flightHours: number
  condition: Condition
  history: HistoryEntry[]
  tailNumber: string
  parkedAt: string
  daysListed: number
  forced: boolean
  /** Market photograph only. Owned aircraft do not use this. */
  photo?: string
  maintenance?: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  operators?: number
  /** A repaired tail strike. It is not, by itself, a reason the aircraft cannot fly. */
  tailStrike?: boolean
}

export interface Route {
  id: string
  origin: string
  dest: string
  aircraftId: string
  price: number
  frequency: Frequency
  service: ServiceLevel
  baggageFee: number
  cabinLayout: CabinLayout
  openedDay: number
  /** Intermediate airport. Empty means nonstop. */
  via: string
  /** Which way the one-stop airplane is currently pointed. */
  bound: 'out' | 'back'
  /** Local departure hour, 0–23. One figure for the whole route, not a minute-by-minute plan. */
  departHour: number
  economyMealId: string
  cabinMealId: string
  gateOrigin: string
  gateDest: string
  gateVia: string
}

export interface GateHold {
  id: string
  airportId: string
  kind: 'owned' | 'leased'
  /** Daily lease, or the smaller daily upkeep if the gate is owned. */
  daily: number
}

export interface CustomMeal {
  id: string
  name: string
  tier: 'snack' | 'meal' | 'premium' | 'cabin'
  note: string
}

export interface Pilot {
  id: string
  name: string
  /** Flight hours. The sim reads this field. */
  hours: number
  /** Monthly pay. Annual salary on the crew card is this times twelve. */
  salaryMonthly: number
  fatigue: number
  /** Skill, 0–100. The sim reads this field. */
  training: number
  reliability: number
  typeId: string
  hiredDay: number
  rested: boolean
  gender: 'Female' | 'Male'
  age: number
  /** Stable key into the fictional portrait roster. Never derived from the picture. */
  portraitId: string
  morale: number
  certifications: string[]
}

export interface Loan {
  id: string
  name: string
  principal: number
  balance: number
  rate: number
  months: number
  monthsLeft: number
  payment: number
  kind: 'amortizing' | 'bullet'
  openedDay: number
  maturityDay: number
}

export interface RivalRoute {
  origin: string
  dest: string
  typeId: string
  dailySeats: number
  price: number
  service: ServiceLevel
  frequency: Frequency
}

export interface Rival {
  id: string
  name: string
  iata: string
  strategy: Strategy
  cash: number
  debt: number
  reputation: number
  home: string
  color: string
  fleet: { typeId: string; count: number }[]
  routes: RivalRoute[]
  alive: boolean
}

export interface Reputation {
  satisfaction: number
  reliability: number
  safety: number
  service: number
  price: number
  trust: number
  brand: number
}

export interface NewsItem {
  id: string
  day: number
  headline: string
  body: string
  image: string
  tag: string
}

export interface Fault {
  id: string
  aircraftId: string
  system: ConditionKey
  severity: 'watch' | 'serious' | 'critical'
  title: string
  detail: string
  repairCost: number
  groundDays: number
  day: number
}

export interface Choice {
  id: string
  label: string
  detail: string
}

export interface PendingEvent {
  defId: string
  day: number
  title: string
  body: string
  image: string
  choices: Choice[]
}

export interface MergerOffer {
  rivalId: string
  ask: number
  day: number
}

export interface FaultPrompt {
  faultId: string
}

export interface FlightResult {
  id: string
  flightNo: string
  origin: string
  dest: string
  aircraftId: string
  typeId: string
  tail: string
  pax: number
  seats: number
  revenue: number
  cost: number
  profit: number
  delayMin: number
  status: 'arrived' | 'delayed' | 'cancelled' | 'diverted' | 'incident'
  note: string
  blockHours: number
  departFrac: number
}

export interface DayReport {
  day: number
  dateLabel: string
  flights: FlightResult[]
  revenue: number
  expenses: number
  profit: number
  pax: number
  breakdown: Record<string, number>
  headlines: string[]
}

export interface Modifier {
  id: string
  label: string
  untilDay: number
  fuelMul?: number
  demandMul?: number
  maintMul?: number
  salaryMul?: number
  feeMul?: number
  cargoMul?: number
  oldFeeAdd?: number
}

export interface WeatherCell {
  zone: string
  untilDay: number
  severity: number
  label: string
}

export interface MarketState {
  fuelIndex: number
  demandIndex: number
  economyIndex: number
  usedPriceIndex: number
  interestBump: number
  hedgeUntilDay: number
  hedgeIndex: number
  groundedFamilies: { family: string; untilDay: number; reason: string }[]
  closedAirports: { id: string; untilDay: number; reason: string }[]
  salaryIndex: number
  cargoIndex: number
  weather: WeatherCell[]
  partsMul: number
  slotBonus: Record<string, number>
}

export interface Airline {
  name: string
  iata: string
  home: string
  strategy: Strategy
  /** Airline color. Owned aircraft and map marks use this. */
  color: string
}

export interface Finance {
  cash: number
  credit: CreditRating
  overdue: number
  lifetimeRevenue: number
  lifetimeExpenses: number
}

export interface GameMeta {
  created: boolean
  day: number
  rng: number
  speed: 0 | 1 | 3
  gameOver: boolean
  gameOverReason: string
  gameOverImage: string
  flightSeq: number
  nextId: number
  criticalDispatches: number
  campaignDay: number
  profitShare: number
  profitShareUntil: number
  seen: string[]
  accidents: number
  /** 1 is a normal premium. Rises after a serious accident and fades over years. */
  insuranceLoad: number
  /** Government investigation stays open until this day. */
  investigationUntil: number
  view: ViewId
  showBriefing: boolean
}

export interface Snapshot {
  day: number
  cash: number
  profit: number
  pax: number
  fuel: number
}

export type AccidentSeverity = 'INCIDENT' | 'MINOR ACCIDENT' | 'SERIOUS ACCIDENT' | 'FATAL ACCIDENT'

export interface AccidentRecord {
  id: string
  day: number
  dateLabel: string
  flightNo: string
  tailNumber: string
  aircraftId: string
  typeId: string
  aircraftModel: string
  operator: string
  origin: string
  dest: string
  location: string
  eventType: string
  severity: AccidentSeverity
  fatalities: number
  injuries: number
  paxAffected: number
  aircraftDamage: string
  cause: string
  investigationStatus: string
  financialLoss: number
  aircraftDisposition: string
  reputationImpact: string
}

export interface GameState {
  meta: GameMeta
  airline: Airline
  finance: Finance
  reputation: Reputation
  fleet: OwnedAircraft[]
  routes: Route[]
  gates: GateHold[]
  accidentLog: AccidentRecord[]
  meals: CustomMeal[]
  pilots: Pilot[]
  /** Cabin crew on the payroll. One set is the legal minimum for an aircraft; a second set is a reserve. */
  cabinCrew: number
  loans: Loan[]
  rivals: Rival[]
  listings: Listing[]
  news: NewsItem[]
  faults: Fault[]
  pending: PendingEvent | null
  eventQueue: PendingEvent[]
  merger: MergerOffer | null
  faultPrompt: FaultPrompt | null
  reports: DayReport[]
  history: Snapshot[]
  market: MarketState
  modifiers: Modifier[]
  lastReport: DayReport | null
  inspectId: string | null
  inspectKind: 'fleet' | 'market' | null
}

export interface LegPlan {
  origin: string
  dest: string
  ferry: boolean
  departFrac: number
}

export interface Forecast {
  ok: boolean
  reason: string
  distanceNm: number
  blockHours: number
  roundTrip: boolean
  legs: number
  seats: number
  businessSeats: number
  economySeats: number
  paxPerLeg: number
  loadFactor: number
  revenue: number
  fuel: number
  airportFees: number
  maintenance: number
  catering: number
  baggage: number
  cargo: number
  contribution: number
  competitorPrice: number | null
  competitorName: string | null
  marketDemand: number
  notes: string[]
}

export interface Quote {
  ok: boolean
  reason: string
  price: number
  closing: number
  cashDue: number
  leaseMonthly: number
  deposit: number
  financed: number
  payment: number
  rate: number
}
