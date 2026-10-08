import { useMemo, useState } from 'react'
import type { AccidentRecord, GameState } from '../types'
import { money } from '../sim/util'
import { Kpi, Panel } from './widgets'

export function SafetyLog({ state }: { state: GameState }) {
  const [q, setQ] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [eventKindFilter, setEventKindFilter] = useState<string>('all')
  const [selectedRecord, setSelectedRecord] = useState<AccidentRecord | null>(null)

  const records = state.accidentLog ?? []

  // Unique aircraft types from the accident log
  const recordedTypes = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) {
      if (r.typeId) set.add(r.typeId)
    }
    return Array.from(set)
  }, [records])

  // Unique event types
  const recordedEventTypes = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) {
      if (r.eventType) set.add(r.eventType)
    }
    return Array.from(set)
  }, [records])

  // Summary statistics
  const totalEvents = records.length
  const fatalEvents = records.filter((r) => r.severity === 'FATAL ACCIDENT' || r.fatalities > 0).length
  const hullLosses = records.filter((r) => r.aircraftDisposition?.toLowerCase().includes('written off') || r.aircraftDamage?.toLowerCase().includes('destroyed')).length
  const totalFatalities = records.reduce((sum, r) => sum + (r.fatalities || 0), 0)
  const totalInjuries = records.reduce((sum, r) => sum + (r.injuries || 0), 0)
  const totalFinancialLoss = records.reduce((sum, r) => sum + (r.financialLoss || 0), 0)
  const activeInquiries = (state.meta.investigationUntil ?? 0) > state.meta.day

  // Filtered records
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return records.filter((r) => {
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false
      if (typeFilter !== 'all' && r.typeId !== typeFilter) return false
      if (eventKindFilter !== 'all' && r.eventType !== eventKindFilter) return false
      if (query) {
        const hay = `${r.flightNo} ${r.tailNumber} ${r.aircraftModel} ${r.origin} ${r.dest} ${r.eventType} ${r.cause} ${r.location}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })
  }, [records, severityFilter, typeFilter, eventKindFilter, q])

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Header & KPI Summary Statistics */}
      <div className="kpis">
        <Kpi
          label="Total Events"
          value={String(totalEvents)}
          note={`${fatalEvents} fatal · ${totalEvents - fatalEvents} non-fatal`}
        />
        <Kpi
          label="Hull Losses"
          value={String(hullLosses)}
          note={hullLosses > 0 ? `${hullLosses} total aircraft write-off` : 'Zero fleet hull losses'}
        />
        <Kpi
          label="Casualties"
          value={`${totalFatalities} / ${totalInjuries}`}
          note="Fatalities / Injuries"
        />
        <Kpi
          label="Safety Rating"
          value={`${Math.round(state.reputation.safety)}/100`}
          note={activeInquiries ? 'NTSB Inquiry Active' : 'Regulatory Standing Normal'}
        />
        <Kpi
          label="Insurance Load"
          value={`${(state.meta.insuranceLoad ?? 1.0).toFixed(2)}×`}
          note={state.meta.insuranceLoad > 1.1 ? 'Surplus risk surcharge' : 'Standard baseline rate'}
        />
        <Kpi
          label="Total Losses"
          value={money(totalFinancialLoss)}
          note="Equipment & Claims"
        />
      </div>

      <Panel
        title="Permanent Accident & Incident Register"
        aside={<span className="fine">{filtered.length} of {totalEvents} records filed</span>}
      >
        <p className="lede" style={{ marginBottom: 12 }}>
          Authoritative regulatory ledger recording all reportable occurrences, mechanical failures, bird strikes, in-flight incidents, and accidents in accordance with NTSB Part 830 and FAA safety standards.
        </p>

        {/* Filters and Search Bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            style={{ flex: '1 1 200px', minWidth: 160 }}
            value={q}
            placeholder="Search by flight, tail, model, route, or cause..."
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
          >
            <option value="all">All Severities</option>
            <option value="FATAL ACCIDENT">Fatal Accident</option>
            <option value="SERIOUS ACCIDENT">Serious Accident</option>
            <option value="MINOR ACCIDENT">Minor Accident</option>
            <option value="INCIDENT">Incident</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
          >
            <option value="all">All Aircraft Models</option>
            {recordedTypes.map((tid) => {
              const modelName = state.accidentLog.find((r) => r.typeId === tid)?.aircraftModel ?? tid
              return <option key={tid} value={tid}>{modelName}</option>
            })}
          </select>

          {recordedEventTypes.length > 0 && (
            <select
              value={eventKindFilter}
              onChange={(e) => setEventKindFilter(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg)', borderRadius: 6 }}
            >
              <option value="all">All Event Types</option>
              {recordedEventTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          )}

          {(q || severityFilter !== 'all' || typeFilter !== 'all' || eventKindFilter !== 'all') && (
            <button
              type="button"
              className="btn tiny ghost"
              onClick={() => {
                setQ('')
                setSeverityFilter('all')
                setTypeFilter('all')
                setEventKindFilter('all')
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Incident Log Table */}
        {filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: 10, border: '1px dashed var(--line)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>
              {records.length === 0 ? 'Flawless Safety Record' : 'No Records Match Filter'}
            </h3>
            <p className="fine" style={{ maxWidth: 540, margin: '0 auto' }}>
              {records.length === 0
                ? 'Your airline has operated with zero reportable safety occurrences. Maintain strict regular maintenance checks, avoid deferred maintenance faults, and monitor pilot fatigue to preserve this standing.'
                : 'Try adjusting your search query, aircraft type, or severity filters.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Date & Ref</th>
                  <th>Flight</th>
                  <th>Tail / Model</th>
                  <th>City Pair</th>
                  <th>Severity</th>
                  <th>Event & Cause</th>
                  <th>Casualties</th>
                  <th>Damage & Status</th>
                  <th>Cost</th>
                  <th>Investigation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isFatal = r.severity === 'FATAL ACCIDENT'
                  const isSerious = r.severity === 'SERIOUS ACCIDENT'
                  const isMinor = r.severity === 'MINOR ACCIDENT'
                  const badgeColor = isFatal ? '#c4534a' : isSerious ? '#c9843d' : isMinor ? '#e2b31a' : '#7eb6e0'

                  // Dynamic investigation progress
                  const daysSince = state.meta.day - r.day
                  const investigationLabel = daysSince > 45
                    ? 'Closed · Final Report Published'
                    : daysSince > 15
                      ? 'In Progress · Factual Docket Open'
                      : 'Active Immediate Investigation'

                  return (
                    <tr
                      key={r.id}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setSelectedRecord(r)}
                      title="Click to view complete NTSB / Safety Dossier"
                    >
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <b>{r.dateLabel}</b>
                        <div className="fine" style={{ fontSize: 11 }}>{r.id}</div>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--fg)' }}>{r.flightNo}</strong>
                      </td>
                      <td>
                        <b>{r.tailNumber}</b>
                        <div className="fine" style={{ fontSize: 11 }}>{r.aircraftModel}</div>
                      </td>
                      <td>
                        <span>{r.origin} → {r.dest}</span>
                        <div className="fine" style={{ fontSize: 11 }}>{r.location}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 650,
                            color: '#fff',
                            background: badgeColor,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td>
                        <b style={{ color: 'var(--fg)' }}>{r.eventType}</b>
                        <div className="fine" style={{ fontSize: 11 }}>{r.cause}</div>
                      </td>
                      <td>
                        {r.fatalities > 0 ? (
                          <strong style={{ color: 'var(--bad)' }}>{r.fatalities} fatal</strong>
                        ) : r.injuries > 0 ? (
                          <span style={{ color: 'var(--brass)' }}>{r.injuries} injured</span>
                        ) : (
                          <span className="fine">None ({r.paxAffected} pax safe)</span>
                        )}
                      </td>
                      <td>
                        <span>{r.aircraftDamage}</span>
                        <div className="fine" style={{ fontSize: 11, color: r.aircraftDisposition.includes('Written off') ? 'var(--bad)' : 'inherit' }}>
                          {r.aircraftDisposition}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {money(r.financialLoss)}
                      </td>
                      <td>
                        <span className="fine" style={{ fontSize: 11, display: 'block' }}>
                          {investigationLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Complete Investigation Dossier Modal */}
      {selectedRecord && (
        <div className="modal-back" onClick={() => setSelectedRecord(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-x"
              aria-label="Close"
              onClick={() => setSelectedRecord(null)}
            >
              ×
            </button>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="eyebrow" style={{ margin: 0 }}>
                  OFFICIAL NTSB / FAA SAFETY INVESTIGATION DOSSIER
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    background: selectedRecord.severity === 'FATAL ACCIDENT' ? '#c4534a' : selectedRecord.severity === 'SERIOUS ACCIDENT' ? '#c9843d' : '#2f9e8f',
                  }}
                >
                  {selectedRecord.severity}
                </span>
              </div>

              <h2 style={{ margin: '0 0 6px 0', fontSize: 20 }}>
                {selectedRecord.eventType} — Flight {selectedRecord.flightNo}
              </h2>
              <p className="fine" style={{ marginBottom: 14 }}>
                Occurrence on {selectedRecord.dateLabel} (Day {selectedRecord.day}) · Record Identifier: {selectedRecord.id}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-2)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <div>
                  <span className="fine" style={{ display: 'block' }}>Aircraft Registration:</span>
                  <strong>{selectedRecord.tailNumber}</strong>
                </div>
                <div>
                  <span className="fine" style={{ display: 'block' }}>Aircraft Type:</span>
                  <strong>{selectedRecord.aircraftModel}</strong>
                </div>
                <div>
                  <span className="fine" style={{ display: 'block' }}>Route & Location:</span>
                  <strong>{selectedRecord.origin} → {selectedRecord.dest} ({selectedRecord.location})</strong>
                </div>
                <div>
                  <span className="fine" style={{ display: 'block' }}>Commercial Operator:</span>
                  <strong>{selectedRecord.operator}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  Probable Cause & Contributing Factors
                </h4>
                <p style={{ margin: 0, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6, lineHeight: 1.5 }}>
                  {selectedRecord.cause}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Fatalities</span>
                  <strong style={{ fontSize: 16, color: selectedRecord.fatalities > 0 ? 'var(--bad)' : 'inherit' }}>
                    {selectedRecord.fatalities}
                  </strong>
                </div>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Injuries</span>
                  <strong style={{ fontSize: 16, color: selectedRecord.injuries > 0 ? 'var(--brass)' : 'inherit' }}>
                    {selectedRecord.injuries}
                  </strong>
                </div>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Passengers Boarded</span>
                  <strong style={{ fontSize: 16 }}>{selectedRecord.paxAffected}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Airframe Damage</span>
                  <strong>{selectedRecord.aircraftDamage}</strong>
                </div>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Aircraft Disposition</span>
                  <strong>{selectedRecord.aircraftDisposition}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Direct Financial Loss</span>
                  <strong style={{ fontSize: 15, color: 'var(--bad)' }}>{money(selectedRecord.financialLoss)}</strong>
                </div>
                <div style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6 }}>
                  <span className="fine" style={{ display: 'block' }}>Reputation Impact</span>
                  <strong>{selectedRecord.reputationImpact}</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                <span className="fine" style={{ display: 'block', fontWeight: 600, color: 'var(--brass)', marginBottom: 2 }}>
                  Investigation Findings & Status:
                </span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                  {selectedRecord.investigationStatus}. Safety board recommendations mandate thorough inspection of related subsystem components across all sister fleet aircraft.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
