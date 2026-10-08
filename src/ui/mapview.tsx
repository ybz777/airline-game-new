import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getType } from '../data/aircraft'
import { AIRPORTS, getAirport, type Airport } from '../data/airports'
import { arc, interpolate } from '../sim/geo'
import type { FlightResult, GameState, OwnedAircraft } from '../types'
import { money } from '../sim/util'
import { gateBoard } from '../sim/gates'
import { aircraftIcon, airportIcon } from './mapIcons'

const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'

function MapZoom({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMap()
  const report = useRef(onZoom)
  report.current = onZoom
  useEffect(() => {
    const send = () => report.current(map.getZoom())
    send()
    map.on('zoomend', send)
    return () => { map.off('zoomend', send) }
  }, [map])
  return null
}

function legProgress(f: FlightResult, t: number): number {
  if (f.status === 'incident') return 0
  const dur = Math.max(0.14, Math.min(0.45, f.blockHours / 12))
  const p = (t - f.departFrac) / dur
  return p <= 0 ? 0 : Math.min(1, p)
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function routeHeading(f: FlightResult, t: number): number {
  const p = Math.min(0.96, Math.max(0.02, legProgress(f, t)))
  const a = getAirport(f.origin)
  const b = getAirport(f.dest)
  const [lat0, lon0] = interpolate(a, b, p)
  const [lat1, lon1] = interpolate(a, b, Math.min(1, p + 0.035))
  return bearing(lat0, lon0, lat1, lon1)
}

function networkAirportIds(routes: GameState['routes']): string[] {
  const ids = new Set<string>()
  for (const route of routes) {
    ids.add(route.origin)
    ids.add(route.dest)
    if (route.via) ids.add(route.via)
  }
  return [...ids]
}

/** Frames a mode once, then leaves zoom and center where the user put them. */
function Viewport({ mode, networkIds, home }: { mode: 'network' | 'world'; networkIds: string[]; home: string }) {
  const map = useMap()
  const saved = useRef<Partial<Record<'network' | 'world', { lat: number; lng: number; zoom: number }>>>({})
  const framed = useRef<{ network: boolean; world: boolean }>({ network: false, world: false })
  const programmatic = useRef(false)
  const idsRef = useRef(networkIds)
  idsRef.current = networkIds

  useEffect(() => {
    const remember = () => {
      if (programmatic.current) return
      const center = map.getCenter()
      saved.current[mode] = { lat: center.lat, lng: center.lng, zoom: map.getZoom() }
      framed.current[mode] = true
    }
    map.on('zoomend', remember)
    map.on('moveend', remember)
    return () => {
      map.off('zoomend', remember)
      map.off('moveend', remember)
    }
  }, [map, mode])

  useEffect(() => {
    const keep = saved.current[mode]
    if (framed.current[mode] && keep) {
      programmatic.current = true
      map.setView([keep.lat, keep.lng], keep.zoom, { animate: false })
      programmatic.current = false
      return
    }
    programmatic.current = true
    if (mode === 'world') {
      map.fitBounds(L.latLngBounds(AIRPORTS.map((p) => [p.lat, p.lon] as [number, number])), { padding: [28, 28], maxZoom: 3, animate: false })
    } else {
      const ids = idsRef.current
      if (ids.length >= 2) {
        map.fitBounds(L.latLngBounds(ids.map((id) => {
          const p = getAirport(id)
          return [p.lat, p.lon] as [number, number]
        })), { padding: [28, 28], maxZoom: 8, animate: false })
      } else if (ids.length === 1) {
        const p = getAirport(ids[0])
        map.setView([p.lat, p.lon], 6, { animate: false })
      } else {
        const p = getAirport(home)
        map.setView([p.lat, p.lon], 5, { animate: false })
      }
    }
    const center = map.getCenter()
    saved.current[mode] = { lat: center.lat, lng: center.lng, zoom: map.getZoom() }
    framed.current[mode] = true
    programmatic.current = false
  }, [map, mode, home])

  return null
}

function gateIcon(use: 'owned' | 'leased' | 'available' | 'other', occupied: boolean, label: string) {
  const color = use === 'owned' ? '#c9843d' : use === 'leased' ? '#e6d3ad' : use === 'available' ? '#8aa0b4' : '#7a4548'
  return L.divIcon({
    className: 'gate-pin',
    html: `<span class="gate-dot${occupied ? ' busy' : ''}" style="background:${color}" title="${label}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

export function TerminalMap({ airportId, state }: { airportId: string; state: GameState }) {
  const airport = getAirport(airportId)
  const zoom = airport.span >= 0.08 ? 16 : 17
  const rows = gateBoard(state, airportId)
  return (
    <MapContainer key={`term-${airport.id}`} center={[airport.lat, airport.lon]} zoom={zoom} className="airport-sat" scrollWheelZoom zoomControl>
      <TileLayer attribution={SATELLITE_ATTR} url={SATELLITE} />
      {rows.map((row) => (
        <Marker key={row.stand.id} position={[row.stand.lat, row.stand.lon]} zIndexOffset={row.use === 'other' ? 100 : 300} icon={gateIcon(row.use, row.occupied, row.stand.number)}>
          <Popup>
            <strong>{row.stand.terminal} · {row.stand.number}</strong>
            <div>{row.use === 'other' ? 'Another airline' : row.use}{row.occupied ? ' · occupied' : ''}</div>
            {row.flights.map((flight) => <div key={flight.label}>{flight.tail} · {flight.label} · {flight.hour}</div>)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export function AirportSatMap({ airport, zoom, planes, color }: { airport: Airport; zoom: number; planes: OwnedAircraft[]; color: string }) {
  return (
    <MapContainer key={`${airport.id}-${zoom}`} center={[airport.lat, airport.lon]} zoom={zoom} className="airport-sat" scrollWheelZoom zoomControl>
      <TileLayer attribution={SATELLITE_ATTR} url={SATELLITE} />
      <Marker position={[airport.lat, airport.lon]} icon={airportIcon(airport.id, true, zoom)} zIndexOffset={200}>
        <Popup>
          <strong>{airport.id} / {airport.icao}</strong>
          <div>{airport.name}</div>
        </Popup>
      </Marker>
      {planes.map((ac, i) => {
        const type = getType(ac.typeId)
        return (
          <Marker key={ac.id} position={[airport.lat, airport.lon]} zIndexOffset={400 + i} icon={aircraftIcon(type, { color, zoom, heading: -28, label: ac.tailNumber, parked: true, slot: i })}>
            <Popup>
              <strong>{ac.tailNumber}</strong>
              <div>{type.manufacturer} {type.model}</div>
              <div>{ac.status}</div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

export function OpsMap({ state }: { state: GameState }) {
  const [mode, setMode] = useState<'network' | 'world'>('network')
  const [zoom, setZoom] = useState(3)
  const [t, setT] = useState(1)
  const day = state.lastReport?.day
  useEffect(() => {
    if (day === undefined) return
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      const p = Math.min(1, (now - start) / 9000)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(loop)
    }
    setT(0)
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [day])

  const networkIds = useMemo(() => networkAirportIds(state.routes), [state.routes])
  const networkSet = useMemo(() => new Set(networkIds), [networkIds])
  const routeAircraft = useMemo(() => new Set(state.routes.map((r) => r.aircraftId)), [state.routes])
  const flights = (state.lastReport?.flights.filter((f) => f.status !== 'cancelled') ?? []).filter((f) => mode === 'world' || (networkSet.has(f.origin) && networkSet.has(f.dest)))
  const airports = mode === 'world' ? AIRPORTS : AIRPORTS.filter((ap) => networkSet.has(ap.id))

  return (
    <div className="map-shell">
    <MapContainer center={[30, -40]} zoom={3} className="map-fill" zoomControl={false} scrollWheelZoom>
      <Viewport mode={mode} networkIds={networkIds} home={state.airline.home} />
      <MapZoom onZoom={setZoom} />
      <TileLayer attribution={SATELLITE_ATTR} url={SATELLITE} />
      {mode === 'world' && state.rivals.filter((r) => r.alive).flatMap((rival) => rival.routes.map((route, i) => (
        <Polyline
          key={`${rival.id}-${i}`}
          positions={arc(getAirport(route.origin), getAirport(route.dest), 20)}
          pathOptions={{ color: rival.color, weight: 1.4, opacity: 0.45, dashArray: '4 6' }}
        />
      )))}
      {state.routes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.via
            ? [...arc(getAirport(route.origin), getAirport(route.via)), ...arc(getAirport(route.via), getAirport(route.dest)).slice(1)]
            : arc(getAirport(route.origin), getAirport(route.dest))}
          pathOptions={{ color: state.airline.color, weight: 2.4, opacity: 0.9 }}
        />
      ))}
      {airports.map((ap) => (
        <Marker key={ap.id} position={[ap.lat, ap.lon]} zIndexOffset={120} icon={airportIcon(ap.id, ap.id === state.airline.home, zoom)}>
          <Popup>
            <strong>{ap.city} · {ap.id}</strong>
            <div>{ap.name}</div>
            <div>{ap.icao} · {ap.theater}</div>
            <div>{ap.size} · slots for you {ap.playerSlots + (state.market.slotBonus[ap.id] ?? 0)}</div>
          </Popup>
        </Marker>
      ))}
      {flights.map((f, index) => {
        const pos = place(f, t)
        const type = getType(f.typeId)
        const progress = legProgress(f, t)
        const parked = progress <= 0.02 || progress >= 0.98
        const slot = parked ? parkedSlot(flights, index, t) : 0
        return (
          <Marker key={f.id} position={pos} zIndexOffset={parked ? 360 : 520} icon={aircraftIcon(type, { color: state.airline.color, zoom, heading: routeHeading(f, t), label: f.flightNo, parked, slot })}>
            <Popup>
              <strong>{f.flightNo}</strong>
              <div>{f.origin} → {f.dest}</div>
              <div>{f.tail} · {type.manufacturer} {type.model}</div>
              <div>{f.pax} / {f.seats} · {f.status.replace('-', ' ')}</div>
              <div>{money(f.profit)} contribution</div>
            </Popup>
          </Marker>
        )
      })}
      {t > 0.98 && state.fleet.filter((a) => a.status !== 'lost' && !flights.some((f) => f.aircraftId === a.id) && (mode === 'world' || (routeAircraft.has(a.id) && networkSet.has(a.location)))).map((ac, index) => {
        const ap = getAirport(ac.location)
        const type = getType(ac.typeId)
        return (
          <Marker key={ac.id} position={[ap.lat, ap.lon]} zIndexOffset={380 + index} icon={aircraftIcon(type, { color: state.airline.color, zoom, heading: 0, label: ac.tailNumber, parked: true, slot: index })}>
            <Popup>
              <strong>{ac.tailNumber}</strong>
              <div>{type.manufacturer} {type.model}</div>
              <div>On the ground at {ap.city}</div>
              <div>{ac.status}</div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
    <div className="map-modes">
      <button type="button" className={mode === 'network' ? 'on' : ''} onClick={() => setMode('network')}>Network</button>
      <button type="button" className={mode === 'world' ? 'on' : ''} onClick={() => setMode('world')}>World</button>
    </div>
    </div>
  )
}

function parkedSlot(flights: FlightResult[], index: number, t: number): number {
  const here = legProgress(flights[index], t) >= 0.98 ? flights[index].dest : flights[index].origin
  let slot = 0
  for (let i = 0; i < index; i++) {
    const progress = legProgress(flights[i], t)
    if (progress > 0.02 && progress < 0.98) continue
    const id = progress >= 0.98 ? flights[i].dest : flights[i].origin
    if (id === here) slot += 1
  }
  return slot
}

function place(f: FlightResult, t: number): [number, number] {
  const a = getAirport(f.origin)
  const b = getAirport(f.dest)
  if (f.status === 'incident') return [a.lat, a.lon]
  const p = legProgress(f, t)
  if (p <= 0) return [a.lat, a.lon]
  return interpolate(a, b, p)
}
