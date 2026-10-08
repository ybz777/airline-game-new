import fs from 'fs'
import path from 'path'

const rate = 22050
const seconds = 0.095
const n = Math.floor(rate * seconds)
const samples = new Float32Array(n)
for (let i = 0; i < n; i++) {
  const t = i / rate
  const noise = (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.22
  const tick = Math.sin(2 * Math.PI * 1280 * t) * Math.exp(-t * 48) * 0.1
  const body = Math.sin(2 * Math.PI * 196 * t) * Math.exp(-t * 26) * 0.16
  samples[i] = noise + tick + body
}

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
const file = path.resolve('public/assets/audio/ui/click/button.wav')
fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file, buf)
console.log('click', n, 'samples')
