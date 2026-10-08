import { useMemo, useState } from 'react'
import { AIRPORTS, getAirport } from '../data/airports'
import {
  gateBoard,
  hourCapacity,
  standCompatibleAircraft,
  standGateSize,
  standsFor,
  utilization,
  type Stand,
} from '../sim/gates'
import type { GameState, GateHold, GateSize, Route } from '../types'
import { actions } from '../state/store'
import { money } from '../sim/util'
import { Panel } from './widgets'
import { RealAirportMapView } from './RealAirportMapView'

export type GateTab = 'map' | 'all' | 'available' | 'assigned' | 'rented'

export interface UnifiedGateItem {
  stand: Stand
  airportId: string
  airportCity: string
  airportName: string
  terminal: string
  gateNumber: string
  gateSize: GateSize
  compatibleAircraft: string
  holdKind: 'owned' | 'leased' | null
  pool: 'player' | 'other'
  costDaily: number
  buyPrice: number
  status: 'available' | 'leased' | 'owned' | 'assigned' | 'other'
  utilizationPct: number
  assignedFlights: { label: string; tail: string; hour: string; routeId?: string }[]
  assignedRouteId?: string
  assignedAircraftTail?: string
  assignedAircraftModel?: string
}

export function Gates({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<GateTab>('all')
  const [selectedAirportId, setSelectedAirportId] = useState<string>(state.airline.home)
  const [searchQuery, setSearchQuery] = useState('')
  const [airportFilter, setAirportFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sizeFilter, setSizeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'airport' | 'gate' | 'size' | 'cost' | 'status'>('airport')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedGateIds, setSelectedGateIds] = useState<Set<string>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [assigningGateId, setAssigningGateId] = useState<string | null>(null)

  // Served airports for convenient quick-switching
  const served = useMemo(() => {
    const ids = new Set<string>([state.airline.home])
    for (const route of state.routes) {
      ids.add(route.origin)
      ids.add(route.dest)
      if (route.via) ids.add(route.via)
    }
    return AIRPORTS.filter((airport) => ids.has(airport.id))
  }, [state.airline.home, state.routes])

  // Build centralized flat list of every gate across all airports
  const allGates: UnifiedGateItem[] = useMemo(() => {
    const items: UnifiedGateItem[] = []
    const holdsMap = new Map<string, GateHold>()
    for (const g of state.gates ?? []) {
      holdsMap.set(g.id, g)
    }

    // Map of routes by gate
    const gateToRoutesMap = new Map<string, Route[]>()
    for (const r of state.routes) {
      if (r.gateOrigin) {
        const list = gateToRoutesMap.get(r.gateOrigin) ?? []
        list.push(r)
        gateToRoutesMap.set(r.gateOrigin, list)
      }
      if (r.gateDest) {
        const list = gateToRoutesMap.get(r.gateDest) ?? []
        list.push(r)
        gateToRoutesMap.set(r.gateDest, list)
      }
      if (r.gateVia) {
        const list = gateToRoutesMap.get(r.gateVia) ?? []
        list.push(r)
        gateToRoutesMap.set(r.gateVia, list)
      }
    }

    for (const ap of AIRPORTS) {
      const bonus = state.market.slotBonus[ap.id] ?? 0
      const stands = standsFor(ap, bonus)
      for (const stand of stands) {
        const hold = holdsMap.get(stand.id)
        const routes = gateToRoutesMap.get(stand.id) ?? []
        const isOccupied = routes.length > 0
        const size = standGateSize(stand)
        const compat = standCompatibleAircraft(size)

        let status: UnifiedGateItem['status'] = 'available'
        if (stand.pool === 'other') {
          status = 'other'
        } else if (isOccupied) {
          status = 'assigned'
        } else if (hold?.kind === 'owned') {
          status = 'owned'
        } else if (hold?.kind === 'leased') {
          status = 'leased'
        }

        const flights = routes.map((r) => {
          const plane = state.fleet.find((p) => p.id === r.aircraftId)
          return {
            label: r.via ? `${r.origin}–${r.via}–${r.dest}` : `${r.origin}–${r.dest}`,
            tail: plane?.tailNumber ?? 'Unassigned',
            hour: `${r.departHour ?? 8}:00`,
            routeId: r.id,
          }
        })

        const primaryPlane = routes[0] ? state.fleet.find((p) => p.id === routes[0].aircraftId) : undefined

        items.push({
          stand,
          airportId: ap.id,
          airportCity: ap.city,
          airportName: ap.name,
          terminal: stand.terminal,
          gateNumber: stand.number,
          gateSize: size,
          compatibleAircraft: compat,
          holdKind: hold ? hold.kind : null,
          pool: stand.pool,
          costDaily: hold?.kind === 'owned' ? Math.round(stand.leaseDaily * 0.15) : stand.leaseDaily,
          buyPrice: stand.ownPrice,
          status,
          utilizationPct: Math.round(utilization(state, ap.id, stand.id) * 100),
          assignedFlights: flights,
          assignedRouteId: routes[0]?.id,
          assignedAircraftTail: primaryPlane?.tailNumber,
          assignedAircraftModel: primaryPlane?.typeId,
        })
      }
    }
    return items
  }, [state])

  // Filtered gates
  const filteredGates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allGates.filter((item) => {
      // Tab filter
      if (activeTab === 'available' && item.status !== 'available') return false
      if (activeTab === 'assigned' && item.status !== 'assigned') return false
      if (activeTab === 'rented' && item.status !== 'leased' && item.status !== 'assigned') {
        if (!item.holdKind) return false
      }

      // Airport filter
      if (airportFilter !== 'all' && item.airportId !== airportFilter) return false

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false

      // Size filter
      if (sizeFilter !== 'all' && item.gateSize !== sizeFilter) return false

      // Text query
      if (q) {
        const text = `${item.airportId} ${item.airportCity} ${item.airportName} ${item.gateNumber} Terminal ${item.terminal} ${item.assignedAircraftTail ?? ''} ${item.assignedFlights.map((f) => f.label).join(' ')}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [allGates, activeTab, airportFilter, statusFilter, sizeFilter, searchQuery])

  // Sorted gates
  const sortedGates = useMemo(() => {
    return [...filteredGates].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'airport') {
        cmp = a.airportCity.localeCompare(b.airportCity) || a.gateNumber.localeCompare(b.gateNumber)
      } else if (sortBy === 'gate') {
        cmp = a.gateNumber.localeCompare(b.gateNumber)
      } else if (sortBy === 'size') {
        cmp = a.gateSize.localeCompare(b.gateSize)
      } else if (sortBy === 'cost') {
        cmp = a.costDaily - b.costDaily
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredGates, sortBy, sortDir])

  // Bulk action calculations
  const bulkSelectedItems = useMemo(() => {
    return allGates.filter((g) => selectedGateIds.has(g.stand.id))
  }, [allGates, selectedGateIds])

  const bulkStats = useMemo(() => {
    let cancellableCount = 0
    let recurringCost = 0
    let expectedSavings = 0
    let expectedRefund = 0
    let assignedCount = 0

    for (const g of bulkSelectedItems) {
      if (g.holdKind === 'leased' || g.holdKind === 'owned') {
        cancellableCount += 1
        recurringCost += g.costDaily
        expectedSavings += g.costDaily
        if (g.holdKind === 'owned') {
          expectedRefund += Math.round(g.buyPrice * 0.6)
        }
        if (g.assignedFlights.length > 0) {
          assignedCount += 1
        }
      }
    }
    return { cancellableCount, recurringCost, expectedSavings, expectedRefund, assignedCount }
  }, [bulkSelectedItems])

  // Handlers
  const handleToggleSelect = (gateId: string) => {
    const next = new Set(selectedGateIds)
    if (next.has(gateId)) next.delete(gateId)
    else next.add(gateId)
    setSelectedGateIds(next)
  }

  const handleSelectAllVisible = () => {
    const next = new Set(selectedGateIds)
    for (const g of filteredGates) {
      if (g.holdKind) next.add(g.stand.id)
    }
    setSelectedGateIds(next)
  }

  const handleSelectAllAtAirport = (apId: string) => {
    const next = new Set(selectedGateIds)
    for (const g of allGates) {
      if (g.airportId === apId && g.holdKind) next.add(g.stand.id)
    }
    setSelectedGateIds(next)
  }

  const handleClearSelection = () => {
    setSelectedGateIds(new Set())
  }

  const handleConfirmBulkCancel = () => {
    const idsToCancel = bulkSelectedItems.filter((g) => g.holdKind).map((g) => g.stand.id)
    if (idsToCancel.length > 0) {
      actions.bulkReleaseGates(idsToCancel)
      setSelectedGateIds(new Set())
    }
    setShowBulkModal(false)
  }

  // Summary KPIs for player gate footprint
  const totalHeldCount = (state.gates ?? []).length
  const totalLeasedCount = (state.gates ?? []).filter((g) => g.kind === 'leased').length
  const totalOwnedCount = (state.gates ?? []).filter((g) => g.kind === 'owned').length
  const totalDailyExpenditure = (state.gates ?? []).reduce((sum, g) => sum + g.daily, 0)
  const occupiedHeldGates = allGates.filter((g) => g.holdKind && g.assignedFlights.length > 0).length

  // Current airport for Map View
  const mapAirport = getAirport(selectedAirportId) || AIRPORTS[0]
  const mapRows = gateBoard(state, mapAirport.id)
  const peak = hourCapacity(mapAirport, 8, state.market.slotBonus[mapAirport.id] ?? 0)
  const off = hourCapacity(mapAirport, 12, state.market.slotBonus[mapAirport.id] ?? 0)

  // Candidate routes for assigning to a gate
  const routesForGateAssignment = useMemo(() => {
    if (!assigningGateId) return []
    const apId = assigningGateId.slice(0, assigningGateId.lastIndexOf('-'))
    return state.routes.filter((r) => r.origin === apId || r.dest === apId || r.via === apId)
  }, [state.routes, assigningGateId])

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Centralized Gate Management Header & KPIs */}
      <div className="kpis">
        <div className="kpi">
          <span>Gates Held</span>
          <b>{totalHeldCount}</b>
          <em>{totalOwnedCount} owned · {totalLeasedCount} rented</em>
        </div>
        <div className="kpi">
          <span>Daily Gate Cost</span>
          <b>{money(totalDailyExpenditure)}/day</b>
          <em>{money(totalDailyExpenditure * 30)}/mo recurring</em>
        </div>
        <div className="kpi">
          <span>Gate Utilization</span>
          <b>{totalHeldCount > 0 ? `${Math.round((occupiedHeldGates / totalHeldCount) * 100)}%` : '0%'}</b>
          <em>{occupiedHeldGates} active · {totalHeldCount - occupiedHeldGates} idle</em>
        </div>
        <div className="kpi">
          <span>Airports Served</span>
          <b>{served.length}</b>
          <em>{AIRPORTS.length} total across USA</em>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="tabs" style={{ marginBottom: 4 }}>
        <button
          type="button"
          className={activeTab === 'all' ? 'on' : ''}
          onClick={() => setActiveTab('all')}
        >
          ALL GATES ({allGates.length})
        </button>
        <button
          type="button"
          className={activeTab === 'available' ? 'on' : ''}
          onClick={() => setActiveTab('available')}
        >
          AVAILABLE ({allGates.filter((g) => g.status === 'available').length})
        </button>
        <button
          type="button"
          className={activeTab === 'assigned' ? 'on' : ''}
          onClick={() => setActiveTab('assigned')}
        >
          ASSIGNED ({allGates.filter((g) => g.status === 'assigned').length})
        </button>
        <button
          type="button"
          className={activeTab === 'rented' ? 'on' : ''}
          onClick={() => setActiveTab('rented')}
        >
          RENTED / OWNED ({totalHeldCount})
        </button>
        <button
          type="button"
          className={activeTab === 'map' ? 'on' : ''}
          onClick={() => setActiveTab('map')}
        >
          MAP VIEW
        </button>
      </div>

      {/* MAP VIEW TAB */}
      {activeTab === 'map' && (
        <div className="split wide">
          <div>
            <div className="filter-row">
              <input
                value={searchQuery}
                placeholder="Find airport..."
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="card-list" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {served.map((item) => (
                <button
                  key={item.id}
                  className={`fleet-card ${item.id === mapAirport.id ? 'on' : ''}`}
                  onClick={() => setSelectedAirportId(item.id)}
                >
                  <div>
                    <b>{item.city}</b>
                    <span>{item.id} / {item.icao}</span>
                    <em>{item.size} · {(state.gates ?? []).filter((g) => g.airportId === item.id).length} held</em>
                  </div>
                </button>
              ))}
              {AIRPORTS.filter((a) => !served.some((s) => s.id === a.id) && (!searchQuery || `${a.id} ${a.city} ${a.name}`.toLowerCase().includes(searchQuery.toLowerCase()))).slice(0, 16).map((item) => (
                <button
                  key={item.id}
                  className={`fleet-card ${item.id === mapAirport.id ? 'on' : ''}`}
                  onClick={() => setSelectedAirportId(item.id)}
                >
                  <div>
                    <b>{item.city}</b>
                    <span>{item.id} / {item.icao}</span>
                    <em>{item.size}</em>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Panel title={`${mapAirport.name}`} aside={<span className="fine">{mapAirport.id} / {mapAirport.icao} · {mapAirport.city}</span>}>
            <RealAirportMapView
              airportId={mapAirport.id}
              state={state}
              onError={onError}
              onAssignFlight={(gateId) => setAssigningGateId(gateId)}
            />
            <p className="fine" style={{ marginTop: 10 }}>
              Researched terminal geometry & physical passenger gate positions for {mapAirport.name} ({mapAirport.id} / {mapAirport.icao}).
              Every gate dot corresponds to the actual airport terminal concourse and operational game state.
            </p>
            <p className="lede" style={{ fontSize: 13, margin: '8px 0' }}>
              {mapAirport.city} slot allowance: {mapAirport.playerSlots + (state.market.slotBonus[mapAirport.id] ?? 0)} gate movements. Peak hours support ~{peak} turns; off-peak supports ~{off}.
            </p>
            <div className="gate-list" style={{ maxHeight: 260 }}>
              {mapRows.map((row) => (
                <article key={row.stand.id} className="gate-row">
                  <b>{row.stand.number}</b>
                  <div>
                    <span>Terminal {row.stand.terminal} · {row.use === 'other' ? 'Another airline' : row.use}{row.occupied ? ' · occupied' : ''}</span>
                    <span>{row.use === 'other' ? 'Not for lease' : `${money(row.stand.leaseDaily)}/day lease · ${money(row.stand.ownPrice)} to buy`}</span>
                    {row.flights.length === 0 && row.use !== 'other' && <span>No flight assigned</span>}
                    {row.flights.map((flight) => <span key={`${flight.tail}-${flight.hour}`}>{flight.tail} · {flight.label} · departs {flight.hour}</span>)}
                  </div>
                  {row.use === 'available' && (
                    <div className="btn-row">
                      <button type="button" className="btn tiny" onClick={() => onError(actions.lease(row.stand.id, 'leased') || '')}>Lease</button>
                      <button type="button" className="btn tiny" onClick={() => onError(actions.lease(row.stand.id, 'owned') || '')}>Buy</button>
                    </div>
                  )}
                  {(row.use === 'leased' || row.use === 'owned') && !row.occupied && (
                    <button type="button" className="btn tiny" onClick={() => onError(actions.releaseGate(row.stand.id) || '')}>Release</button>
                  )}
                </article>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* CENTRALIZED DIRECTORY VIEWS (ALL GATES / AVAILABLE / ASSIGNED / RENTED) */}
      {activeTab !== 'map' && (
        <Panel
          title="Centralized Airport Gate Directory"
          aside={<span className="fine">{filteredGates.length} stands displayed</span>}
        >
          {/* Controls: Search, Filters & Bulk Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <input
              style={{ flex: '1 1 200px', minWidth: 160 }}
              value={searchQuery}
              placeholder="Search airport, city, gate, terminal, flight, or tail..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              value={airportFilter}
              onChange={(e) => setAirportFilter(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
            >
              <option value="all">All Airports ({AIRPORTS.length})</option>
              {AIRPORTS.map((ap) => (
                <option key={ap.id} value={ap.id}>{ap.id} — {ap.city} ({ap.size})</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available to Lease</option>
              <option value="leased">Rented / Leased</option>
              <option value="owned">Owned</option>
              <option value="assigned">Flight Assigned</option>
              <option value="other">Other Airlines</option>
            </select>

            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
            >
              <option value="all">All Gate Sizes</option>
              <option value="Super">Super (A380, 747-8)</option>
              <option value="Heavy">Heavy (Widebody)</option>
              <option value="Medium">Medium (Narrowbody)</option>
              <option value="Small">Small (Regional)</option>
            </select>

            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split('-') as [typeof sortBy, typeof sortDir]
                setSortBy(sb)
                setSortDir(sd)
              }}
              style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
            >
              <option value="airport-asc">Sort: Airport City (A–Z)</option>
              <option value="airport-desc">Sort: Airport City (Z–A)</option>
              <option value="gate-asc">Sort: Gate Number (A–Z)</option>
              <option value="size-desc">Sort: Gate Size (Largest)</option>
              <option value="cost-asc">Sort: Cost (Lowest)</option>
              <option value="cost-desc">Sort: Cost (Highest)</option>
              <option value="status-asc">Sort: Status</option>
            </select>
          </div>

          {/* Bulk Selection Actions Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.03)',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="fine" style={{ fontWeight: 600 }}>
                Selected: <b>{selectedGateIds.size}</b> gate{selectedGateIds.size !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="btn tiny ghost"
                onClick={handleSelectAllVisible}
                title="Select all currently visible gates held by your airline"
              >
                SELECT ALL VISIBLE
              </button>
              {airportFilter !== 'all' && (
                <button
                  type="button"
                  className="btn tiny ghost"
                  onClick={() => handleSelectAllAtAirport(airportFilter)}
                >
                  SELECT ALL AT {airportFilter}
                </button>
              )}
              {selectedGateIds.size > 0 && (
                <button
                  type="button"
                  className="btn tiny ghost"
                  onClick={handleClearSelection}
                >
                  CLEAR SELECTION
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedGateIds.size > 0 && (
                <button
                  type="button"
                  className="btn tiny danger"
                  onClick={() => setShowBulkModal(true)}
                  disabled={bulkStats.cancellableCount === 0}
                >
                  BULK CANCEL ({bulkStats.cancellableCount})
                </button>
              )}
            </div>
          </div>

          {/* Table of Gates */}
          {sortedGates.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: 10 }}>
              <p className="empty">No gates match your filter criteria.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: 960 }}>
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>
                      <input
                        type="checkbox"
                        checked={sortedGates.length > 0 && sortedGates.every((g) => !g.holdKind || selectedGateIds.has(g.stand.id))}
                        onChange={(e) => {
                          if (e.target.checked) handleSelectAllVisible()
                          else handleClearSelection()
                        }}
                        title="Select or deselect all visible held gates"
                      />
                    </th>
                    <th>Airport</th>
                    <th>Terminal</th>
                    <th>Gate</th>
                    <th>Gate Size</th>
                    <th>Compatible Aircraft</th>
                    <th>Ownership</th>
                    <th>Daily Cost / Buy</th>
                    <th>Status</th>
                    <th>Assigned Flight</th>
                    <th>Assigned Aircraft</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGates.map((g) => {
                    const isSelected = selectedGateIds.has(g.stand.id)
                    const isHeld = !!g.holdKind
                    const sizeBadgeColor = g.gateSize === 'Super' ? '#6d78d8' : g.gateSize === 'Heavy' ? '#c9843d' : g.gateSize === 'Medium' ? '#2f9e8f' : '#888'

                    return (
                      <tr
                        key={g.stand.id}
                        style={{
                          background: isSelected ? 'rgba(201, 132, 61, 0.08)' : undefined,
                          opacity: g.status === 'other' ? 0.6 : 1,
                        }}
                      >
                        <td>
                          {isHeld ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(g.stand.id)}
                            />
                          ) : (
                            <span className="fine" style={{ opacity: 0.3 }}>—</span>
                          )}
                        </td>
                        <td>
                          <b>{g.airportCity}</b>
                          <div className="fine" style={{ fontSize: 11 }}>{g.airportId} · {g.airportName}</div>
                        </td>
                        <td>
                          <b>Terminal {g.terminal}</b>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>
                            {g.gateNumber}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 650,
                              color: '#fff',
                              background: sizeBadgeColor,
                            }}
                          >
                            {g.gateSize}
                          </span>
                        </td>
                        <td>
                          <span className="fine" style={{ fontSize: 12 }}>{g.compatibleAircraft}</span>
                        </td>
                        <td>
                          {g.holdKind === 'owned' ? (
                            <strong style={{ color: 'var(--brass)' }}>Owned</strong>
                          ) : g.holdKind === 'leased' ? (
                            <span style={{ color: 'var(--good)' }}>Rented (Lease)</span>
                          ) : g.pool === 'player' ? (
                            <span className="fine">Available Slot</span>
                          ) : (
                            <span className="fine">Foreign Carrier</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {g.holdKind === 'owned' ? (
                            <div>
                              <span>{money(g.costDaily)}/day upkeep</span>
                              <div className="fine" style={{ fontSize: 11 }}>Owned property</div>
                            </div>
                          ) : g.pool === 'player' ? (
                            <div>
                              <b>{money(g.stand.leaseDaily)}/day</b>
                              <div className="fine" style={{ fontSize: 11 }}>{money(g.buyPrice)} buy</div>
                            </div>
                          ) : (
                            <span className="fine">—</span>
                          )}
                        </td>
                        <td>
                          {g.status === 'assigned' ? (
                            <span style={{ color: 'var(--good)', fontWeight: 600 }}>Assigned ({g.utilizationPct}%)</span>
                          ) : g.status === 'owned' || g.status === 'leased' ? (
                            <span style={{ color: 'var(--brass)' }}>Idle / Ready</span>
                          ) : g.status === 'available' ? (
                            <span className="fine">Available</span>
                          ) : (
                            <span className="fine">Occupied</span>
                          )}
                        </td>
                        <td>
                          {g.assignedFlights.length > 0 ? (
                            <div>
                              {g.assignedFlights.map((f, idx) => (
                                <div key={idx} style={{ fontSize: 12 }}>
                                  <b>{f.label}</b> ({f.hour})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="fine">None</span>
                          )}
                        </td>
                        <td>
                          {g.assignedAircraftTail ? (
                            <div>
                              <b>{g.assignedAircraftTail}</b>
                              <div className="fine" style={{ fontSize: 11 }}>{g.assignedAircraftModel}</div>
                            </div>
                          ) : (
                            <span className="fine">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {g.status === 'available' && (
                            <div className="btn-row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              <button
                                type="button"
                                className="btn tiny"
                                onClick={() => onError(actions.lease(g.stand.id, 'leased') || '')}
                                title={`Lease ${g.gateNumber} at ${money(g.stand.leaseDaily)}/day`}
                              >
                                Lease
                              </button>
                              <button
                                type="button"
                                className="btn tiny"
                                onClick={() => onError(actions.lease(g.stand.id, 'owned') || '')}
                                title={`Purchase ${g.gateNumber} for ${money(g.buyPrice)}`}
                              >
                                Buy
                              </button>
                            </div>
                          )}

                          {isHeld && (
                            <div className="btn-row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              {g.assignedFlights.length > 0 ? (
                                <button
                                  type="button"
                                  className="btn tiny ghost"
                                  onClick={() => actions.unassignGate(g.stand.id)}
                                  title="Unassign route from this gate"
                                >
                                  Unassign
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn tiny ghost"
                                  onClick={() => setAssigningGateId(g.stand.id)}
                                  title="Assign an active route to this gate"
                                >
                                  Assign
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn tiny danger"
                                onClick={() => {
                                  if (g.holdKind === 'owned') {
                                    if (confirm(`Release owned gate ${g.gateNumber}? You will receive ${money(Math.round(g.buyPrice * 0.6))} refund.`)) {
                                      actions.bulkReleaseGates([g.stand.id])
                                    }
                                  } else {
                                    if (confirm(`Cancel lease for ${g.gateNumber}? Saves ${money(g.costDaily)}/day.`)) {
                                      actions.bulkReleaseGates([g.stand.id])
                                    }
                                  }
                                }}
                                title={g.holdKind === 'owned' ? 'Release gate for partial refund' : 'Cancel rental lease'}
                              >
                                {g.holdKind === 'owned' ? 'Release' : 'Cancel'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* BULK CANCELLATION MODAL */}
      {showBulkModal && (
        <div className="modal-back" onClick={() => setShowBulkModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-x"
              aria-label="Close"
              onClick={() => setShowBulkModal(false)}
            >
              ×
            </button>
            <div className="modal-body">
              <span className="eyebrow">CONFIRM BULK GATE CANCELLATION</span>
              <h2>Cancel & Release {bulkStats.cancellableCount} Selected Gates?</h2>
              <p className="fine" style={{ marginBottom: 16 }}>
                You have selected {bulkStats.cancellableCount} gate holds across your airport network for immediate termination.
              </p>

              <div style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Number of gates to release:</span>
                  <b>{bulkStats.cancellableCount}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Total current daily recurring cost:</span>
                  <b style={{ color: 'var(--bad)' }}>{money(bulkStats.recurringCost)}/day</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Immediate cash refund (owned gates):</span>
                  <b style={{ color: 'var(--good)' }}>+{money(bulkStats.expectedRefund)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
                  <span>Annual recurring savings:</span>
                  <strong style={{ color: 'var(--good)' }}>{money(bulkStats.expectedSavings * 365)}/year</strong>
                </div>
              </div>

              {bulkStats.assignedCount > 0 && (
                <div style={{ background: 'rgba(196, 83, 74, 0.15)', border: '1px solid #c4534a', padding: 10, borderRadius: 6, marginBottom: 16 }}>
                  <strong style={{ color: '#c4534a', display: 'block', marginBottom: 2 }}>Warning:</strong>
                  <span className="fine" style={{ color: 'var(--fg)' }}>
                    {bulkStats.assignedCount} of these gates currently have scheduled flights assigned. Canceling these gates will automatically unassign the flights.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowBulkModal(false)}
                >
                  Keep Gates
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={handleConfirmBulkCancel}
                >
                  Confirm Bulk Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN FLIGHT MODAL */}
      {assigningGateId && (
        <div className="modal-back" onClick={() => setAssigningGateId(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-x"
              aria-label="Close"
              onClick={() => setAssigningGateId(null)}
            >
              ×
            </button>
            <div className="modal-body">
              <span className="eyebrow">GATE ASSIGNMENT</span>
              <h2>Assign Flight to Gate {assigningGateId}</h2>
              <p className="fine" style={{ marginBottom: 14 }}>
                Select an active route operating through {assigningGateId.slice(0, assigningGateId.lastIndexOf('-'))} to bind to this gate stand.
              </p>

              {routesForGateAssignment.length === 0 ? (
                <p className="empty" style={{ margin: '14px 0' }}>
                  No active routes currently touch airport {assigningGateId.slice(0, assigningGateId.lastIndexOf('-'))}. File a route first in Network Routes.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                  {routesForGateAssignment.map((r) => {
                    const plane = state.fleet.find((p) => p.id === r.aircraftId)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="btn ghost"
                        style={{ justifyContent: 'space-between', textAlign: 'left', padding: '10px 12px' }}
                        onClick={() => {
                          const err = actions.assignGate(r.id, assigningGateId)
                          if (err) onError(err)
                          setAssigningGateId(null)
                        }}
                      >
                        <div>
                          <strong>{r.origin} → {r.dest} {r.via ? `(via ${r.via})` : ''}</strong>
                          <div className="fine" style={{ fontSize: 11 }}>
                            Departs {r.departHour ?? 8}:00 · {plane?.tailNumber ?? 'Unassigned aircraft'}
                          </div>
                        </div>
                        <span className="btn tiny primary">Assign</span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setAssigningGateId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
