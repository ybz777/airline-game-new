/** Neutral market photographs. Owned aircraft do not use these. */
export const READY_TYPES = ['b737-400', 'b737-500', 'b737-700', 'a321', 'b757-300', 'fokker100']

function shots(id: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `/assets/aircraft/${id}/market-${i + 1}.jpg`)
}

export function galleryFor(typeId: string, own?: string): string[] {
  const extra = MARKET_PHOTOS[typeId] ?? []
  const exterior = `/assets/aircraft/${typeId}/exterior.jpg`
  const all = [own, ...extra, exterior].filter((src): src is string => !!src && src.length > 0)
  return [...new Set(all)].slice(0, 5)
}

export const MARKET_PHOTOS: Record<string, string[]> = {
  'b737-300': shots('b737-300', 4),
  'b737-800': shots('b737-800', 4),
  a320: shots('a320', 4),
  'md-82': shots('md-82', 4),
  'b737-400': ['/assets/aircraft/b737-400/exterior.jpg'],
  'b737-500': ['/assets/aircraft/b737-500/exterior.jpg'],
  'b737-700': ['/assets/aircraft/b737-700/exterior.jpg'],
  a321: ['/assets/aircraft/a321/exterior.jpg'],
  'b757-300': ['/assets/aircraft/b757-300/exterior.jpg'],
  fokker100: ['/assets/aircraft/fokker100/exterior.jpg'],
}
