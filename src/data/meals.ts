import type { CustomMeal, ServiceLevel } from '../types'

export type MealTier = 'none' | 'snack' | 'meal' | 'premium' | 'cabin' | 'custom'

export interface MealCard {
  id: string
  name: string
  tier: MealTier
  cost: number
  /** Small reputation nudge per flown leg. The existing service check still applies. */
  satisfaction: number
  service: ServiceLevel
  image: string
  blurb: string
}

export const MEALS: MealCard[] = [
  {
    id: 'meal-none',
    name: 'No service',
    tier: 'none',
    cost: 0,
    satisfaction: 0,
    service: 'none',
    image: '',
    blurb: 'Nothing but water. Fine on a short hop. Passengers on a longer flight will say so.',
  },
  {
    id: 'meal-snack',
    name: 'Snack',
    tier: 'snack',
    cost: 3.5,
    satisfaction: 0.01,
    service: 'snack',
    image: '/assets/meals/snack.jpg',
    blurb: 'A pretzels-and-a-drink service. Cheap, and enough for flights under a couple of hours.',
  },
  {
    id: 'meal-full',
    name: 'Full meal',
    tier: 'meal',
    cost: 11.5,
    satisfaction: 0.03,
    service: 'meal',
    image: '/assets/meals/meal.jpg',
    blurb: 'A hot tray. This is what passengers expect once the stage gets long.',
  },
  {
    id: 'meal-premium',
    name: 'Premium meal',
    tier: 'premium',
    cost: 26,
    satisfaction: 0.05,
    service: 'premium',
    image: '/assets/meals/premium.jpg',
    blurb: 'A plated meal with a proper napkin. It costs real money and passengers notice.',
  },
  {
    id: 'meal-cabin',
    name: 'Business and first',
    tier: 'cabin',
    cost: 42,
    satisfaction: 0.06,
    service: 'premium',
    image: '/assets/meals/cabin.jpg',
    blurb: 'The cabin-class tray. It only goes to business seats on a two-class airplane.',
  },
]

const TIER_SERVICE: Record<CustomMeal['tier'], ServiceLevel> = {
  snack: 'snack',
  meal: 'meal',
  premium: 'premium',
  cabin: 'premium',
}

const TIER_COST: Record<CustomMeal['tier'], number> = {
  snack: 5,
  meal: 13,
  premium: 28,
  cabin: 44,
}

const TIER_SAT: Record<CustomMeal['tier'], number> = {
  snack: 0.02,
  meal: 0.035,
  premium: 0.055,
  cabin: 0.065,
}

export function customCard(meal: CustomMeal): MealCard {
  return {
    id: meal.id,
    name: meal.name,
    tier: 'custom',
    cost: TIER_COST[meal.tier],
    satisfaction: TIER_SAT[meal.tier],
    service: TIER_SERVICE[meal.tier],
    image: '/assets/meals/custom.jpg',
    blurb: meal.note || `A custom ${meal.tier} service. The kitchen cost follows that tier.`,
  }
}

export function allMeals(custom: CustomMeal[] | undefined): MealCard[] {
  return [...MEALS, ...(custom ?? []).map(customCard)]
}

export function mealById(id: string, custom: CustomMeal[] | undefined): MealCard {
  return allMeals(custom).find((meal) => meal.id === id) ?? MEALS[1]
}

export function mealIdForService(service: ServiceLevel): string {
  if (service === 'none') return 'meal-none'
  if (service === 'meal') return 'meal-full'
  if (service === 'premium') return 'meal-premium'
  return 'meal-snack'
}

export function cateringCost(economyId: string, cabinId: string, econPax: number, bizPax: number, custom: CustomMeal[] | undefined, fallback: ServiceLevel, sold: number): number {
  if (!economyId) {
    const rate = { none: 0, snack: 3.5, meal: 11.5, premium: 26 }
    return sold * rate[fallback]
  }
  const economy = mealById(economyId, custom)
  const cabin = mealById(cabinId || 'meal-cabin', custom)
  return econPax * economy.cost + bizPax * cabin.cost
}
