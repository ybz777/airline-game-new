import { useState } from 'react'
import { allMeals, mealById } from '../data/meals'
import type { CustomMeal, GameState } from '../types'
import { actions } from '../state/store'
import { money } from '../sim/util'
import { getType } from '../data/aircraft'
import { Panel, Photo } from './widgets'

function satLabel(n: number): string {
  if (n >= 0.06) return 'Strong satisfaction'
  if (n >= 0.04) return 'Noticeable satisfaction'
  if (n >= 0.02) return 'Mild satisfaction'
  if (n > 0) return 'A small lift'
  return 'No satisfaction lift'
}

export function Meals({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const meals = allMeals(state.meals)
  const [name, setName] = useState('')
  const [tier, setTier] = useState<CustomMeal['tier']>('meal')
  const [note, setNote] = useState('')
  return (
    <div className="stack">
      <Panel title="Onboard meals">
        <p className="lede">Pick what goes on the tray. Economy and the business cabin can be different, and each route keeps its own pair.</p>
        <div className="meal-grid">
          {meals.filter((meal) => meal.id !== 'meal-none').map((meal) => (
            <article key={meal.id} className="meal-card">
              {meal.image && <Photo src={meal.image} alt={meal.name} />}
              <b>{meal.name}</b>
              <span>{money(meal.cost)} per passenger · {satLabel(meal.satisfaction)}</span>
              <p>{meal.blurb}</p>
            </article>
          ))}
        </div>
      </Panel>
      <div className="split">
        <Panel title="Custom meal">
          <div className="form-grid">
            <label>Name<input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
            <label>Based on
              <select value={tier} onChange={(e) => setTier(e.target.value as CustomMeal['tier'])}>
                <option value="snack">Snack</option>
                <option value="meal">Full meal</option>
                <option value="premium">Premium meal</option>
                <option value="cabin">Business / first</option>
              </select>
            </label>
            <label>Note<input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="What the kitchen actually plates" /></label>
          </div>
          <p className="fine">A custom meal costs a little more than the tier it is based on. Assign it to a route after you save it.</p>
          <button type="button" className="btn primary" onClick={() => onError(actions.createMeal({ name, tier, note }) || '')}>Save meal</button>
        </Panel>
        <Panel title="By route and cabin">
          {state.routes.length === 0 && <p className="empty">File a route before a meal can be assigned.</p>}
          {state.routes.map((route) => {
            const plane = state.fleet.find((aircraft) => aircraft.id === route.aircraftId)
            const type = plane ? getType(plane.typeId) : null
            const economy = mealById(route.economyMealId, state.meals)
            const cabin = mealById(route.cabinMealId, state.meals)
            return (
              <article key={route.id} className="route-row meal-assign">
                <div>
                  <b>{route.via ? `${route.origin} → ${route.via} → ${route.dest}` : `${route.origin} → ${route.dest}`}</b>
                  <span>{plane ? `${plane.tailNumber} · ${type?.model}` : 'Unassigned'} · {route.cabinLayout === 'two-class' ? 'Two class' : 'All economy'}</span>
                </div>
                <label>Economy
                  <select value={economy.id} onChange={(e) => actions.assignMeal(route.id, 'economy', e.target.value)}>
                    {meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name} · {money(meal.cost)}</option>)}
                  </select>
                </label>
                {route.cabinLayout === 'two-class' && (
                  <label>Business / first
                    <select value={cabin.id} onChange={(e) => actions.assignMeal(route.id, 'cabin', e.target.value)}>
                      {meals.filter((meal) => meal.tier === 'cabin' || meal.tier === 'premium' || meal.tier === 'custom').map((meal) => (
                        <option key={meal.id} value={meal.id}>{meal.name} · {money(meal.cost)}</option>
                      ))}
                    </select>
                  </label>
                )}
              </article>
            )
          })}
        </Panel>
      </div>
    </div>
  )
}
