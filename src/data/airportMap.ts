import rawAirportMapData from './airportMapData.json'

export interface AirportMapGate {
  gateId: string
  label: string
  terminal: string
  concourse: string
  side: 'north' | 'south' | 'east' | 'west' | 'apron' | 'both'
  x: number // normalized 0..1000
  y: number // normalized 0..700
  lat: number // real physical coordinate
  lon: number // real physical coordinate
  size: 'Small' | 'Medium' | 'Heavy' | 'Super'
  bridgeType: 'jetbridge' | 'walkup' | 'stairs'
  globalIndex: number
}

export interface AirportMapConcourse {
  id: string
  name: string
  gates: AirportMapGate[]
}

export interface AirportMapTerminal {
  id: string
  name: string
  layoutType: string
  concourses: AirportMapConcourse[]
}

export interface AirportMapLayout {
  airportId: string
  icao: string
  name: string
  city: string
  country: string
  theater: string
  size: string
  centerLat: number
  centerLon: number
  terminals: AirportMapTerminal[]
}

export const AIRPORT_MAP_DATA: Record<string, AirportMapLayout> = rawAirportMapData as unknown as Record<string, AirportMapLayout>

export function getAirportMapLayout(airportId: string): AirportMapLayout | undefined {
  return AIRPORT_MAP_DATA[airportId]
}

export function getAllAirportGates(airportId: string): AirportMapGate[] {
  const layout = AIRPORT_MAP_DATA[airportId]
  if (!layout) return []
  const gates: AirportMapGate[] = []
  for (const term of layout.terminals) {
    for (const c of term.concourses) {
      gates.push(...c.gates)
    }
  }
  return gates
}
