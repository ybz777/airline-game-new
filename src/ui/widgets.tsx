import type { ReactNode } from 'react'
import { money, moneyExact, pct } from '../sim/util'

export function Photo({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`photo ${className}`}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  )
}

export function Money({ n, signed = false }: { n: number; signed?: boolean }) {
  const text = signed ? `${n > 0 ? '+' : ''}${money(n)}` : money(n)
  const cls = n > 0 ? 'good' : n < 0 ? 'bad' : ''
  return <span className={cls}>{text.replace('+', n > 0 && signed ? '+' : '')}</span>
}

export function Exact({ n }: { n: number }) {
  return <span className={n < 0 ? 'bad' : ''}>{moneyExact(n)}</span>
}

export function Bar({ value, tone = 'brass' }: { value: number; tone?: 'brass' | 'good' | 'bad' }) {
  return (
    <div className="bar">
      <span className={tone} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Panel({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <header className="panel-h">
          {title && <h2>{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>
}

export function Spark({ values }: { values: number[] }) {
  const data = values.slice(-28)
  const min = Math.min(0, ...data)
  const max = Math.max(0, ...data)
  const span = max - min || 1
  return (
    <div className="spark" aria-hidden>
      {data.map((v, i) => (
        <i key={i} className={v >= 0 ? 'good' : 'bad'} style={{ height: `${8 + (Math.abs(v - min) / span) * 92}%` }} />
      ))}
    </div>
  )
}

export function Mark({ code, color }: { code: string; color: string }) {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="8" fill="#121820" />
      <path d="M8 40h48" stroke={color} strokeWidth="2" />
      <text x="32" y="34" textAnchor="middle" fill={color} fontSize="16" fontFamily="IBM Plex Sans Condensed, sans-serif">{code.slice(0, 3)}</text>
    </svg>
  )
}

export function pctText(n: number) {
  return pct(n * 100)
}

export function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <b>{value}</b>
      <em>{note}</em>
    </div>
  )
}
