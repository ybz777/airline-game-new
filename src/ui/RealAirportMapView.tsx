import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { getAirport } from '../data/airports'
import { getAirportMapLayout, type AirportMapGate } from '../data/airportMap'
import { gateBoard, standCompatibleAircraft, standGateSize, type GateRow } from '../sim/gates'
import type { GameState } from '../types'
import { money } from '../sim/util'
import { actions } from '../state/store'

const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'

export type OperationalGateStatus =
  | 'AVAILABLE'
  | 'RENTED'
  | 'OWNED'
  | 'ASSIGNED'
  | 'BOARDING'
  | 'OCCUPIED'
  | 'CLOSED'
  | 'MAINTENANCE'

export interface AirportMapViewProps {
  airportId: string
  state: GameState
  onError: (msg: string) => void
  onAssignFlight?: (gateId: string) => void
}

const STATUS_COLORS: Record<OperationalGateStatus, { fill: string; stroke: string; label: string }> = {
  AVAILABLE: { fill: '#3b82f6', stroke: '#93c5fd', label: 'Available' },
  RENTED: { fill: '#f59e0b', stroke: '#fde68a', label: 'Rented (Leased)' },
  OWNED: { fill: '#10b981', stroke: '#a7f3d0', label: 'Owned' },
  ASSIGNED: { fill: '#8b5cf6', stroke: '#ddd6fe', label: 'Assigned' },
  BOARDING: { fill: '#ec4899', stroke: '#fbcfe8', label: 'Boarding' },
  OCCUPIED: { fill: '#ef4444', stroke: '#fca5a5', label: 'Occupied' },
  CLOSED: { fill: '#64748b', stroke: '#94a3b8', label: 'Closed / Other' },
  MAINTENANCE: { fill: '#d97706', stroke: '#fed7aa', label: 'Maintenance' },
}

function createGateDotIcon(status: OperationalGateStatus, label: string, isSelected: boolean) {
  const cfg = STATUS_COLORS[status]
  const glow = isSelected ? 'box-shadow: 0 0 0 3px #fff, 0 0 10px rgba(255,255,255,0.9);' : ''
  const pulseClass = status === 'OCCUPIED' || status === 'BOARDING' ? 'pulse-busy' : ''

  return L.divIcon({
    className: 'custom-gate-dot-pin',
    html: `
      <div class="gate-marker-container ${pulseClass}" style="position:relative; cursor:pointer;">
        <span class="gate-marker-dot" style="
          display:block;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${cfg.fill};
          border: 2px solid ${cfg.stroke};
          ${glow}
          transition: transform 0.15s ease;
        "></span>
        <span class="gate-marker-badge" style="
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'IBM Plex Sans Condensed', -apple-system, sans-serif;
          font-weight: 700;
          font-size: 10px;
          line-height: 1;
          color: #fff;
          background: rgba(10, 16, 24, 0.92);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 3px;
          padding: 1px 3px;
          white-space: nowrap;
          pointer-events: none;
        ">${label}</span>
      </div>
    `,
    iconSize: [24, 28],
    iconAnchor: [12, 7],
  })
}

export function RealAirportMapView({ airportId, state, onError, onAssignFlight }: AirportMapViewProps) {
  const airport = getAirport(airportId)
  const layout = useMemo(() => getAirportMapLayout(airportId), [airportId])
  const rows = useMemo(() => gateBoard(state, airportId), [state, airportId])
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null)
  const [viewLayer, setViewLayer] = useState<'both' | 'sat' | 'diagram'>('both')

  const rowsMap = useMemo(() => {
    const map = new Map<string, GateRow>()
    for (const r of rows) {
      map.set(r.stand.number, r)
      map.set(r.stand.id, r)
    }
    return map
  }, [rows])

  // Compute operational status for each gate dot
  const getGateOperationalStatus = (_gate: AirportMapGate, row?: GateRow): OperationalGateStatus => {
    if (!row) {
      return 'CLOSED'
    }
    if (row.use === 'other') {
      return 'CLOSED'
    }
    if (row.occupied) {
      const isBoardingSoon = row.flights.some((f) => f.hour.includes('8') || f.hour.includes('9'))
      return isBoardingSoon ? 'BOARDING' : 'OCCUPIED'
    }
    if (row.use === 'owned') {
      return 'OWNED'
    }
    if (row.use === 'leased') {
      return 'RENTED'
    }
    return 'AVAILABLE'
  }

  // Active selected gate row
  const activeGateRow = useMemo(() => {
    if (!selectedGateId) return null
    return rows.find((r) => r.stand.id === selectedGateId || r.stand.number === selectedGateId)
  }, [selectedGateId, rows])

  // Compute map center and zoom level based on physical span
  const zoom = airport.span >= 0.08 ? 15 : airport.span >= 0.04 ? 16 : 17

  // Generate Concourse SVG or Polyline geometry connections for the map
  const concoursePolylines = useMemo(() => {
    if (!layout) return []
    const lines: { id: string; name: string; points: [number, number][] }[] = []
    for (const term of layout.terminals) {
      for (const c of term.concourses) {
        if (c.gates.length >= 2) {
          const sorted = [...c.gates].sort((a, b) => a.globalIndex - b.globalIndex)
          lines.push({
            id: c.id,
            name: c.name,
            points: sorted.map((g) => [g.lat, g.lon]),
          })
        }
      }
    }
    return lines
  }, [layout])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Map Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
            {airport.city} ({airport.id}) &mdash; {layout?.terminals[0]?.name || airport.name}
          </h3>
          <span className="fine" style={{ color: 'var(--muted)' }}>
            ICAO: {airport.icao} &bull; Lat: {airport.lat.toFixed(4)}, Lon: {airport.lon.toFixed(4)} &bull; {layout?.terminals.length || 1} Terminal(s), {layout?.terminals.reduce((acc, t) => acc + t.concourses.length, 0) || 1} Concourse(s)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="fine" style={{ marginRight: 4 }}>Layer:</span>
          <button
            type="button"
            className={`btn tiny ${viewLayer === 'both' ? 'primary' : 'ghost'}`}
            onClick={() => setViewLayer('both')}
          >
            Hybrid (Sat + Diagram)
          </button>
          <button
            type="button"
            className={`btn tiny ${viewLayer === 'sat' ? 'primary' : 'ghost'}`}
            onClick={() => setViewLayer('sat')}
          >
            Satellite
          </button>
          <button
            type="button"
            className={`btn tiny ${viewLayer === 'diagram' ? 'primary' : 'ghost'}`}
            onClick={() => setViewLayer('diagram')}
          >
            Diagram Only
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div style={{ position: 'relative', width: '100%', height: 480, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <MapContainer
          key={`real-gate-map-${airport.id}-${viewLayer}`}
          center={[airport.lat, airport.lon]}
          zoom={zoom}
          className="airport-sat"
          style={{ width: '100%', height: '100%', background: '#090d13' }}
          scrollWheelZoom
          zoomControl
        >
          {viewLayer !== 'diagram' && (
            <TileLayer attribution={SATELLITE_ATTR} url={SATELLITE} maxNativeZoom={19} maxZoom={20} />
          )}

          {/* Terminal / Concourse Geometry Lines connecting gate spines */}
          {(viewLayer === 'both' || viewLayer === 'diagram') &&
            concoursePolylines.map((cLine) => (
              <Polyline
                key={cLine.id}
                positions={cLine.points}
                pathOptions={{
                  color: '#d4a15a',
                  weight: 3.5,
                  opacity: 0.75,
                  dashArray: '2, 4',
                }}
              />
            ))}

          {/* Gate Dots data layer ABOVE airport diagram */}
          {layout?.terminals.flatMap((term) =>
            term.concourses.flatMap((conc) =>
              conc.gates.map((gate) => {
                const row = rowsMap.get(gate.label) || rowsMap.get(`${airport.id}-${gate.label}`)
                const status = getGateOperationalStatus(gate, row)
                const isSelected = selectedGateId === (row?.stand.id || `${airport.id}-${gate.label}`)

                return (
                  <Marker
                    key={`gate-${airport.id}-${gate.label}`}
                    position={[gate.lat, gate.lon]}
                    zIndexOffset={isSelected ? 1000 : status === 'OCCUPIED' ? 600 : 400}
                    icon={createGateDotIcon(status, gate.label, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedGateId(row?.stand.id || `${airport.id}-${gate.label}`)
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                      <div style={{ textAlign: 'center', fontSize: 12 }}>
                        <strong>Gate {gate.label}</strong> ({status})
                        <div style={{ fontSize: 11, color: '#aaa' }}>{conc.name}</div>
                      </div>
                    </Tooltip>
                  </Marker>
                )
              })
            )
          )}
        </MapContainer>

        {/* Legend Overlay on Map */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 900,
            background: 'rgba(14, 20, 28, 0.92)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: 11.5,
            color: 'var(--text)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: val.fill,
                  border: `1.5px solid ${val.stroke}`,
                }}
              />
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {/* Selected Gate Inspection & Interaction Card */}
      {activeGateRow ? (
        <div
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(240px, 1.8fr) auto',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontFamily: 'var(--cond)',
                }}
              >
                GATE {activeGateRow.stand.number}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: STATUS_COLORS[getGateOperationalStatus({ label: activeGateRow.stand.number } as any, activeGateRow)].fill,
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {getGateOperationalStatus({ label: activeGateRow.stand.number } as any, activeGateRow)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              Terminal: <strong>{activeGateRow.stand.terminal}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Size: <strong>{standGateSize(activeGateRow.stand)}</strong> ({standCompatibleAircraft(standGateSize(activeGateRow.stand))})
            </div>
          </div>

          <div>
            {activeGateRow.occupied ? (
              <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--bad)', display: 'block', marginBottom: 2 }}>Currently Occupied Flights:</strong>
                {activeGateRow.flights.map((f, i) => (
                  <div key={i} style={{ color: 'var(--text)' }}>
                    &bull; Flight: <strong>{f.label}</strong> &bull; Tail: <strong>{f.tail}</strong> &bull; Departs: <strong>{f.hour}</strong>
                  </div>
                ))}
              </div>
            ) : activeGateRow.use === 'other' ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Exclusively controlled by another carrier or airport authority. Not currently available for player lease.
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {activeGateRow.use === 'available' ? (
                  <>
                    Available for slot award lease &bull; Daily cost: <strong>{money(activeGateRow.stand.leaseDaily)}/day</strong> &bull; Buy: <strong>{money(activeGateRow.stand.ownPrice)}</strong>
                  </>
                ) : (
                  <>
                    Held by your airline ({activeGateRow.use.toUpperCase()}) &bull; Ready for scheduled turns &bull; No active departures blocking the gate.
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {activeGateRow.use === 'available' && (
              <>
                <button
                  type="button"
                  className="btn primary tiny"
                  onClick={() => onError(actions.lease(activeGateRow.stand.id, 'leased') || '')}
                >
                  RENT / LEASE
                </button>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => onError(actions.lease(activeGateRow.stand.id, 'owned') || '')}
                >
                  BUY
                </button>
              </>
            )}

            {(activeGateRow.use === 'leased' || activeGateRow.use === 'owned') && (
              <>
                {onAssignFlight && (
                  <button
                    type="button"
                    className="btn primary tiny"
                    onClick={() => onAssignFlight(activeGateRow.stand.id)}
                  >
                    ASSIGN FLIGHT
                  </button>
                )}
                {!activeGateRow.occupied && (
                  <button
                    type="button"
                    className="btn danger tiny"
                    onClick={() => onError(actions.releaseGate(activeGateRow.stand.id) || '')}
                  >
                    RELEASE GATE
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              className="btn ghost tiny"
              onClick={() => setSelectedGateId(null)}
            >
              CLOSE
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
          Click any individual gate dot &bull; on the map above to view terminal concourse details, aircraft size compatibility, and assign flights or lease gates.
        </div>
      )}
    </div>
  )
}
