import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AIRCRAFT, CLEAN_LIVERIES, aircraftImage, forSaleTypes, getLiveryKey, getType } from '../data/aircraft'
import { builtCount, rarityOf } from '../data/production'
import { conditionGrade } from '../sim/setup'
import { AIRPORTS, SCENE, THEATERS, airportImage, airportThumb, getAirport, viewZoom } from '../data/airports'
import { galleryFor } from '../data/marketPhotos'
import { ColoredAircraft } from './colorPhoto'
import type { CabinLayout, Condition, ConditionKey, Frequency, GameState, Strategy } from '../types'
import { cueForEvent, getMix, playCue, setMix, subscribeMix, syncScene, unlockAudio, weatherKind } from '../audio/mixer'
import { experienceLabel, fatigueLabel, pilotIdentity, pilotStatus } from '../data/pilotRoster'
import { distanceNm } from '../sim/geo'
import { assessNonstop, assessStop, stopoverChoices } from '../sim/range'
import { forecastLeg, overallReputation, quotePurchase, referenceFare, reliabilityOf, repairCost } from '../sim/economy'
import { loanOffer } from '../sim/eventsApply'
import { cabinRequired, neglectCopy } from '../sim/safety'
import { debtBalance, stageLabel, warnings } from '../sim/selectors'
import { airlineYear, calendar, formatDate, money, moneyExact, monthName } from '../sim/util'
import { actions, clearSave, getSaveMetadata, type SaveMetadata } from '../state/store'
import { AirportSatMap, OpsMap } from './mapview'
import { Meals } from './meals'
import { Gates } from './gates'
import { SafetyLog } from './safetyLog'
import { allMeals, mealById } from '../data/meals'
import { placeRoute } from '../sim/gates'
import { Bar, Mark, Panel, Photo, Spark, Tag } from './widgets'

function activeModal(state: GameState): 'fault' | 'merger' | 'event' | 'briefing' | null {
  if (state.faultPrompt) return 'fault'
  if (state.merger) return 'merger'
  if (state.pending) return 'event'
  if (state.meta.showBriefing) return 'briefing'
  return null
}

function AudioControl() {
  const mix = useSyncExternalStore(subscribeMix, getMix, getMix)
  const [open, setOpen] = useState(false)
  return (
    <div className="audio-pop">
      <button type="button" className={mix.muted ? 'on' : ''} onClick={() => { unlockAudio(); setOpen((v) => !v) }}>{mix.muted ? 'Muted' : 'Audio'}</button>
      {open && (
        <div className="audio-panel">
          <label>Master<input type="range" min={0} max={100} value={Math.round(mix.master * 100)} onChange={(e) => setMix({ master: Number(e.target.value) / 100 })} /></label>
          <label>Music<input type="range" min={0} max={100} value={Math.round(mix.music * 100)} onChange={(e) => setMix({ music: Number(e.target.value) / 100 })} /></label>
          <label>Sound effects<input type="range" min={0} max={100} value={Math.round(mix.sfx * 100)} onChange={(e) => setMix({ sfx: Number(e.target.value) / 100 })} /></label>
          <button type="button" onClick={() => setMix({ muted: !mix.muted })}>{mix.muted ? 'Unmute' : 'Mute'}</button>
        </div>
      )}
    </div>
  )
}

const NAV = [
  ['overview', '01', 'Dispatch'],
  ['map', '02', 'Map'],
  ['fleet', '03', 'Fleet'],
  ['market', '04', 'Market'],
  ['routes', '05', 'Routes'],
  ['meals', '06', 'Meals'],
  ['airports', '07', 'Airports'],
  ['gates', '08', 'Gates'],
  ['safetyLog', '09', 'Safety Log'],
  ['finance', '10', 'Finance'],
  ['crew', '11', 'Crew'],
  ['rivals', '12', 'Rivals'],
  ['news', '13', 'News'],
] as const

function ColorSwatches({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const currentKey = getLiveryKey(color)
  return (
    <div className="swatches-clean" role="group" aria-label="Airline color">
      <span className="fine" style={{ marginBottom: 2 }}>Airline aircraft color:</span>
      <div className="swatch-row">
        {CLEAN_LIVERIES.map((livery) => (
          <button
            key={livery.key}
            type="button"
            className={`swatch-pill ${currentKey === livery.key ? 'on' : ''}`}
            onClick={() => onChange(livery.hex)}
            title={livery.description}
          >
            <span className="swatch-dot" style={{ background: livery.hex }} />
            <span>{livery.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function CreateScreen() {
  const [name, setName] = useState('Red Mesa Air')
  const [iata, setIata] = useState('RM')
  const [home, setHome] = useState('AUS')
  const [strategy, setStrategy] = useState<Strategy>('regional')
  const [color, setColor] = useState('#c4534a')
  const [savedInfo, setSavedInfo] = useState<SaveMetadata | null>(() => getSaveMetadata())
  const airport = getAirport(home)

  useEffect(() => {
    setSavedInfo(getSaveMetadata())
    const arm = () => {
      syncScene({ music: 'menu', place: 'menu', weather: 'none' })
      unlockAudio()
    }
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [])

  return (
    <div className="create">
      <Photo src={airportImage(home, 'aerial')} alt={`${airport.city} airport`} className="create-photo" />
      <div className="create-scrim">
        <div className="create-copy">
          <p className="eyebrow">Airline 96 · January 2026</p>
          <h1>Start with five million dollars and no airplanes.</h1>
          <p>Buy something old enough to afford. Keep it flying. The industry will not wait for you to feel ready.</p>
        </div>
        <div className="create-card">
          {savedInfo && (
            <div style={{ border: '1px solid var(--brass)', borderRadius: 12, padding: 14, background: 'rgba(20, 28, 38, 0.95)', marginBottom: 8, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyebrow" style={{ color: 'var(--brass)' }}>Saved Airline Found</span>
                <span className="save-tag">Autosaved</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mark code={savedInfo.iata} color={savedInfo.color} />
                <div>
                  <strong style={{ fontSize: 17, display: 'block' }}>{savedInfo.name}</strong>
                  <span className="fine" style={{ color: 'var(--muted)' }}>Hub {savedInfo.home} · {savedInfo.date}</span>
                </div>
              </div>
              <div className="top-metrics" style={{ fontSize: 13, gap: 12 }}>
                <span>Cash <b>{money(savedInfo.cash)}</b></span>
                <span>Fleet <b>{savedInfo.fleetCount}</b></span>
                <span>Routes <b>{savedInfo.routeCount}</b></span>
              </div>
              <div className="btn-row" style={{ marginTop: 4 }}>
                <button className="btn primary" type="button" onClick={() => actions.continue()}>
                  Continue {savedInfo.name}
                </button>
                <button className="btn" type="button" onClick={() => actions.load()}>
                  Load Save
                </button>
                <button className="btn danger tiny" type="button" onClick={() => {
                  if (confirm(`Delete save for ${savedInfo.name}? This cannot be undone.`)) {
                    actions.deleteSave()
                    setSavedInfo(null)
                  }
                }}>
                  Delete Save
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); actions.start({ name, iata, home, strategy, color }) }} style={{ display: 'grid', gap: 8 }}>
            <h2>{savedInfo ? 'Or start a new airline' : 'Create your airline'}</h2>
            <label>Airline name<input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} required /></label>
            <label>IATA code<input value={iata} maxLength={3} onChange={(e) => setIata(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} required /></label>
            <AirportSelect label="Home airport" value={home} onChange={setHome} />
            <label>Strategy
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
                <option value="ulcc">Ultra low cost</option>
                <option value="lcc">Low cost</option>
                <option value="regional">Regional</option>
                <option value="full">Full service</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <ColorSwatches color={color} onChange={setColor} />
            <p className="fine">Cash $5,000,000 · Brand strength 5 · Credit poor · Fleet empty</p>
            <p className="fine">Music: “Airport Lounge” and “Floating Cities” by Kevin MacLeod (incompetech.com), CC BY 4.0.</p>
            <button className="btn primary" type="submit" disabled={name.trim().length < 2 || iata.length < 2}>
              {savedInfo ? 'New Game (Start Fresh Airline)' : 'Open the airline'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function Shell({ state }: { state: GameState }) {
  const [error, setError] = useState('')
  const [colorsOpen, setColorsOpen] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const [gameMenuOpen, setGameMenuOpen] = useState(false)
  const modal = activeModal(state)
  useEffect(() => {
    if (!state.meta.speed) return
    const ms = state.meta.speed === 1 ? 1700 : 560
    const id = window.setInterval(() => actions.advance(1), ms)
    return () => window.clearInterval(id)
  }, [state.meta.speed, state.pending, state.merger, state.faultPrompt])
  useEffect(() => {
    const arm = () => unlockAudio()
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !modal) return
      e.preventDefault()
      actions.dismissTop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])
  useEffect(() => {
    const labels = state.market.weather.filter((w) => w.untilDay > state.meta.day).map((w) => w.label)
    syncScene({
      music: 'game',
      place: 'game',
      weather: weatherKind(labels),
    })
  }, [state.meta.day, state.market.weather])
  useEffect(() => {
    if (!modal) return
    if (modal === 'event' && state.pending) playCue(cueForEvent(state.pending.defId))
    else if (modal === 'fault') playCue('events/maintenance/mech.wav')
    else if (modal === 'merger') playCue('events/merger/m1.wav')
  }, [modal, state.pending, state.faultPrompt, state.merger])

  const warn = warnings(state)
  return (
    <div className={modal ? 'app modal-open' : 'app'}>
      <aside className="sidebar">
        <div className="brand-wrap">
          <button type="button" className="brand brand-btn" onClick={() => setColorsOpen((v) => !v)}>
            <Mark code={state.airline.iata} color={state.airline.color} />
            <div>
              <strong>{state.airline.name}</strong>
              <span>{stageLabel(state)}</span>
            </div>
          </button>
          {colorsOpen && (
            <div className="color-pop">
              <p className="fine">Airline color</p>
              <ColorSwatches color={state.airline.color} onChange={(next) => actions.setColor(next)} />
            </div>
          )}
        </div>
        <nav>
          {NAV.map(([id, num, label]) => (
            <button key={id} className={state.meta.view === id ? 'on' : ''} onClick={() => actions.setView(id)}>
              <em>{num}</em>{label}
            </button>
          ))}
        </nav>
      </aside>
      <header className="topbar">
        <div>
          <b>{formatDate(state.meta.day)}</b>
          <span>Year {airlineYear(state.meta.day)} · {monthName(calendar(state.meta.day).month)}</span>
        </div>
        <div className="top-metrics">
          <span>Cash <b>{money(state.finance.cash)}</b></span>
          <span>Debt <b>{money(debtBalance(state))}</b></span>
          <span>Fuel <b>{Math.round(state.market.fuelIndex * 100)}%</b></span>
          <span>Brand <b>{Math.round(state.reputation.brand)}</b></span>
        </div>
        <div className="transport">
          <button className={state.meta.speed === 0 ? 'on' : ''} onClick={() => actions.setSpeed(0)}>Hold</button>
          <button className={state.meta.speed === 1 ? 'on' : ''} onClick={() => actions.setSpeed(1)}>1×</button>
          <button className={state.meta.speed === 3 ? 'on' : ''} onClick={() => actions.setSpeed(3)}>3×</button>
          <button onClick={() => actions.advance(1)}>+1 day</button>
          <button onClick={() => actions.advance(7)}>+7</button>
          <button
            type="button"
            className={saveNotice ? 'on' : ''}
            onClick={() => {
              if (actions.save()) {
                setSaveNotice('Saved!')
                setTimeout(() => setSaveNotice(''), 2000)
              }
            }}
            title="Save Game to browser localStorage"
          >
            {saveNotice || 'Save'}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={gameMenuOpen ? 'on' : ''}
              onClick={() => setGameMenuOpen((v) => !v)}
              title="Game Options"
            >
              Game
            </button>
            {gameMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 6,
                  zIndex: 2000,
                  background: '#18212b',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => {
                    actions.save()
                    setSaveNotice('Saved!')
                    setGameMenuOpen(false)
                    setTimeout(() => setSaveNotice(''), 2000)
                  }}
                >
                  Save Game
                </button>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => {
                    if (actions.load()) {
                      setGameMenuOpen(false)
                    }
                  }}
                >
                  Load Save
                </button>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => {
                    if (confirm('Start a new game? Any unsaved progress will be replaced.')) {
                      actions.newGame()
                      setGameMenuOpen(false)
                    }
                  }}
                >
                  New Game
                </button>
                <button
                  type="button"
                  className="btn tiny danger"
                  onClick={() => {
                    if (confirm('Delete the saved game from browser storage?')) {
                      actions.deleteSave()
                      setGameMenuOpen(false)
                    }
                  }}
                >
                  Delete Save
                </button>
                <span className="fine" style={{ textAlign: 'center', fontSize: 11, color: 'var(--good)' }}>
                  Autosave: Active
                </span>
              </div>
            )}
          </div>
          <AudioControl />
        </div>
      </header>
      <main className="main">
        {warn.length > 0 && <div className="warn">{warn[0]}</div>}
        {error && <div className="warn badline">{error} <button onClick={() => setError('')}>Dismiss</button></div>}
        {state.meta.view === 'overview' && <Overview state={state} />}
        {state.meta.view === 'map' && <div className="map-wrap"><OpsMap state={state} /></div>}
        {state.meta.view === 'fleet' && <Fleet state={state} onError={setError} />}
        {state.meta.view === 'market' && <Market state={state} onError={setError} />}
        {state.meta.view === 'routes' && <Routes state={state} onError={setError} />}
        {state.meta.view === 'meals' && <Meals state={state} onError={setError} />}
        {state.meta.view === 'airports' && <Airports state={state} />}
        {state.meta.view === 'gates' && <Gates state={state} onError={setError} />}
        {state.meta.view === 'safetyLog' && <SafetyLog state={state} />}
        {state.meta.view === 'finance' && <Finance state={state} onError={setError} />}
        {state.meta.view === 'crew' && <Crew state={state} onError={setError} />}
        {state.meta.view === 'rivals' && <Rivals state={state} />}
        {state.meta.view === 'news' && <News state={state} />}
      </main>
      {modal === 'briefing' && <Briefing />}
      {modal === 'fault' && <FaultModal state={state} onError={setError} />}
      {modal === 'event' && <EventModal state={state} />}
      {modal === 'merger' && <MergerModal state={state} onError={setError} />}
    </div>
  )
}

function Briefing() {
  return (
    <div className="modal-back">
      <button type="button" className="modal-x" aria-label="Close" onClick={() => actions.dismissTop()}>×</button>
      <div className="modal">
        <Photo src={SCENE.apron} alt="Aircraft on an apron" />
        <div className="modal-body">
          <p className="eyebrow">Dispatch briefing</p>
          <h2>You are unknown, undercapitalized, and late to the market.</h2>
          <p>MesaLink already flies Austin. Prairie Jet will cut a fare without sentiment. Buy one aircraft you can maintain, open one route, and operate the day.</p>
          <ol className="steps">
            <li>Buy from the used market. The MD-82 and 737-300 are the honest choices.</li>
            <li>Open a route from your home airport and file a fare.</li>
            <li>Advance the day. Read the passenger count and the cash.</li>
          </ol>
          <button className="btn primary" onClick={() => { actions.dismissBriefing(); actions.setView('market') }}>Go to the market</button>
        </div>
      </div>
    </div>
  )
}

function Overview({ state }: { state: GameState }) {
  const report = state.lastReport
  const reps = state.reputation
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Cash" value={money(state.finance.cash)} note={state.finance.credit + ' credit'} />
        <Kpi label="Debt" value={money(debtBalance(state))} note={`${state.loans.length} facilities`} />
        <Kpi label="Fleet" value={String(state.fleet.filter((a) => a.status !== 'lost').length)} note={`${state.routes.length} routes`} />
        <Kpi label="Today" value={report ? money(report.profit) : '—'} note={report ? `${report.pax} passengers` : 'Not operated'} />
        <Kpi label="Reputation" value={String(overallReputation(state))} note={`Brand ${Math.round(reps.brand)}`} />
        <Kpi label="Safety" value={String(Math.round(reps.safety))} note={(state.meta.investigationUntil ?? 0) > state.meta.day ? 'Investigation open' : `Reliability ${Math.round(reps.reliability)}`} />
      </div>
      <div className="split">
        <Panel title="Active flights" aside={<span className="muted">{report ? report.dateLabel : 'No day operated'}</span>}>
          {!report || report.flights.length === 0 ? <p className="empty">No flights yet. Buy an aircraft and file a route.</p> : (
            <table className="table">
              <thead><tr><th>Flight</th><th>City pair</th><th>Aircraft</th><th>Status</th><th>Load</th><th>Result</th></tr></thead>
              <tbody>
                {report.flights.map((f) => {
                  const typeId = state.fleet.find((a) => a.id === f.aircraftId)?.typeId ?? f.typeId
                  const type = getType(typeId)
                  return (
                  <tr key={f.id}>
                    <td>{f.flightNo}</td>
                    <td>{f.origin} → {f.dest}</td>
                    <td className="ac-id"><b>{f.tail}</b><span>{type.manufacturer} {type.model}</span></td>
                    <td className={f.status === 'cancelled' || f.status === 'incident' ? 'bad' : ''}>{f.status}</td>
                    <td>{f.seats ? `${f.pax}/${f.seats}` : '—'}</td>
                    <td className={f.profit >= 0 ? 'good' : 'bad'}>{money(f.profit)}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {report && (
            <div className="report-line">
              <span>Revenue {money(report.revenue)}</span>
              <span>Expenses {money(report.expenses)}</span>
              <span className={report.profit >= 0 ? 'good' : 'bad'}>Net {money(report.profit)}</span>
            </div>
          )}
        </Panel>
        <Panel title="Market wire">
          {state.news.slice(0, 4).map((n) => (
            <article key={n.id} className="news-row">
              <Photo src={n.image} alt="" />
              <div>
                <Tag>{n.tag}</Tag>
                <h3>{n.headline}</h3>
                <p>{n.body}</p>
              </div>
            </article>
          ))}
        </Panel>
      </div>
      <Panel title="Daily result" aside={<span className="muted">Last four weeks</span>}>
        <Spark values={state.history.map((h) => h.profit)} />
        <div className="rep-grid">
          {(['satisfaction', 'reliability', 'safety', 'service', 'price', 'trust', 'brand'] as const).map((k) => (
            <div key={k}><span>{k}</span><Bar value={reps[k]} tone={reps[k] < 25 ? 'bad' : 'brass'} /><b>{Math.round(reps[k])}</b></div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="kpi"><span>{label}</span><strong>{value}</strong><em>{note}</em></div>
}

function Fleet({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const [id, setId] = useState<string | null>(state.fleet[0]?.id ?? null)
  const ac = state.fleet.find((a) => a.id === id) ?? state.fleet[0]
  if (!ac) {
    return (
      <div className="empty-hero">
        <Photo src={SCENE.hangar} alt="Empty hangar" />
        <div>
          <h2>The hangar is empty.</h2>
          <p>The used market is the only place an airline with $5 million belongs.</p>
          <button className="btn primary" onClick={() => actions.setView('market')}>Open the market</button>
        </div>
      </div>
    )
  }
  return (
    <div className="split wide">
      <div className="card-list">
        {state.fleet.map((plane) => {
          const type = getType(plane.typeId)
          return (
            <button key={plane.id} className={`fleet-card ${plane.id === ac.id ? 'on' : ''}`} onClick={() => setId(plane.id)}>
              <ColoredAircraft typeId={type.id} color={plane.color || state.airline.color} alt={type.model} />
              <div>
                <b>{plane.tailNumber}</b>
                <span>{type.manufacturer} {type.model}</span>
                <em>{plane.yearBuilt} · {plane.status} · {plane.location}</em>
              </div>
            </button>
          )
        })}
      </div>
      <AircraftDetail state={state} id={ac.id} onError={onError} />
    </div>
  )
}

function AircraftDetail({ state, id, onError }: { state: GameState; id: string; onError: (s: string) => void }) {
  const ac = state.fleet.find((a) => a.id === id)
  const [tab, setTab] = useState<'exterior' | 'cabin' | 'cockpit' | 'maintenance'>('exterior')
  if (!ac) return null
  const type = getType(ac.typeId)
  const rel = reliabilityOf(type.reliability, ac.condition)
  const year = calendar(state.meta.day).year
  const activeLivery = getLiveryKey(ac.color || state.airline.color)
  return (
    <Panel title={`${ac.tailNumber} · ${type.manufacturer} ${type.model}`} aside={<Tag>{ac.ownership}</Tag>}>
      {tab === 'exterior'
        ? <ColoredAircraft typeId={type.id} color={ac.color || state.airline.color} alt={type.model} className="hero-photo" />
        : <Photo src={aircraftImage(type, tab)} alt={`${type.model} ${tab}`} className="hero-photo" />}
      <div className="tabs">
        {(['exterior', 'cabin', 'cockpit', 'maintenance'] as const).map((k) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k}</button>
        ))}
      </div>
      {tab === 'exterior' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0', flexWrap: 'wrap' }}>
          <span className="fine" style={{ fontWeight: 560, marginRight: 2 }}>Aircraft color:</span>
          {CLEAN_LIVERIES.map((livery) => (
            <button
              key={livery.key}
              type="button"
              className={`btn tiny ${activeLivery === livery.key ? 'primary' : 'ghost'}`}
              onClick={() => {
                actions.setAircraftColor(ac.id, livery.hex)
                actions.setColor(livery.hex)
              }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: livery.hex, marginRight: 5, verticalAlign: 'middle' }} />
              {livery.name}
            </button>
          ))}
        </div>
      )}
      <p className="lede">{year - ac.yearBuilt} years old · {type.manufacturer} {type.model} · {type.seatCapacity} seats · {type.rangeNm.toLocaleString('en-US')} nm · reliability {Math.round(rel)}</p>
      {(ac.neglect ?? 0) >= 8 && <p className="fine">{neglectCopy(ac.neglect, year - ac.yearBuilt)}</p>}
      <div className="cond">
        {(Object.keys(ac.condition) as ConditionKey[]).map((k) => (
          <div key={k}>
            <span>{k}</span>
            <Bar value={ac.condition[k]} tone={ac.condition[k] < 40 ? 'bad' : 'brass'} />
            <b>{Math.round(ac.condition[k])}%</b>
            <button className="btn tiny" onClick={() => onError(actions.repair(ac.id, k) || '')}>Repair {money(repairCost(ac.typeId, k, ac.condition[k]))}</button>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => onError(actions.repair(ac.id, 'check') || '')}>C-check {money(type.checkCost)}</button>
        <button className="btn" onClick={() => actions.storeAircraft(ac.id, ac.status !== 'stored')}>{ac.status === 'stored' ? 'Return to service' : 'Store'}</button>
        <button className="btn danger" onClick={() => onError(actions.sell(ac.id) || '')}>{ac.ownership === 'leased' ? 'Return lease' : 'Sell at 82%'}</button>
      </div>

      <div style={{ marginTop: 14, background: 'var(--bg-2)', padding: 12, borderRadius: 8, border: '1px solid var(--line)' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brass)' }}>
          Authoritative Type Specifications & Characteristics
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px 14px', fontSize: 12 }}>
          <div><span className="fine">Manufacturer / Variant:</span> <b>{type.manufacturer} · {type.variant}</b></div>
          <div><span className="fine">Fuselage Architecture:</span> <b>{type.fuselageType} ({type.seatingLayout})</b></div>
          <div><span className="fine">Seating (Typ / Max):</span> <b>{type.seatCapacity} typ / {type.maxSeatCapacity} max</b></div>
          <div><span className="fine">Production History:</span> <b>{type.productionStart}–{type.productionEnd ?? 'Present'} (1st flight {type.firstFlightYear})</b></div>
          <div><span className="fine">Engines:</span> <b>{type.engineType}</b></div>
          <div><span className="fine">MTOW / Max Weight:</span> <b>{type.mtowLbs.toLocaleString('en-US')} lbs</b></div>
          <div><span className="fine">Cruise Speed / Range:</span> <b>{type.cruiseSpeedKt} kt · {type.rangeNm.toLocaleString('en-US')} nm</b></div>
          <div><span className="fine">Fuel Cap / Burn:</span> <b>{type.fuelCapacityGal.toLocaleString('en-US')} gal · {type.fuelBurnGph} gph</b></div>
          <div><span className="fine">Airport Gate Compatibility:</span> <b>Gate Size {type.gateSizeRequired} (ICAO {type.icaoCategory})</b></div>
          <div><span className="fine">Takeoff Runway Required:</span> <b>{type.minRunwayFt.toLocaleString('en-US')} ft</b></div>
          <div><span className="fine">Operating Cost Baseline:</span> <b>{money(type.costPerBlockHour)} / block hr</b></div>
          <div><span className="fine">Type ICAO Code:</span> <b style={{ fontFamily: 'monospace' }}>{type.icaoCode}</b></div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
          Airframe Service & Operational History
        </h4>
        {ac.serviceLog && ac.serviceLog.length > 0 ? (
          <ul className="history" style={{ maxHeight: 180, overflowY: 'auto' }}>
            {ac.serviceLog.map((log, idx) => (
              <li key={idx}>
                <b>{log.dateLabel}</b> <span style={{ color: log.kind === 'incident' || log.kind === 'accident' ? 'var(--bad)' : 'var(--brass)' }}>[{log.kind.toUpperCase()}]</span> {log.title}: {log.detail} {log.cost ? `(${money(log.cost)})` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="history">
            {ac.history.map((h, i) => <li key={i}><b>{h.year}</b> {h.text}</li>)}
          </ul>
        )}
      </div>
      <p className="fine" style={{ marginTop: 10 }}>Hours {Math.round(ac.flightHours).toLocaleString('en-US')} · cycles {Math.round(ac.cycles).toLocaleString('en-US')} · revenue {money(ac.totalRevenue)} · deliveries {ac.flightsCompleted ?? 0} flights</p>
    </Panel>
  )
}

function Market({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const [id, setId] = useState(state.listings[0]?.id ?? '')
  const [shot, setShot] = useState(0)
  const listing = state.listings.find((l) => l.id === id) ?? state.listings[0]
  useEffect(() => { setShot(0) }, [listing?.id])
  if (!listing) return <p className="empty">The market is empty today.</p>
  const type = getType(listing.typeId)
  const quoteCash = quotePurchase(state, listing.id, 'cash')
  const quoteLease = quotePurchase(state, listing.id, 'lease')
  const quoteFin = quotePurchase(state, listing.id, 'finance')
  const year = calendar(state.meta.day).year
  const grade = listing.maintenance ?? conditionGrade(listing.condition)
  const shots = galleryFor(listing.typeId, listing.photo || aircraftImage(type, 'exterior'))
  const main = shots[Math.min(shot, shots.length - 1)] ?? shots[0]
  return (
    <>
    <div className="split market-split">
      <div className="card-list market-list">
        {state.listings.map((l) => {
          const t = getType(l.typeId)
          const rowGrade = l.maintenance ?? conditionGrade(l.condition)
          return (
            <button key={l.id} className={`market-card ${l.id === listing.id ? 'on' : ''}`} onClick={() => setId(l.id)}>
              <span className="market-thumb">
                <img src={l.photo || aircraftImage(t, 'exterior')} alt={t.model} />
              </span>
              <span className="market-copy">
                <b>{t.manufacturer} {t.model}</b>
                <strong>{money(l.price)}</strong>
                <em>{l.yearBuilt} · {rowGrade}</em>
                <em>{l.tailNumber} · {l.parkedAt}{l.tailStrike ? ' · Tail strike' : ''}</em>
              </span>
            </button>
          )
        })}
      </div>
      <Panel title={`${listing.yearBuilt} ${type.manufacturer} ${type.model}`}>
        <div className="market-detail">
          <div className="market-gallery">
            <div className="market-main">
              <img src={main} alt={`${type.model} photograph`} />
            </div>
            {shots.length > 1 && (
              <div className="market-thumbs">
                {shots.map((src, i) => (
                  <button key={src} type="button" className={i === Math.min(shot, shots.length - 1) ? 'on' : ''} onClick={() => setShot(i)}>
                    <img src={src} alt={`${type.model} view ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="market-facts">
            <p className="market-price">{money(listing.price)}</p>
            <p className="lede">{listing.yearBuilt} · {year - listing.yearBuilt} years old · Condition {grade}</p>
            <p className="fine">{listing.cycles.toLocaleString('en-US')} cycles · {listing.flightHours.toLocaleString('en-US')} hours · {listing.tailNumber} · parked at {listing.parkedAt}</p>
            <p className="fine">Previous operators: {listing.operators ?? '—'} · {rarityOf(type.id)} · {builtCount(type.id).toLocaleString('en-US')} built</p>
            {listing.tailStrike && <p className="fine">Previous tail strike. It was repaired and the aircraft returned to service. The price and the insurance quote reflect that history.</p>}
            <ConditionGrid condition={listing.condition} />
            <ul className="history">{listing.history.map((h, i) => <li key={i}><b>{h.year}</b> {h.text}</li>)}</ul>
            <div className="quotes">
              <QuoteButton title="Buy with cash" detail={quoteCash.ok ? `Due today ${moneyExact(quoteCash.cashDue)} including crew and insurance` : quoteCash.reason} disabled={!quoteCash.ok} onClick={() => onError(actions.buy(listing.id, 'cash') || '')} />
              <QuoteButton title="Finance 70%" detail={quoteFin.ok ? `${moneyExact(quoteFin.cashDue)} down · ${money(quoteFin.payment)}/mo at ${(quoteFin.rate * 100).toFixed(1)}%` : quoteFin.reason} disabled={!quoteFin.ok} onClick={() => onError(actions.buy(listing.id, 'finance') || '')} />
              <QuoteButton title="Lease 36 months" detail={quoteLease.ok ? `${money(quoteLease.leaseMonthly)}/mo · deposit ${money(quoteLease.deposit)}` : quoteLease.reason} disabled={!quoteLease.ok} onClick={() => onError(actions.buy(listing.id, 'lease') || '')} />
            </div>
            <p className="fine">Delivery hires four type-rated pilots. After you buy or lease, the aircraft takes your airline color. Fuel index {type.fuelIndex.toFixed(2)}.</p>
          </div>
        </div>
      </Panel>
    </div>
    <Panel title={`Type catalog · ${AIRCRAFT.length} models · ${state.listings.length} listed now`}>
      <p className="fine">Listings come and go as days pass. A common type, built in the thousands, shows up more often than a short production run. Highlighted types are the ones the market can actually sell.</p>
      <div className="catalog">
        {AIRCRAFT.map((t) => <span key={t.id} className={forSaleTypes().some((s) => s.id === t.id) ? 'on' : ''}>{t.model}</span>)}
      </div>
    </Panel>
  </>
  )
}

function QuoteButton({ title, detail, disabled, onClick }: { title: string; detail: string; disabled: boolean; onClick: () => void }) {
  return (
    <button className="quote" disabled={disabled} onClick={onClick}>
      <b>{title}</b>
      <span>{detail}</span>
    </button>
  )
}

function ConditionGrid({ condition }: { condition: Condition }) {
  return (
    <div className="cond">
      {(Object.keys(condition) as ConditionKey[]).map((k) => (
        <div key={k}><span>{k}</span><Bar value={condition[k]} tone={condition[k] < 45 ? 'bad' : 'brass'} /><b>{Math.round(condition[k])}%</b></div>
      ))}
    </div>
  )
}

function suggestedFare(origin: string, dest: string) {
  return referenceFare(distanceNm(getAirport(origin), getAirport(dest)))
}

function fareMessage(text: string): string {
  const t = text.trim()
  if (!t) return 'Please enter a ticket price.'
  if (!/^-?\d+(\.\d+)?$/.test(t)) return 'Please enter a valid ticket price.'
  const n = Number(t)
  if (!Number.isFinite(n)) return 'Please enter a valid ticket price.'
  if (n <= 0) return 'Ticket price must be greater than $0.'
  return ''
}

function RouteFare({ routeId, price, origin, dest }: { routeId: string; price: number; origin: string; dest: string }) {
  const [text, setText] = useState(String(price))
  const [warn, setWarn] = useState('')
  useEffect(() => { setText(String(price)) }, [price])
  function commit() {
    const err = fareMessage(text)
    if (err) {
      setWarn(err)
      playCue('ui/error/err.wav')
      return
    }
    const n = Math.round(Number(text))
    const ref = suggestedFare(origin, dest)
    setWarn(n > ref * 2.5 ? 'This fare is extremely high. Passenger demand may collapse.' : '')
    if (n !== price) actions.patchRoute(routeId, { price: n })
  }
  return (
    <label className="inline fare-field">
      Fare
      <input
        type="text"
        inputMode="decimal"
        value={text}
        aria-label="Ticket price"
        onChange={(e) => { setText(e.target.value); setWarn('') }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
        }}
      />
      {warn && <span className="fine bad fare-warn">{warn}</span>}
    </label>
  )
}

function Routes({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const aircraft = state.fleet.filter((a) => a.status !== 'lost' && a.status !== 'stored')
  const initialDest = state.airline.home === 'DFW' ? 'AUS' : 'DFW'
  const [origin, setOrigin] = useState(state.airline.home)
  const [dest, setDest] = useState(initialDest)
  const [aircraftId, setAircraftId] = useState(aircraft[0]?.id ?? '')
  const [priceText, setPriceText] = useState(() => String(suggestedFare(state.airline.home, state.airline.home === 'DFW' ? 'AUS' : 'DFW')))
  const [priceWarn, setPriceWarn] = useState('')
  const priceNum = Number(priceText)
  const priceReady = fareMessage(priceText) === ''
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [departHour, setDepartHour] = useState(8)
  const [economyMealId, setEconomyMealId] = useState('meal-snack')
  const [cabinMealId, setCabinMealId] = useState('meal-cabin')
  const service = mealById(economyMealId, state.meals).service
  const [bag, setBag] = useState(state.airline.strategy === 'full' || state.airline.strategy === 'premium' ? 0 : 35)
  const [cabin, setCabin] = useState<CabinLayout>('economy')
  const ac = state.fleet.find((a) => a.id === aircraftId)
  const range = ac && origin !== dest ? assessNonstop(ac.typeId, origin, dest) : null
  const blocked = !!range && !range.nonstop
  const [rangeOpen, setRangeOpen] = useState(false)
  const [via, setVia] = useState('')
  const aircraftRef = useRef<HTMLSelectElement>(null)
  const stops = useMemo(() => (ac && blocked ? stopoverChoices(ac.typeId, origin, dest) : []), [ac, blocked, origin, dest])
  const stop = ac && via && via !== 'none' ? assessStop(ac.typeId, origin, via, dest) : null
  const meals = allMeals(state.meals)
  const taken = !!ac && state.routes.some((route) => route.aircraftId === ac.id)
  const filing = ac && !taken ? placeRoute(state, { origin, dest, via: via && via !== 'none' ? via : '', aircraftId: ac.id, frequency, departHour }) : null
  const forecast = useMemo(() => {
    if (!ac) return null
    if (!priceReady) return null
    return forecastLeg(state, { origin, dest, typeId: ac.typeId, price: priceNum, service, baggageFee: bag, cabinLayout: cabin, frequency, condition: ac.condition, economyMealId, cabinMealId: cabin === 'two-class' ? cabinMealId : '' })
  }, [state, ac, origin, dest, priceNum, priceReady, service, bag, cabin, frequency, economyMealId, cabinMealId])

  return (
    <div className="split">
      <Panel title="File a route">
        <div className="form-grid">
          <AirportSelect label="Origin" value={origin} onChange={(next) => { setOrigin(next); setRangeOpen(false); setVia(''); if (next !== dest) { setPriceText(String(suggestedFare(next, dest))); setPriceWarn('') } }} />
          <AirportSelect label="Destination" value={dest} onChange={(next) => { setDest(next); setRangeOpen(false); setVia(''); if (next !== origin) { setPriceText(String(suggestedFare(origin, next))); setPriceWarn('') } }} />
          <label>Aircraft<select ref={aircraftRef} value={aircraftId} onChange={(e) => { setAircraftId(e.target.value); setRangeOpen(false); setVia('') }}>{aircraft.map((a) => { const t = getType(a.typeId); return <option key={a.id} value={a.id}>{a.tailNumber} · {t.manufacturer} {t.model}</option> })}</select></label>
          <label>Fare
            <input type="text" inputMode="decimal" value={priceText} aria-label="Ticket price" onChange={(e) => { setPriceText(e.target.value); setPriceWarn('') }} />
            {priceWarn && <span className="fine bad fare-warn">{priceWarn}</span>}
          </label>
          <label>Frequency<select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="3weekly">Mon Wed Fri</option></select></label>
          <label>Departure<select value={departHour} onChange={(e) => setDepartHour(Number(e.target.value))}>{Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
          <label>Economy meal<select value={economyMealId} onChange={(e) => setEconomyMealId(e.target.value)}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></label>
          {cabin === 'two-class' && <label>Cabin meal<select value={cabinMealId} onChange={(e) => setCabinMealId(e.target.value)}>{meals.filter((meal) => meal.tier !== 'none').map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></label>}
          <label>Bag fee<input type="number" value={bag} min={0} max={80} onChange={(e) => setBag(Number(e.target.value))} /></label>
          <label>Cabin<select value={cabin} onChange={(e) => setCabin(e.target.value as CabinLayout)}><option value="economy">All economy</option><option value="two-class">Two class</option></select></label>
        </div>
        <div className="pair-photos">
          <Photo src={airportImage(origin, 'aerial')} alt={`${origin} satellite`} />
          <Photo src={airportImage(dest, 'aerial')} alt={`${dest} satellite`} />
        </div>
        <p className="fine">Satellite views of the actual fields at {origin} and {dest}.</p>
        {forecast && (
          <div className="forecast">
            <p>{forecast.distanceNm} nm · {forecast.blockHours.toFixed(1)} h block · {forecast.ok ? 'Operable' : forecast.reason}</p>
            <p>Expected {forecast.paxPerLeg} passengers on {forecast.seats} seats ({Math.round(forecast.loadFactor * 100)}% load).</p>
            <p>Contribution {money(forecast.contribution)} per leg before overhead. Fuel {money(forecast.fuel)} · fees {money(forecast.airportFees)} · maintenance {money(forecast.maintenance)} · catering {money(forecast.catering)}.</p>
            {filing && filing.notes.map((note) => <p key={note} className="fine">{note}</p>)}
            {filing && !filing.ok && <p className="bad">{filing.error}</p>}
            {filing && filing.lease.map((offer) => (
              <div key={offer.id} className="btn-row">
                <button type="button" className="btn" onClick={() => onError(actions.lease(offer.id, 'leased') || '')}>Lease {offer.number} at {offer.airportId}</button>
                <button type="button" className="btn" onClick={() => onError(actions.lease(offer.id, 'owned') || '')}>Buy {offer.number}</button>
              </div>
            ))}
            {forecast.competitorName && <p>{forecast.competitorName} is at ${forecast.competitorPrice}.</p>}
            {forecast.notes.map((n) => <p key={n} className="fine">{n}</p>)}
          </div>
        )}
        {rangeOpen && blocked && range && ac && (
          <div className="forecast range-warn">
            <p className="bad">NONSTOP FLIGHT NOT POSSIBLE</p>
            <p>{origin} → {dest}</p>
            <p>Route distance: {range.distanceNm.toLocaleString('en-US')} nm</p>
            <p>Aircraft: {ac.yearBuilt} {getType(ac.typeId).manufacturer} {getType(ac.typeId).model}</p>
            <p>Published range: {range.publishedNm.toLocaleString('en-US')} nm</p>
            <p>Practical range: ~{range.practicalNm.toLocaleString('en-US')} nm</p>
            <p>This aircraft cannot operate this route nonstop. Payload, reserves, and winds sit inside that practical figure.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => {
                const other = aircraft.find((a) => a.id !== ac.id && assessNonstop(a.typeId, origin, dest).nonstop)
                if (other) setAircraftId(other.id)
                setRangeOpen(false)
                setVia('')
                aircraftRef.current?.focus()
              }}>Select different aircraft</button>
              <button type="button" className="btn" onClick={() => setVia(stops[0]?.id || 'none')}>Add stopover</button>
              <button type="button" className="btn" onClick={() => { setRangeOpen(false); setVia('') }}>Cancel</button>
            </div>
            {via && (
              <>
                {stops.length === 0 ? <p>No intermediate airport keeps both legs inside this practical range. A longer-range aircraft is the other way across.</p> : (
                  <label>Stopover
                    <select value={via} onChange={(e) => setVia(e.target.value)}>
                      {stops.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.city} · {s.leg1Nm.toLocaleString('en-US')} + {s.leg2Nm.toLocaleString('en-US')} nm</option>)}
                    </select>
                  </label>
                )}
                {stop?.ok && (
                  <div>
                    <p>{origin} → {via} → {dest}</p>
                    <p>Leg 1: {stop.leg1Nm.toLocaleString('en-US')} nm · Leg 2: {stop.leg2Nm.toLocaleString('en-US')} nm</p>
                    <p>Block time about {stop.blockHours.toFixed(1)} h, plus a turn at {via}. Extra landing and handling. Passengers treat a one-stop as less convenient, so demand is lower than a nonstop.</p>
                    <button type="button" className="btn primary" onClick={() => {
                      const err = fareMessage(priceText)
                      if (err) { setPriceWarn(err); playCue('ui/error/err.wav'); return }
                      const filed = Math.round(priceNum)
                      setPriceWarn(filed > suggestedFare(origin, dest) * 2.5 ? 'This fare is extremely high. Passenger demand may collapse.' : '')
                      const failed = actions.open({ origin, dest, via, aircraftId, price: filed, frequency, service, baggageFee: bag, cabinLayout: cabin, departHour, economyMealId, cabinMealId })
                      if (!failed) { setRangeOpen(false); setVia('') }
                      onError(failed || '')
                    }}>File the stopover</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <button className="btn primary" disabled={!ac || (!!forecast && !forecast.ok && !blocked)} onClick={() => {
          const err = fareMessage(priceText)
          if (err) {
            setPriceWarn(err)
            playCue('ui/error/err.wav')
            return
          }
          if (blocked) {
            setRangeOpen(true)
            setVia('')
            return
          }
          const filed = Math.round(priceNum)
          setPriceWarn(filed > suggestedFare(origin, dest) * 2.5 ? 'This fare is extremely high. Passenger demand may collapse.' : '')
          onError(actions.open({ origin, dest, aircraftId, price: filed, frequency, service, baggageFee: bag, cabinLayout: cabin, departHour, economyMealId, cabinMealId }) || '')
        }}>Open route</button>
      </Panel>
      <Panel title="Your schedule">
        {state.routes.length === 0 && <p className="empty">Nothing is filed.</p>}
        {state.routes.map((r) => {
          const plane = state.fleet.find((a) => a.id === r.aircraftId)
          const type = plane ? getType(plane.typeId) : null
          return (
            <article key={r.id} className="route-row">
              <div>
                <b>{r.via ? `${r.origin} → ${r.via} → ${r.dest}` : `${r.origin} → ${r.dest}`}</b>
                <span>{type && plane ? `${plane.tailNumber} · ${type.manufacturer} ${type.model}` : 'Unassigned'} · {r.frequency} · {mealById(r.economyMealId, state.meals).name} · {String(r.departHour ?? 8).padStart(2, '0')}:00 · {r.gateOrigin || 'no gate'}</span>
              </div>
              <RouteFare routeId={r.id} price={r.price} origin={r.origin} dest={r.dest} />
              <button className="btn tiny danger" onClick={() => actions.closeRoute(r.id)}>Close</button>
            </article>
          )
        })}
      </Panel>
    </div>
  )
}

function Airports({ state }: { state: GameState }) {
  const [id, setId] = useState(state.airline.home)
  const [q, setQ] = useState('')
  const [theater, setTheater] = useState('All')
  const [level, setLevel] = useState<'city' | 'airport' | 'ops'>('airport')
  const ap = getAirport(id)
  const query = q.trim().toLowerCase()
  const list = AIRPORTS.filter((a) => (theater === 'All' || a.theater === theater) && (!query || `${a.id} ${a.icao} ${a.city} ${a.name} ${a.country}`.toLowerCase().includes(query)))
  const planes = state.fleet.filter((a) => a.location === ap.id && a.status !== 'lost')
  return (
    <div className="split wide">
      <div>
        <div className="filter-row">
          <input value={q} placeholder="Search city, code, country" onChange={(e) => setQ(e.target.value)} />
          <select value={theater} onChange={(e) => setTheater(e.target.value)}>
            <option value="All">All regions</option>
            {THEATERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="card-list">
          {list.map((a) => (
            <button key={a.id} className={`fleet-card ${a.id === id ? 'on' : ''}`} onClick={() => setId(a.id)}>
              <Photo src={airportThumb(a.id)} alt={`${a.id} satellite`} />
              <div><b>{a.city}</b><span>{a.id} / {a.icao}</span><em>{a.size} · {a.country}</em></div>
            </button>
          ))}
          {list.length === 0 && <p className="empty">No airport matches that search.</p>}
        </div>
      </div>
      <Panel title={`${ap.name}`} aside={<Tag>{ap.id} / {ap.icao}</Tag>}>
        <div className="zoom-row">
          <button type="button" className={level === 'city' ? 'on' : ''} onClick={() => setLevel('city')}>City</button>
          <button type="button" className={level === 'airport' ? 'on' : ''} onClick={() => setLevel('airport')}>Airport</button>
          <button type="button" className={level === 'ops' ? 'on' : ''} onClick={() => setLevel('ops')}>Operations</button>
        </div>
        <AirportSatMap airport={ap} zoom={viewZoom(ap, level)} planes={planes} color={state.airline.color} />
        <p className="fine">Esri World Imagery centered on {ap.lat.toFixed(4)}, {ap.lon.toFixed(4)}. This is the real airfield, not a generated layout.</p>
        <p className="lede">{ap.blurb}</p>
        <div className="kpis compact">
          <Kpi label="Passengers" value={String(ap.demand)} note="demand index" />
          <Kpi label="Business" value={String(ap.business)} note="index" />
          <Kpi label="Tourism" value={String(ap.tourism)} note="index" />
          <Kpi label="Cargo" value={String(ap.cargo)} note="index" />
          <Kpi label="Fees" value={ap.feeIndex.toFixed(2)} note="index" />
          <Kpi label="Your slots" value={String(ap.playerSlots + (state.market.slotBonus[ap.id] ?? 0))} note="daily pairs" />
          <Kpi label="Congestion" value={ap.congestion.toFixed(2)} note="index" />
          <Kpi label="Hub potential" value={String(ap.hubPotential)} note={ap.theater} />
          <Kpi label="Runway" value={`${ap.runwayFt.toLocaleString('en-US')} ft`} note={ap.country} />
        </div>
      </Panel>
    </div>
  )
}

function AirportSelect({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const options = AIRPORTS.filter((a) => a.id === value || !query || `${a.id} ${a.icao} ${a.city} ${a.name} ${a.country}`.toLowerCase().includes(query))
  return (
    <label>{label}
      <input value={q} placeholder="Search city or code" onChange={(e) => setQ(e.target.value)} />
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.city}</option>)}
      </select>
    </label>
  )
}

function Finance({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const [principal, setPrincipal] = useState(2_000_000)
  const [months, setMonths] = useState(60)
  const [kind, setKind] = useState<'amortizing' | 'bullet'>('amortizing')
  const offer = loanOffer(state.finance.credit, state.market.interestBump, principal, months, kind)
  const report = state.lastReport
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Cash" value={money(state.finance.cash)} note="on hand" />
        <Kpi label="Lifetime revenue" value={money(state.finance.lifetimeRevenue)} note="since founding" />
        <Kpi label="Lifetime cost" value={money(state.finance.lifetimeExpenses)} note="since founding" />
        <Kpi label="Overdue" value={String(state.finance.overdue)} note="misses before bankruptcy: 3" />
      </div>
      <div className="split">
        <Panel title="Borrow">
          <p className="fine">Credit is {state.finance.credit}. A bullet loan must be repaid in full on the maturity date. There is no automatic rescue.</p>
          <div className="form-grid">
            <label>Principal<input type="number" value={principal} step={250000} onChange={(e) => setPrincipal(Number(e.target.value))} /></label>
            <label>Months<input type="number" value={months} min={12} max={120} onChange={(e) => setMonths(Number(e.target.value))} /></label>
            <label>Structure<select value={kind} onChange={(e) => setKind(e.target.value as 'amortizing' | 'bullet')}><option value="amortizing">Amortizing</option><option value="bullet">Bullet</option></select></label>
          </div>
          <p>{offer.allowed ? `${(offer.rate * 100).toFixed(1)}% · payment ${money(offer.payment)} per month` : 'This principal is above your credit limit.'}</p>
          <button className="btn primary" disabled={!offer.allowed} onClick={() => onError(actions.borrow(principal, months, kind) || '')}>Draw the loan</button>
          <button className="btn" onClick={() => onError(actions.ads() || '')}>Run a $75,000 campaign</button>
        </Panel>
        <Panel title={report ? `Daily report · ${report.dateLabel}` : 'Daily report'}>
          {!report ? <p className="empty">Operate a day to see the books.</p> : (
            <table className="table">
              <tbody>
                {Object.entries(report.breakdown).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td className={k === 'tickets' || k === 'baggage' || k === 'cargo' ? 'good' : ''}>{money(v)}</td></tr>
                ))}
                <tr><td>Net</td><td className={report.profit >= 0 ? 'good' : 'bad'}>{money(report.profit)}</td></tr>
              </tbody>
            </table>
          )}
        </Panel>
      </div>
      <Panel title="Loans">
        {state.loans.length === 0 && <p className="empty">No debt. That can be wisdom or a lack of airplanes.</p>}
        {state.loans.map((l) => (
          <article key={l.id} className="route-row">
            <div>
              <b>{l.name}</b>
              <span>{l.kind} · {(l.rate * 100).toFixed(1)}% · due day {l.maturityDay} · balance {money(l.balance)}</span>
            </div>
            <button className="btn tiny" onClick={() => onError(actions.payLoan(l.id, Math.min(l.balance, 500_000)) || '')}>Pay $500k</button>
          </article>
        ))}
      </Panel>
    </div>
  )
}

function Crew({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const ownedTypes = [...new Set(state.fleet.map((a) => a.typeId))]
  const typeChoices = [...new Set([...forSaleTypes().map((a) => a.id), ...ownedTypes, ...state.pilots.map((p) => p.typeId)])]
  const [typeId, setTypeId] = useState(typeChoices[0] ?? forSaleTypes()[0].id)
  const [openId, setOpenId] = useState<string | null>(null)
  const need = cabinRequired(state)
  const cabin = state.cabinCrew ?? 0
  const pilotsHere = state.pilots.filter((p) => p.typeId === typeId).length
  const aircraftHere = state.fleet.filter((a) => a.typeId === typeId && a.status !== 'lost' && a.status !== 'stored' && state.routes.some((r) => r.aircraftId === a.id)).length
  const open = state.pilots.find((p) => p.id === openId) ?? null
  const openFace = open ? pilotIdentity(open.portraitId) : undefined
  return (
    <Panel title="Crew" aside={<button className="btn tiny" onClick={() => onError(actions.hire(typeId) || '')}>Hire {getType(typeId).model}</button>}>
      <p className="fine">Two type-rated pilots are the legal minimum for a departure. Four, plus a spare cabin crew, is a normal reserve. Fatigue and a thin roster raise operational risk. They do not cause an accident by themselves.</p>
      <p className="lede">
        Cabin crew {cabin}{need > 0 ? ` · minimum on today’s schedule ${need}` : ''}
        {need > 0 && cabin < need ? ' · below minimum' : need > 0 && cabin < need * 2 ? ' · no spare crew' : ''}
        {aircraftHere > 0 ? ` · ${getType(typeId).model} pilots ${pilotsHere} for ${aircraftHere} flying` : ''}
      </p>
      <div className="btn-row">
        <button className="btn tiny" onClick={() => onError(actions.hireCabin() || '')}>Hire cabin crew</button>
        <button className="btn tiny" onClick={() => onError(actions.releaseCabin() || '')}>Release one</button>
      </div>
      <label className="inline">Type rating
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {typeChoices.map((id) => <option key={id} value={id}>{getType(id).model}</option>)}
        </select>
      </label>
      {open && (
        <div className="crew-detail">
          {openFace && <img src={openFace.portrait} alt="" width={240} height={300} decoding="async" />}
          <div>
            <b>{open.name}</b>
            <span>{open.gender} · {open.age}</span>
            <span>{open.hours.toLocaleString('en-US')} flight hours</span>
            <span>{experienceLabel(open.hours)}</span>
            <span>Skill: {Math.round(open.training)}</span>
            <span className={open.fatigue > 75 ? 'bad' : ''}>Fatigue: {fatigueLabel(open.fatigue)}</span>
            <span>Salary: {money(open.salaryMonthly * 12)}</span>
            <span>Status: {pilotStatus(open.fatigue)}</span>
            <span>Reliability: {Math.round(open.reliability)}</span>
            <span>Morale: {Math.round(open.morale)}</span>
            <span>{getType(open.typeId).manufacturer} {getType(open.typeId).model}</span>
            <span>{(open.certifications ?? []).join(' · ')}</span>
          </div>
        </div>
      )}
      <div className="crew-list">
        {state.pilots.map((p) => {
          const face = pilotIdentity(p.portraitId)
          return (
            <div key={p.id} className={p.id === openId ? 'crew-card on' : 'crew-card'}>
              <button type="button" className="crew-open" onClick={() => setOpenId(p.id === openId ? null : p.id)}>
                {face && <img src={face.thumb} alt="" width={72} height={90} loading="lazy" decoding="async" />}
                <span>
                  <b>{p.name}</b>
                  <em>{p.gender} · {p.age}</em>
                  <em>{p.hours.toLocaleString('en-US')} flight hours</em>
                  <em>{experienceLabel(p.hours)}</em>
                  <em>Skill: {Math.round(p.training)}</em>
                  <em className={p.fatigue > 75 ? 'bad' : ''}>Fatigue: {fatigueLabel(p.fatigue)}</em>
                  <em>Salary: {money(p.salaryMonthly * 12)}</em>
                  <em>Status: {pilotStatus(p.fatigue)}</em>
                </span>
              </button>
              <button className="btn tiny" onClick={() => onError(actions.releasePilot(p.id) || '')}>Release</button>
            </div>
          )
        })}
      </div>
      {state.pilots.length === 0 && <p className="empty">No pilots until an aircraft is delivered. Cabin crew can be hired on their own.</p>}
    </Panel>
  )
}

function Rivals({ state }: { state: GameState }) {
  return (
    <div className="rival-grid">
      {state.rivals.map((r) => (
        <Panel key={r.id} title={r.name} aside={<Tag>{r.alive ? r.strategy : 'bankrupt'}</Tag>}>
          <p className="lede" style={{ borderTop: `3px solid ${r.color}` }}>{r.iata} · {getAirport(r.home).city} · reputation {Math.round(r.reputation)}</p>
          <p>Cash {money(r.cash)} · debt {money(r.debt)}</p>
          <p>{r.fleet.map((f) => `${f.count}× ${getType(f.typeId).model}`).join(', ') || 'No fleet'}</p>
          <ul className="history">
            {r.routes.map((route, i) => <li key={i}>{route.origin}–{route.dest} · ${route.price} · {route.dailySeats} seats</li>)}
          </ul>
        </Panel>
      ))}
    </div>
  )
}

function News({ state }: { state: GameState }) {
  return (
    <div className="news-grid">
      {state.news.map((n) => (
        <article key={n.id} className="news-card">
          <Photo src={n.image} alt="" />
          <div>
            <Tag>{n.tag}</Tag>
            <h3>{n.headline}</h3>
            <p>{n.body}</p>
            <span className="fine">{formatDate(n.day)}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function EventModal({ state }: { state: GameState }) {
  const ev = state.pending
  if (!ev) return null
  return (
    <div className="modal-back">
      <button type="button" className="modal-x" aria-label="Close" onClick={() => actions.dismissTop()}>×</button>
      <div className="modal">
        <Photo src={ev.image} alt="" />
        <div className="modal-body">
          <p className="eyebrow">Operations wire</p>
          <h2>{ev.title}</h2>
          <p>{ev.body}</p>
          <div className="choices">
            {ev.choices.map((c) => (
              <button key={c.id} className="choice" onClick={() => actions.choose(c.id)}>
                <b>{c.label}</b>
                <span>{c.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FaultModal({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const fault = state.faults.find((f) => f.id === state.faultPrompt?.faultId)
  const ac = state.fleet.find((a) => a.id === fault?.aircraftId)
  if (!fault || !ac) return null
  const type = getType(ac.typeId)
  return (
    <div className="modal-back">
      <button type="button" className="modal-x" aria-label="Close" onClick={() => actions.dismissTop()}>×</button>
      <div className="modal">
        <Photo src={aircraftImage(type, 'maintenance')} alt="Maintenance" />
        <div className="modal-body">
          <p className="eyebrow">Dispatch decision · {ac.tailNumber} · {type.manufacturer} {type.model}</p>
          <h2>{fault.title}</h2>
          <p>{fault.detail}</p>
          <div className="choices">
            <button className="choice" onClick={() => onError(actions.fault(fault.id, 'repair') || '')}><b>Repair · {money(fault.repairCost)}</b><span>Ground the aircraft for {fault.groundDays} days. Safety holds.</span></button>
            <button className="choice" onClick={() => { onError(actions.fault(fault.id, 'cancel') || ''); }}><b>Cancel today’s flying</b><span>Short-term loss. If this is a real defect, trust holds up better than a departure.</span></button>
            <button className="choice" onClick={() => onError(actions.fault(fault.id, 'defer') || '')}><b>Defer</b><span>The defect gets worse, and the maintenance record keeps the risk.</span></button>
            <button className="choice" onClick={() => onError(actions.fault(fault.id, 'fly') || '')}><b>Dispatch anyway</b><span>Cheaper today. On an older aircraft, ignored warnings compound.</span></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MergerModal({ state, onError }: { state: GameState; onError: (s: string) => void }) {
  const offer = state.merger
  const rival = state.rivals.find((r) => r.id === offer?.rivalId)
  if (!offer || !rival) return null
  const count = rival.fleet.reduce((a, f) => a + f.count, 0)
  return (
    <div className="modal-back">
      <button type="button" className="modal-x" aria-label="Close" onClick={() => actions.dismissTop()}>×</button>
      <div className="modal">
        <Photo src={SCENE.merger} alt="Two aircraft at an airport" />
        <div className="modal-body">
          <p className="eyebrow">Deal desk</p>
          <h2>{rival.name}</h2>
          <p>Cash {money(rival.cash)}. Debt {money(rival.debt)}. Fleet {count}. Routes {rival.routes.length}. Reputation {Math.round(rival.reputation)}.</p>
          <p>A merger is not a prize. You inherit the airplanes, the people problems, and the debt. The debt is a bullet note.</p>
          <div className="choices">
            <button className="choice" onClick={() => onError(actions.merger('buy') || '')}><b>Buy · {money(offer.ask)}</b><span>Pay the ask. Take the fleet and the debt.</span></button>
            <button className="choice" onClick={() => onError(actions.merger('merge') || '')}><b>Merge</b><span>No purchase price. Their cash and their entire debt become yours.</span></button>
            <button className="choice" onClick={() => onError(actions.merger('reject') || '')}><b>Reject</b><span>Walk away.</span></button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GameOver({ state }: { state: GameState }) {
  return (
    <div className="create">
      <Photo src={state.meta.gameOverImage || SCENE.recession} alt="" className="create-photo" />
      <div className="create-scrim">
        <div className="create-copy">
          <p className="eyebrow">Game over</p>
          <h1>Your airline has entered bankruptcy proceedings.</h1>
          <p>{state.meta.gameOverReason}</p>
          <p className="fine">Cash {money(state.finance.cash)} · debt {money(debtBalance(state))} · brand {Math.round(state.reputation.brand)} · {formatDate(state.meta.day)}</p>
          <button className="btn primary" onClick={() => { clearSave(); window.location.reload() }}>Start another airline</button>
        </div>
      </div>
    </div>
  )
}
