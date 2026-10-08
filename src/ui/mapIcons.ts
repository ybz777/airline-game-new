import L from 'leaflet'
import type { AircraftType } from '../types'

type Kind = 'b737' | 'a320' | 'b757' | 'b767' | 'b777' | 'b787' | 'a350' | 'b747' | 'a380' | 'trijet' | 'crj' | 'ttail' | 'ejet' | 'atr' | 'bae'

function kindOf(type: AircraftType): Kind {
  const f = type.family
  if (f.startsWith('737')) return 'b737'
  if (f === 'a340') return 'b747'
  if (f.startsWith('a320') || f === 'a220') return 'a320'
  if (f === '757') return 'b757'
  if (f === '747') return 'b747'
  if (f === 'a380') return 'a380'
  if (f === '777') return 'b777'
  if (f === '787') return 'b787'
  if (f === 'a350') return 'a350'
  if (f === '767' || f === 'a330' || f === 'a330neo' || f === 'a300') return 'b767'
  if (f === 'md11' || f === 'dc10') return 'trijet'
  if (f === 'crj') return 'crj'
  if (f === 'ejet') return 'ejet'
  if (f === '727' || f === 'dc9' || f === 'md80' || f === 'fokker') return 'ttail'
  if (f === 'bae146') return 'bae'
  if (f === 'atr' || f === 'dash8' || f === 'saab' || type.category === 'turboprop') return 'atr'
  if (type.engines >= 4) return 'b747'
  if (type.category === 'widebody') return 'b767'
  if (type.category === 'regional') return 'crj'
  return 'b737'
}

/** Top-down outlines, nose toward the top of the viewBox. */
const SHAPE: Record<Kind, string> = {
  b737: `
    <path d="M24 2.2c1.7 0 2.6 2.2 2.6 5.4v27.2c0 2.8-1.1 5.4-2.6 6-1.5-.6-2.6-3.2-2.6-6V7.6c0-3.2.9-5.4 2.6-5.4z"/>
    <path d="M3.2 20.6 24 15.6l20.8 5-2.6 4.4L24 21.2 5.8 25z"/>
    <path d="M3.2 20.6 1.2 15.2l3.2.8zM44.8 20.6 46.8 15.2l-3.2.8z"/>
    <ellipse cx="11.2" cy="21.4" rx="1.7" ry="3.3"/>
    <ellipse cx="36.8" cy="21.4" rx="1.7" ry="3.3"/>
    <path d="M17.6 36.2 24 34.2l6.4 2-1.8 1.6L24 36.4l-4.6 1.4z"/>`,
  a320: `
    <path d="M24 3.2c2.2 0 3.3 2.4 3.3 5.6v25.4c0 3-1.4 5.6-3.3 6.2-1.9-.6-3.3-3.2-3.3-6.2V8.8c0-3.2 1.1-5.6 3.3-5.6z"/>
    <path d="M2.4 24.8 24 22.6 45.6 24.8l-1.8 3.6L24 26.6 4.2 28.4z"/>
    <path d="M2.4 24.8.4 29.2l3.4-.6zM45.6 24.8 47.6 29.2l-3.4-.6z"/>
    <ellipse cx="11.4" cy="26.6" rx="1.8" ry="2.8"/>
    <ellipse cx="36.6" cy="26.6" rx="1.8" ry="2.8"/>
    <path d="M18.2 35.6 24 33.8l5.8 1.8-1.6 1.5L24 35.8l-4.2 1.3z"/>`,
  b757: `
    <path d="M24 1.2c1.5 0 2.3 2 2.3 5v34.2c0 2.6-1 5-2.3 5.6-1.3-.6-2.3-3-2.3-5.6V6.2c0-3 .8-5 2.3-5z"/>
    <path d="M4 22.4 24 18.2 44 22.4l-2.4 4.2L24 23.4 6.4 26.6z"/>
    <ellipse cx="11" cy="23.2" rx="2.1" ry="3.8"/>
    <ellipse cx="37" cy="23.2" rx="2.1" ry="3.8"/>
    <path d="M17.2 39.4 24 37.2l6.8 2.2-1.8 1.6L24 39.6l-4.8 1.4z"/>`,
  b767: `
    <path d="M24 3c2.3 0 3.6 2.4 3.6 6v26.2c0 3.2-1.5 6-3.6 6.6-2.1-.6-3.6-3.4-3.6-6.6V9c0-3.6 1.3-6 3.6-6z"/>
    <path d="M2.2 22.2 24 17.4 45.8 22.2l-2.8 4.8L24 23.2 5 27z"/>
    <ellipse cx="11.6" cy="23" rx="2.2" ry="3.6"/>
    <ellipse cx="36.4" cy="23" rx="2.2" ry="3.6"/>
    <path d="M16.4 36.8 24 34.4l7.6 2.4-2 1.8L24 37l-5.6 1.6z"/>`,
  b777: `
    <path d="M24 1.4c2.1 0 3.2 2.2 3.2 5.6V40c0 3-1.4 5.6-3.2 6.2-1.8-.6-3.2-3.2-3.2-6.2V7c0-3.4 1.1-5.6 3.2-5.6z"/>
    <path d="M1.4 21.2 24 16.2 46.6 21.2 43.4 26.4 24 22.2 4.6 26.4z"/>
    <path d="M1.4 21.2 4.8 27.2 6.2 24.6zM46.6 21.2 43.2 27.2 41.8 24.6z"/>
    <ellipse cx="11.2" cy="22.6" rx="2.6" ry="4.4"/>
    <ellipse cx="36.8" cy="22.6" rx="2.6" ry="4.4"/>
    <path d="M16 40.2 24 37.6l8 2.6-2.2 1.8L24 40.4l-5.8 1.6z"/>`,
  b787: `
    <path d="M24 2c1.5 0 2.4 2.2 2.4 5.6v30.6c0 2.8-1 5.4-2.4 6-1.4-.6-2.4-3.2-2.4-6V7.6c0-3.4.9-5.6 2.4-5.6z"/>
    <path d="M2.6 20.4 24 16.8 45.4 20.4 40.2 27.6 24 22.6 7.8 27.6z"/>
    <ellipse cx="12.4" cy="22.8" rx="1.9" ry="3.5"/>
    <ellipse cx="35.6" cy="22.8" rx="1.9" ry="3.5"/>
    <path d="M17.4 38.4 24 36.2l6.6 2.2-1.6 1.5L24 38.6l-4.8 1.3z"/>`,
  a350: `
    <path d="M24 2.4c2.4 0 3.5 2.6 3.5 6.2v29.2c0 3.2-1.5 6-3.5 6.6-2-.6-3.5-3.4-3.5-6.6V8.6c0-3.6 1.1-6.2 3.5-6.2z"/>
    <path d="M2 19.6C10 22 18 18.4 24 17.2 30 18.4 38 22 46 19.6 42.4 26.8 32 24.2 24 22.4 16 24.2 5.6 26.8 2 19.6z"/>
    <ellipse cx="12.2" cy="22.2" rx="2" ry="3.4"/>
    <ellipse cx="35.8" cy="22.2" rx="2" ry="3.4"/>
    <path d="M16.8 38.6 24 36.2l7.2 2.4-1.8 1.6L24 38.8l-5.4 1.4z"/>`,
  b747: `
    <path d="M24 1.6c3.4 0 5.2 2.4 5.2 6.2 0 2.4-.8 3.8-1.8 4.6V38c0 3.2-1.4 6-3.4 6.6-2-.6-3.4-3.4-3.4-6.6V12.4c-1-.8-1.8-2.2-1.8-4.6 0-3.8 1.8-6.2 5.2-6.2z"/>
    <path d="M1 20.4 24 15.2 47 20.4l-3 5.2L24 21.6 4 25.6z"/>
    <ellipse cx="9.2" cy="21.6" rx="1.7" ry="3"/>
    <ellipse cx="15.4" cy="20.2" rx="1.7" ry="3"/>
    <ellipse cx="32.6" cy="20.2" rx="1.7" ry="3"/>
    <ellipse cx="38.8" cy="21.6" rx="1.7" ry="3"/>
    <path d="M15.2 39.2 24 36.4l8.8 2.8-2.2 1.8L24 39.4l-6.6 1.6z"/>`,
  a380: `
    <path d="M24 2.2c3.6 0 5.4 2.8 5.4 7.2v27.2c0 3.8-2.2 6.8-5.4 7.4-3.2-.6-5.4-3.6-5.4-7.4V9.4c0-4.4 1.8-7.2 5.4-7.2z"/>
    <path d="M.6 21.2 24 16.4 47.4 21.2l-3.2 5.4L24 22.6 3.8 26.6z"/>
    <ellipse cx="8.4" cy="22.4" rx="1.8" ry="3.1"/>
    <ellipse cx="14.8" cy="20.8" rx="1.8" ry="3.1"/>
    <ellipse cx="33.2" cy="20.8" rx="1.8" ry="3.1"/>
    <ellipse cx="39.6" cy="22.4" rx="1.8" ry="3.1"/>
    <path d="M14.4 39.6 24 36.6l9.6 3-2.4 1.8L24 39.8l-7.2 1.6z"/>`,
  trijet: `
    <path d="M24 2.6c2.4 0 3.6 2.4 3.6 6v28.4c0 3.2-1.5 6-3.6 6.6-2.1-.6-3.6-3.4-3.6-6.6V8.6c0-3.6 1.2-6 3.6-6z"/>
    <path d="M2.4 22 24 17.6 45.6 22l-2.8 4.8L24 23.2 5.2 26.8z"/>
    <ellipse cx="12" cy="23" rx="2.1" ry="3.5"/>
    <ellipse cx="36" cy="23" rx="2.1" ry="3.5"/>
    <ellipse cx="24" cy="40.2" rx="1.7" ry="3.2"/>
    <path d="M16.6 36.2 24 34.2l7.4 2-1.6 1.4L24 36.4 18.2 37.6z"/>`,
  crj: `
    <path d="M24 8.4c1.5 0 2.3 2 2.3 4.6v18.2c0 2.6-1 4.8-2.3 5.4-1.3-.6-2.3-2.8-2.3-5.4V13c0-2.6.8-4.6 2.3-4.6z"/>
    <path d="M7.2 22.4 24 19.8 40.8 22.4l-2 3.2L24 23.6 9.2 25.6z"/>
    <ellipse cx="21.2" cy="30.6" rx="1.5" ry="2.8"/>
    <ellipse cx="26.8" cy="30.6" rx="1.5" ry="2.8"/>
    <path d="M17.6 35.2h12.8l-1.4 1.6H19z"/>`,
  ttail: `
    <path d="M24 4.2c1.6 0 2.5 2.2 2.5 5.2v26.4c0 2.8-1.1 5.2-2.5 5.8-1.4-.6-2.5-3-2.5-5.8V9.4c0-3 .9-5.2 2.5-5.2z"/>
    <path d="M6.4 22.8 24 19.6 41.6 22.8l-2.2 3.6L24 24.2 8.6 26.4z"/>
    <ellipse cx="20.6" cy="33.4" rx="1.6" ry="3.1"/>
    <ellipse cx="27.4" cy="33.4" rx="1.6" ry="3.1"/>
    <path d="M15.2 40.6h17.6l-1.2 1.8H16.4z"/>`,
  ejet: `
    <path d="M24 6.2c1.6 0 2.5 2.2 2.5 5v22.6c0 2.6-1.1 5-2.5 5.6-1.4-.6-2.5-3-2.5-5.6V11.2c0-2.8.9-5 2.5-5z"/>
    <path d="M6 23.2 24 20.4 42 23.2l-2.2 3.6L24 24.8 8.2 26.8z"/>
    <ellipse cx="13.2" cy="24.4" rx="1.5" ry="2.6"/>
    <ellipse cx="34.8" cy="24.4" rx="1.5" ry="2.6"/>
    <path d="M18.4 35.4 24 33.6l5.6 1.8-1.4 1.4L24 35.6l-4.2 1.2z"/>`,
  atr: `
    <path d="M24 6.4c1.3 0 2 2 2 4.6v26.2c0 2.4-.9 4.6-2 5.2-1.1-.6-2-2.8-2-5.2V11c0-2.6.7-4.6 2-4.6z"/>
    <path d="M1.6 16.8h44.8l-.6 3.4H2.2z"/>
    <circle cx="12.4" cy="18.4" r="3.1" fill="none"/>
    <circle cx="35.6" cy="18.4" r="3.1" fill="none"/>
    <path d="M18.6 38.2 24 36.4l5.4 1.8-1.4 1.4L24 38.4l-4 1.2z"/>`,
  bae: `
    <path d="M24 7c1.8 0 2.8 2.2 2.8 5v20.4c0 2.8-1.2 5.2-2.8 5.8-1.6-.6-2.8-3-2.8-5.8V12c0-2.8 1-5 2.8-5z"/>
    <path d="M3.2 16.2h41.6l-.8 3.6H4z"/>
    <ellipse cx="10" cy="19.2" rx="1.4" ry="2.2"/>
    <ellipse cx="16.2" cy="18.4" rx="1.4" ry="2.2"/>
    <ellipse cx="31.8" cy="18.4" rx="1.4" ry="2.2"/>
    <ellipse cx="38" cy="19.2" rx="1.4" ry="2.2"/>
    <path d="M18.2 35.6 24 33.8l5.8 1.8-1.4 1.4L24 35.8l-4.4 1.2z"/>`,
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch)
}

function safeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#e6edf5'
}

function glyphPx(zoom: number): number {
  if (zoom <= 3) return 13
  if (zoom <= 5) return 16
  if (zoom <= 7) return 19
  return 22
}

function planeSvg(kind: Kind, px: number, heading: number, color: string): string {
  return `<svg width="${px}" height="${px}" viewBox="0 0 48 48" style="transform:rotate(${heading.toFixed(1)}deg)" aria-hidden="true"><g fill="${color}" stroke="#f4f7fb" stroke-width="1.15" stroke-linejoin="round">${SHAPE[kind]}</g></svg>`
}

export function airportIcon(code: string, home: boolean, zoom: number): L.DivIcon {
  const px = zoom <= 3 ? 11 : zoom <= 6 ? 13 : 15
  const mark = home
    ? `<svg width="${px}" height="${px}" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="#1a140c" stroke="#f0d7a4" stroke-width="1.6"/><path d="M8 3.1v9.8M3.4 8h9.2M5.1 4.7l5.8 6.6" fill="none" stroke="#f0d7a4" stroke-width="1.05"/></svg>`
    : `<svg width="${px}" height="${px}" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.1" fill="rgba(8,12,18,.9)" stroke="#d5deea" stroke-width="1.15"/><path d="M8 3.3v9.4M3.6 8h8.8" fill="none" stroke="#f4f7fb" stroke-width="1.05"/></svg>`
  const width = px + 4 + Math.max(22, code.length * 7)
  const height = Math.max(px, 14)
  return L.divIcon({
    className: `airport-code${home ? ' home' : ''}`,
    html: `<div class="apt-mark${home ? ' home' : ''}">${mark}<span>${esc(code)}</span></div>`,
    iconSize: [width, height],
    iconAnchor: [px / 2, height / 2],
  })
}

export function aircraftIcon(type: AircraftType, opts: { color: string; zoom: number; heading: number; label: string; parked: boolean; slot: number }): L.DivIcon {
  const px = glyphPx(opts.zoom)
  const color = safeColor(opts.color)
  const svg = planeSvg(kindOf(type), px, opts.parked ? -28 : opts.heading, color)
  const label = esc(opts.label)
  if (opts.parked) {
    const width = px + 3 + label.length * 5.6
    const height = Math.max(px, 12)
    const lift = 18 + opts.slot * (height + 6)
    return L.divIcon({
      className: 'plane-pin',
      html: `<div class="ac-mark parked"><em>${label}</em>${svg}</div>`,
      iconSize: [width, height],
      iconAnchor: [width - 2, height + lift],
    })
  }
  const width = px + 3 + label.length * 5.6
  return L.divIcon({
    className: 'plane-pin',
    html: `<div class="ac-mark">${svg}<em>${label}</em></div>`,
    iconSize: [width, px],
    iconAnchor: [px / 2, px / 2],
  })
}
