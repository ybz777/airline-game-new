import type { GameState } from '../types'
import { getType } from '../data/aircraft'
import { getAirport } from '../data/airports'
import { overallReputation } from './economy'
import { cabinRequired } from './safety'
import { calendar } from './util'

export function warnings(s: GameState): string[] {
  const rows: string[] = []
  if (s.finance.cash < 0) rows.push(`Cash is ${Math.round(s.finance.cash).toLocaleString('en-US')}. Default is close.`)
  else if (s.finance.cash < 400_000) rows.push('Cash is below $400,000.')
  if (s.finance.overdue > 0) rows.push(`${s.finance.overdue} payment cycle${s.finance.overdue === 1 ? '' : 's'} overdue.`)
  for (const loan of s.loans) {
    if (loan.kind === 'bullet' && loan.balance > 1000) {
      const days = loan.maturityDay - s.meta.day
      if (days < 60) rows.push(`${loan.name} matures in ${Math.max(0, days)} days. Balance due ${Math.round(loan.balance).toLocaleString('en-US')}.`)
    }
  }
  for (const fault of s.faults) {
    if (fault.severity === 'critical') rows.push(fault.title)
  }
  if (s.reputation.safety < 15) rows.push('Safety reputation is weak enough to draw an audit.')
  if (!s.fleet.length) rows.push('You have no aircraft.')
  else if (!s.routes.length) rows.push('No routes are filed. The fleet is only burning fixed costs.')
  const tired = s.pilots.filter((p) => p.fatigue > 75)
  if (tired.length) rows.push(`${tired.length} pilot${tired.length === 1 ? '' : 's'} are heavily fatigued. Fatigue raises risk. It does not, by itself, cause an accident.`)
  const need = cabinRequired(s)
  if (need > 0 && (s.cabinCrew ?? 0) < need) rows.push('Cabin crew is below the minimum for the schedule.')
  for (const ac of s.fleet) {
    if (ac.status !== 'lost' && (ac.neglect ?? 0) >= 36) {
      const type = getType(ac.typeId)
      rows.push(`${ac.tailNumber} · ${type.manufacturer} ${type.model} has a long record of deferred maintenance.`)
    }
  }
  if ((s.meta.investigationUntil ?? 0) > s.meta.day) rows.push('A government investigation is open.')
  return rows
}

export function debtBalance(s: GameState): number {
  return s.loans.reduce((a, l) => a + l.balance, 0)
}

export function stageLabel(s: GameState): string {
  const n = s.fleet.filter((a) => a.status !== 'lost').length
  const countries = new Set(s.routes.flatMap((r) => [getAirport(r.origin).country, getAirport(r.dest).country]))
  if (n === 0) return 'No fleet'
  if (n === 1) return 'One aircraft'
  if (n < 5) return 'Small operator'
  if (countries.size > 1 && n >= 8) return 'International airline'
  if (n >= 20) return 'Major airline'
  if (n >= 10) return 'National airline'
  if (s.routes.length >= 6) return 'Regional airline'
  return 'Growing carrier'
}

export function reputationHeadline(s: GameState): number {
  return s.reputation.brand
}

export function fleetSeats(s: GameState): number {
  return s.fleet.filter((a) => a.status !== 'lost' && a.status !== 'stored').reduce((sum, a) => sum + getType(a.typeId).seatCapacity, 0)
}

export { overallReputation, calendar }
