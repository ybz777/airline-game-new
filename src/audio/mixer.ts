const KEY = 'airline96.audio'
const ROOT = '/assets/audio/'

export interface Mix {
  master: number
  music: number
  sfx: number
  muted: boolean
}

const listeners = new Set<() => void>()
let mix: Mix = loadMix()
let unlocked = false
let started = false
const slots: Record<string, HTMLAudioElement> = {}
let lastCue = ''

type Scene = {
  music: 'menu' | 'game'
  place: 'menu' | 'game'
  weather: 'none' | 'rain' | 'wind' | 'storm'
}

let scene: Scene = { music: 'game', place: 'game', weather: 'none' }

function loadMix(): Mix {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { master: 0.65, music: 0.38, sfx: 0.55, muted: false }
    const parsed = JSON.parse(raw) as Partial<Mix>
    return {
      master: clampVol(parsed.master, 0.65),
      music: clampVol(parsed.music, 0.38),
      sfx: clampVol(parsed.sfx, 0.55),
      muted: !!parsed.muted,
    }
  } catch {
    return { master: 0.65, music: 0.38, sfx: 0.55, muted: false }
  }
}

function clampVol(n: unknown, fallback: number) {
  const v = typeof n === 'number' ? n : fallback
  if (!Number.isFinite(v)) return fallback
  return Math.min(1, Math.max(0, v))
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mix)) } catch { /* ignore */ }
}

export function getMix(): Mix { return mix }

export function subscribeMix(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setMix(patch: Partial<Mix>) {
  mix = { ...mix, ...patch }
  save()
  listeners.forEach((fn) => fn())
  applyBeds()
}

function musicLevel() {
  if (mix.muted) return 0
  return Math.min(1, mix.master * mix.music * 0.16)
}

function sfxLevel(scale = 1) {
  if (mix.muted) return 0
  return Math.min(1, mix.master * mix.sfx * scale)
}

function startLoop(slot: string, file: string, volume: number) {
  try {
    const url = ROOT + file
    let el = slots[slot]
    if (!el || el.dataset.src !== url) {
      if (el) {
        el.pause()
        el.src = ''
      }
      el = new Audio(url)
      el.dataset.src = url
      el.loop = true
      el.preload = 'auto'
      el.onerror = () => { el.dataset.dead = '1' }
      slots[slot] = el
    }
    el.volume = volume
    if (el.dataset.dead === '1' || volume <= 0.001) {
      if (!el.paused) el.pause()
      return
    }
    if (el.paused) void el.play().catch(() => {})
  } catch { /* audio never blocks the game */ }
}

function stop(slot: string) {
  const el = slots[slot]
  if (!el) return
  try { el.pause() } catch { /* ignore */ }
}

const MENU_FILE = 'music/menu/bed.mp3'
const GAME_FILE = 'music/game/bed.mp3'
let menuA: HTMLAudioElement | null = null
let menuB: HTMLAudioElement | null = null
let menuLead: HTMLAudioElement | null = null
let menuFading = false
let bedFile = ''
let bedGen = 0

function menuEl(current: HTMLAudioElement | null, file: string): HTMLAudioElement {
  const url = ROOT + file
  if (current && current.dataset.src === url) return current
  if (current) {
    try { current.pause() } catch { /* ignore */ }
    current.src = ''
  }
  const el = new Audio(url)
  el.dataset.src = url
  el.loop = false
  el.preload = 'auto'
  el.onerror = () => { el.dataset.dead = '1' }
  return el
}

function bindMenu(el: HTMLAudioElement) {
  el.ontimeupdate = () => {
    if (menuLead !== el || menuFading) return
    if (!Number.isFinite(el.duration) || el.duration < 8) return
    if (el.duration - el.currentTime > 3.4) return
    const other = el === menuA ? menuB : menuA
    if (!other || other.dataset.dead === '1') {
      el.loop = true
      return
    }
    menuFading = true
    const target = musicLevel()
    const gen = bedGen
    try { other.currentTime = 0 } catch { /* not ready */ }
    other.volume = 0
    void other.play().catch(() => {})
    const from = el
    const t0 = performance.now()
    const id = window.setInterval(() => {
      if (gen !== bedGen) {
        window.clearInterval(id)
        return
      }
      const k = Math.min(1, (performance.now() - t0) / 3200)
      try {
        from.volume = Math.max(0, target * (1 - k))
        other.volume = target * k
      } catch { /* ignore */ }
      if (k >= 1) {
        window.clearInterval(id)
        try { from.pause() } catch { /* ignore */ }
        menuLead = other
        menuFading = false
      }
    }, 80)
  }
}

function startMenu(file: string, volume: number) {
  const url = ROOT + file
  if (bedFile === file && menuLead && menuLead.dataset.src === url) {
    if (volume <= 0.001) {
      bedGen += 1
      menuFading = false
      for (const el of [menuA, menuB]) {
        if (!el) continue
        el.volume = 0
        if (!el.paused) el.pause()
      }
      return
    }
    if (menuFading) return
    menuLead.volume = volume
    if (menuLead.paused && menuLead.dataset.dead !== '1') void menuLead.play().catch(() => {})
    return
  }
  bedFile = file
  bedGen += 1
  menuFading = false
  menuA = menuEl(menuA, file)
  menuB = menuEl(menuB, file)
  if (menuA.dataset.dead === '1') return
  bindMenu(menuA)
  bindMenu(menuB)
  menuLead = menuA
  const lead = menuLead
  lead.volume = volume
  if (volume <= 0.001) {
    if (!lead.paused) lead.pause()
    return
  }
  try { lead.currentTime = 0 } catch { /* not loaded yet */ }
  void lead.play().catch(() => {})
}

function applyBeds() {
  if (!unlocked) return
  try {
    stop('music')
    startMenu(scene.music === 'menu' ? MENU_FILE : GAME_FILE, musicLevel())
    if (mix.muted && officeEl && !officeEl.paused) officeEl.pause()
    stop('ambience')
    if (scene.weather === 'storm') startLoop('weather', 'weather/storm/loop.wav', sfxLevel(0.28))
    else if (scene.weather === 'rain') startLoop('weather', 'weather/rain/loop.wav', sfxLevel(0.24))
    else if (scene.weather === 'wind') startLoop('weather', 'weather/wind/loop.wav', sfxLevel(0.22))
    else stop('weather')
  } catch { /* ignore */ }
}

export function syncScene(next: Scene) {
  const enteringGame = scene.music === 'menu' && next.music === 'game'
  const sameBed = (scene.music === 'menu') === (next.music === 'menu')
  const sameWeather = scene.weather === next.weather
  scene = next
  if (!sameBed || !sameWeather) applyBeds()
  if (enteringGame) nextOfficeAt = Date.now() + 3500 + Math.random() * 4500
}

export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  if (!started) {
    started = true
    nextOfficeAt = Date.now() + 5000 + Math.random() * 7000
    window.setInterval(atmosphere, 5000)
  }
  applyBeds()
}

function vary(paths: string[]) {
  const options = paths.filter((p) => p !== lastCue)
  const pick = options[Math.floor(Math.random() * options.length)] || paths[0]
  lastCue = pick
  return pick
}

export function playCue(file: string) {
  if (!unlocked || mix.muted || sfxLevel() <= 0.001) return
  try {
    const el = new Audio(ROOT + file)
    el.volume = sfxLevel(0.72)
    el.onerror = () => {}
    void el.play().catch(() => {})
  } catch { /* ignore */ }
}

export function cueForEvent(defId: string): string {
  if (/fuel/.test(defId)) return vary(['events/crisis/c1.wav', 'events/news/n2.wav'])
  if (/merger|rival_fail|new_lcc/.test(defId)) return 'events/merger/m1.wav'
  if (/price_war/.test(defId)) return vary(['events/news/n1.wav', 'events/news/n2.wav'])
  if (/engine|parts|grounding/.test(defId)) return 'events/maintenance/mech.wav'
  if (/cancel|strike|delay/.test(defId)) return 'events/cancellation/tone.wav'
  if (/storm|snow|hurricane|ice|blizzard|norther|thunder/.test(defId)) return vary(['weather/thunder/t1.wav', 'weather/thunder/t2.wav'])
  if (/health|recession|audit|accident|crash/.test(defId)) return vary(['events/crisis/c1.wav', 'events/crisis/c2.wav'])
  if (/pilot|runway|closure|slots/.test(defId)) return 'events/warning/w1.wav'
  return vary(['ui/notification/note.wav', 'events/news/n1.wav', 'events/news/n2.wav'])
}

export function weatherKind(labels: string[]): Scene['weather'] {
  const text = labels.join(' ').toLowerCase()
  if (!text) return 'none'
  if (/hurricane|thunder/.test(text)) return 'storm'
  if (/snow|blizzard|ice|wind/.test(text)) return 'wind'
  if (/storm|rain/.test(text)) return 'rain'
  return 'none'
}

const THUNDER = ['weather/thunder/t1.wav', 'weather/thunder/t2.wav']

type Clip = { file: string; gain: number; min: number; max: number; seek: boolean; pool: Array<Scene['place']> }

// Short slices of field recordings. They start and stop; nothing here loops the whole file.
const OFFICE: Clip[] = [
  { file: 'aircraft/takeoff/distant.mp3', gain: 0.22, min: 7, max: 12, seek: false, pool: ['game', 'menu'] },
  { file: 'aircraft/takeoff/airliner.mp3', gain: 0.2, min: 8, max: 13, seek: false, pool: ['game'] },
  { file: 'aircraft/takeoff/roll.wav', gain: 0.16, min: 5, max: 9, seek: false, pool: ['game'] },
  { file: 'aircraft/landing/distant.mp3', gain: 0.2, min: 7, max: 12, seek: true, pool: ['game', 'menu'] },
  { file: 'aircraft/landing/flyover.mp3', gain: 0.18, min: 6, max: 11, seek: false, pool: ['game'] },
  { file: 'aircraft/landing/touch.wav', gain: 0.14, min: 4, max: 7, seek: false, pool: ['game'] },
  { file: 'aircraft/distant/overhead.mp3', gain: 0.18, min: 6, max: 10, seek: false, pool: ['game', 'menu'] },
  { file: 'aircraft/distant/jet1.wav', gain: 0.16, min: 5, max: 9, seek: false, pool: ['game'] },
  { file: 'aircraft/distant/jet2.wav', gain: 0.16, min: 5, max: 9, seek: false, pool: ['game'] },
  { file: 'aircraft/distant/jet3.wav', gain: 0.15, min: 5, max: 8, seek: false, pool: ['game', 'menu'] },
  { file: 'aircraft/taxi/dash8.mp3', gain: 0.14, min: 5, max: 9, seek: true, pool: ['game'] },
  { file: 'aircraft/taxi/roll.wav', gain: 0.12, min: 4, max: 7, seek: false, pool: ['game'] },
  { file: 'aircraft/atc/radio.mp3', gain: 0.2, min: 3.2, max: 6.5, seek: true, pool: ['game'] },
  { file: 'ambience/terminal/crowd.wav', gain: 0.12, min: 4, max: 8, seek: true, pool: ['game', 'menu'] },
  { file: 'ambience/airport/terminal.wav', gain: 0.11, min: 4, max: 8, seek: true, pool: ['game', 'menu'] },
  { file: 'ambience/hangar/bay.wav', gain: 0.1, min: 5, max: 9, seek: true, pool: ['game'] },
]

let lastOffice = ''
let lastFamily = ''

function familyOf(file: string) {
  if (file.includes('/atc/')) return 'atc'
  if (file.includes('/terminal/crowd')) return 'crowd'
  if (file.includes('/airport/') || file.includes('/hangar/')) return 'terminal'
  return 'jet'
}
let officeEl: HTMLAudioElement | null = null
let officeStop = 0
let nextOfficeAt = 0
let clickEl: HTMLAudioElement | null = null
let clickAt = 0
let clicksInstalled = false

function pickOffice() {
  const pool = OFFICE.filter((clip) => clip.pool.includes(scene.place))
  const families = [...new Set(pool.map((clip) => familyOf(clip.file)))].filter((family) => family !== lastFamily)
  const family = families[Math.floor(Math.random() * families.length)] || lastFamily || 'jet'
  const options = pool.filter((clip) => familyOf(clip.file) === family && clip.file !== lastOffice)
  const pick = (options.length ? options : pool)[Math.floor(Math.random() * (options.length || pool.length))] || OFFICE[0]
  lastOffice = pick.file
  lastFamily = familyOf(pick.file)
  return pick
}

function gapAfterClip(): number {
  const span = scene.place === 'menu' ? [14, 26] : [7, 16]
  return span[0] + Math.random() * (span[1] - span[0])
}

function fadeOffice(el: HTMLAudioElement) {
  const start = el.volume
  let step = 0
  const id = window.setInterval(() => {
    step += 1
    try { el.volume = Math.max(0, start * (1 - step / 8)) } catch { /* ignore */ }
    if (step >= 8) {
      window.clearInterval(id)
      try { el.pause() } catch { /* ignore */ }
    }
  }, 60)
}

function playOfficeClip() {
  try {
    if (mix.muted || sfxLevel() <= 0.001) return 20
    const clip = pickOffice()
    const url = ROOT + clip.file
    if (!officeEl || officeEl.dataset.src !== url) {
      if (officeEl) {
        officeEl.pause()
        officeEl.src = ''
      }
      officeEl = new Audio(url)
      officeEl.dataset.src = url
      officeEl.preload = 'auto'
      officeEl.onerror = () => { if (officeEl) officeEl.dataset.dead = '1' }
    }
    const el = officeEl
    if (el.dataset.dead === '1') return 12
    const len = clip.min + Math.random() * (clip.max - clip.min)
    const begin = () => {
      try {
        if (clip.seek && Number.isFinite(el.duration) && el.duration > len + 1) {
          el.currentTime = Math.random() * (el.duration - len - 0.3)
        } else {
          el.currentTime = 0
        }
        const quiet = scene.place === 'menu' ? 0.45 : 1
        el.volume = sfxLevel(clip.gain * quiet)
        void el.play().catch(() => {})
        window.clearTimeout(officeStop)
        officeStop = window.setTimeout(() => fadeOffice(el), len * 1000)
      } catch { /* ignore */ }
    }
    if (el.readyState >= 1) begin()
    else el.addEventListener('loadedmetadata', begin, { once: true })
    return len + gapAfterClip()
  } catch {
    return 22
  }
}

export function playButtonClick() {
  try {
    const now = performance.now()
    if (now - clickAt < 90) return
    clickAt = now
    if (mix.muted || sfxLevel() <= 0.001) return
    if (!clickEl) {
      clickEl = new Audio(ROOT + 'ui/click/button.wav')
      clickEl.preload = 'auto'
      clickEl.onerror = () => { if (clickEl) clickEl.dataset.dead = '1' }
    }
    if (clickEl.dataset.dead === '1') return
    clickEl.volume = Math.min(1, sfxLevel(0.42))
    try { clickEl.currentTime = 0 } catch { /* not ready yet */ }
    void clickEl.play().catch(() => {})
  } catch { /* a missing click never blocks the button */ }
}

export function installButtonClicks() {
  if (clicksInstalled || typeof document === 'undefined') return
  clicksInstalled = true
  document.addEventListener('pointerdown', (event) => {
    try {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button, [role="button"], .leaflet-marker-icon, .leaflet-control-zoom a')
      if (!button) return
      if (button instanceof HTMLButtonElement && button.disabled) return
      if (button.getAttribute('aria-disabled') === 'true') return
      playButtonClick()
    } catch { /* ignore */ }
  }, true)
}

function atmosphere() {
  if (!unlocked || mix.muted) return
  try {
    if ((scene.weather === 'storm' || scene.weather === 'rain') && Math.random() < 0.22) playCue(vary(THUNDER))
    if (Date.now() < nextOfficeAt) return
    if (officeEl && !officeEl.paused) return
    const wait = playOfficeClip()
    nextOfficeAt = Date.now() + wait * 1000
  } catch { /* ignore */ }
}
