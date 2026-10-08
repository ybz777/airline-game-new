export function distanceNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3440.065
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const la1 = rad(a.lat)
  const la2 = rad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function blockHours(distNm: number, speedKt: number): number {
  return distNm / Math.max(180, speedKt) + 0.55
}

export function arc(a: { lat: number; lon: number }, b: { lat: number; lon: number }, n = 28): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i <= n; i++) points.push(interpolate(a, b, i / n))
  return points
}

export function interpolate(a: { lat: number; lon: number }, b: { lat: number; lon: number }, t: number): [number, number] {
  const toV = (p: { lat: number; lon: number }) => {
    const lat = rad(p.lat)
    const lon = rad(p.lon)
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
  }
  const va = toV(a)
  const vb = toV(b)
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))
  const omega = Math.acos(dot)
  if (omega < 1e-6) return [a.lat, a.lon]
  const s = Math.sin(omega)
  const w1 = Math.sin((1 - t) * omega) / s
  const w2 = Math.sin(t * omega) / s
  const x = w1 * va[0] + w2 * vb[0]
  const y = w1 * va[1] + w2 * vb[1]
  const z = w1 * va[2] + w2 * vb[2]
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI
  const lon = Math.atan2(y, x) * 180 / Math.PI
  return [lat, lon]
}

function rad(d: number): number {
  return (d * Math.PI) / 180
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-')
}
