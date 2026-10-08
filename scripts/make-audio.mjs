import fs from 'fs'
import path from 'path'

const root = path.resolve('public/assets/audio')
const rate = 16000

function wav(samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2)
  }
  return buf
}

function loopify(samples, fadeSec) {
  const fade = Math.floor(rate * fadeSec)
  const out = new Float32Array(samples.length - fade)
  for (let i = 0; i < out.length; i++) out[i] = samples[i]
  for (let i = 0; i < fade; i++) {
    const w = i / fade
    out[i] = samples[i] * w + samples[samples.length - fade + i] * (1 - w)
  }
  return out
}

function write(rel, samples) {
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, wav(samples))
}

function bed(seconds, freqs, air) {
  const fade = 0.4
  const n = Math.floor(rate * (seconds + fade))
  const raw = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / rate
    let s = 0
    freqs.forEach((f, k) => {
      const trem = 0.86 + 0.14 * Math.sin(2 * Math.PI * (0.05 + k * 0.013) * t)
      s += Math.sin(2 * Math.PI * f * t) * 0.055 * trem
      s += Math.sin(2 * Math.PI * f * 2 * t) * 0.01 * trem
    })
    s += (Math.random() * 2 - 1) * air
    raw[i] = s
  }
  return loopify(raw, fade)
}

function noiseLoop(seconds, cutoff, amp, rumble = 0) {
  const fade = 0.25
  const n = Math.floor(rate * (seconds + fade))
  const raw = new Float32Array(n)
  let low = 0
  let lower = 0
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1
    low += cutoff * (white - low)
    lower += 0.02 * (low - lower)
    const t = i / rate
    const gust = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.07 * t)
    raw[i] = (low * amp + lower * rumble) * gust
  }
  return loopify(raw, fade)
}

function burst(seconds, fn) {
  const n = Math.floor(rate * seconds)
  const out = new Float32Array(n)
  let low = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    low += 0.06 * ((Math.random() * 2 - 1) - low)
    out[i] = fn(t, low, i / rate)
  }
  return out
}

function tone(freq, seconds, amp) {
  const n = Math.floor(rate * seconds)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / rate
    const env = Math.sin(Math.PI * Math.min(1, i / n)) * Math.exp(-2.2 * t)
    out[i] = Math.sin(2 * Math.PI * freq * t) * amp * env
  }
  return out
}

function mix(parts) {
  const n = Math.max(...parts.map((p) => p.length))
  const out = new Float32Array(n)
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i]
  return out
}

write('music/normal/bed.wav', bed(12, [220, 277.18, 329.63, 440], 0.006))
write('music/night/bed.wav', bed(12, [174.61, 220, 261.63, 349.23], 0.004))
write('music/crisis/bed.wav', bed(12, [146.83, 174.61, 220, 277.18], 0.008))
write('ambience/airport/terminal.wav', noiseLoop(6, 0.08, 0.22, 0.05))
write('ambience/terminal/crowd.wav', noiseLoop(6, 0.12, 0.16, 0.02))
write('ambience/hangar/bay.wav', noiseLoop(6, 0.035, 0.16, 0.08))
write('weather/rain/loop.wav', noiseLoop(5, 0.22, 0.28, 0))
write('weather/wind/loop.wav', noiseLoop(6, 0.05, 0.26, 0.12))
write('weather/storm/loop.wav', noiseLoop(6, 0.16, 0.24, 0.18))

for (const [name, pitch] of [['jet1', 0.9], ['jet2', 1.05], ['jet3', 0.78]]) {
  write(`aircraft/distant/${name}.wav`, burst(2.6, (t, low) => {
    const env = Math.sin(Math.PI * t) ** 1.3
    return low * env * 0.55 * pitch
  }))
}
write('aircraft/takeoff/roll.wav', burst(2.2, (t, low) => low * Math.sin(Math.PI * t) * 0.4))
write('aircraft/landing/touch.wav', burst(1.6, (t, low) => low * (t < 0.15 ? 1 : Math.exp(-3 * t)) * 0.35))
write('aircraft/taxi/roll.wav', burst(1.8, (t, low) => low * Math.sin(Math.PI * t) * 0.18))

write('weather/thunder/t1.wav', burst(2.4, (t, low) => {
  const crack = t < 0.04 ? (Math.random() * 2 - 1) * 0.35 : 0
  return crack + low * Math.exp(-1.6 * t) * 0.7
}))
write('weather/thunder/t2.wav', burst(2.8, (t, low) => {
  const crack = t > 0.12 && t < 0.16 ? (Math.random() * 2 - 1) * 0.28 : 0
  return crack + low * Math.exp(-1.3 * t) * 0.62
}))

write('events/news/n1.wav', mix([tone(523.25, 0.35, 0.18), tone(659.25, 0.45, 0.1)]))
write('events/news/n2.wav', mix([tone(440, 0.3, 0.16), tone(554.37, 0.42, 0.09)]))
write('events/warning/w1.wav', mix([tone(349.23, 0.4, 0.16), tone(415.3, 0.55, 0.08)]))
write('events/crisis/c1.wav', mix([tone(196, 0.7, 0.2), tone(246.94, 0.8, 0.08)]))
write('events/crisis/c2.wav', mix([tone(174.61, 0.75, 0.2), tone(233.08, 0.7, 0.07)]))
write('events/merger/m1.wav', mix([tone(392, 0.28, 0.14), tone(493.88, 0.4, 0.1), tone(587.33, 0.5, 0.06)]))
write('events/maintenance/mech.wav', burst(0.45, (t, low) => low * (t < 0.08 ? 0.8 : 0.25) * Math.exp(-4 * t)))
write('events/cancellation/tone.wav', mix([tone(311.13, 0.32, 0.16), tone(369.99, 0.4, 0.08)]))
write('ui/click/c.wav', tone(880, 0.08, 0.12))
write('ui/confirm/ok.wav', mix([tone(523.25, 0.12, 0.12), tone(659.25, 0.18, 0.1)]))
write('ui/error/err.wav', tone(196, 0.22, 0.16))
write('ui/notification/note.wav', tone(587.33, 0.2, 0.12))

console.log('audio written')
