export type Cue = 'blink' | 'curious' | 'chirp' | 'happy' | 'surprise' | 'movement' | 'dizzy'

export const SOUND_KEY = 'motion-buddy-sound-v1'
const COOLDOWN_MS = 340

export interface SoundGate {
  muted: boolean
  unlocked: boolean
  last: Record<string, number>
}

export function initialGate(): SoundGate {
  return { muted: true, unlocked: false, last: {} }
}

export function gateCue(gate: SoundGate, kind: Cue, now: number): boolean {
  if (!gate.unlocked || gate.muted) return false
  const previous = gate.last[kind] ?? -1_000_000
  if (now - previous < COOLDOWN_MS) return false
  gate.last[kind] = now
  return true
}

export function renderCue(kind: Cue, sampleRate = 22050): Float32Array {
  const seconds = kind === 'happy' ? 0.22 : kind === 'dizzy' ? 0.28 : 0.12
  const length = Math.floor(sampleRate * seconds)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate
    const env = Math.sin(Math.PI * Math.min(1, i / (length - 1))) ** 1.2
    const freq = frequency(kind, t)
    const tone = Math.sin(2 * Math.PI * freq * t)
    const noise = kind === 'surprise' || kind === 'blink' ? (hash(i) - 0.5) * 0.35 : 0
    out[i] = Math.max(-0.85, Math.min(0.85, (tone * 0.7 + noise) * env))
  }
  return out
}

export function encodeWav(samples: Float32Array, sampleRate = 22050): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  writeText(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeText(view, 8, 'WAVE')
  writeText(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(44 + i * 2, Math.round(samples[i] * 32767), true)
  }
  return new Uint8Array(buffer)
}

export function cueForCandidate(id: string): Cue {
  if (id.includes('shock') || id === 'startled' || id === 'take-left' || id === 'take-right') return 'surprise'
  if (id === 'dizzy') return 'dizzy'
  if (id.includes('blink')) return 'blink'
  if (id === 'beam' || id === 'happy' || id === 'laugh' || id === 'cheer' || id === 'giggle') return 'happy'
  if (id.includes('look') || id === 'sway' || id === 'scan') return 'movement'
  if (id === 'curious' || id === 'peek') return 'curious'
  return 'chirp'
}

let context: AudioContext | null = null
let gate = initialGate()

export function loadSoundPrefs(): void {
  try {
    const raw = window.localStorage.getItem(SOUND_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { muted?: boolean; volume?: number }
    if (typeof parsed.muted === 'boolean') gate.muted = parsed.muted
  } catch {
    gate = initialGate()
  }
}

export function soundStatus(): { muted: boolean; unlocked: boolean; available: boolean } {
  return { muted: gate.muted, unlocked: gate.unlocked, available: typeof AudioContext !== 'undefined' }
}

export function unlockSound(): boolean {
  if (typeof AudioContext === 'undefined') return false
  if (!context) context = new AudioContext()
  void context.resume()
  gate.unlocked = true
  return true
}

export function setSoundMuted(muted: boolean): void {
  gate.muted = muted
  try {
    window.localStorage.setItem(SOUND_KEY, JSON.stringify({ muted, volume: 0.4 }))
  } catch {
    // Storage can be blocked. The choice still applies for this visit.
  }
}

export function playCue(kind: Cue): boolean {
  if (!context || !gateCue(gate, kind, performance.now())) return false
  const samples = renderCue(kind, context.sampleRate)
  const buffer = context.createBuffer(1, samples.length, context.sampleRate)
  buffer.getChannelData(0).set(samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  gain.gain.value = 0.35
  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
  return true
}

function frequency(kind: Cue, t: number): number {
  if (kind === 'blink') return 180
  if (kind === 'curious') return 520 + t * 1800
  if (kind === 'chirp') return 880 + t * 2400
  if (kind === 'happy') return t < 0.1 ? 660 : 880
  if (kind === 'surprise') return 1400 - t * 800
  if (kind === 'movement') return 280 + t * 900
  return 360 + Math.sin(t * 48) * 90
}

function hash(index: number): number {
  const value = Math.sin(index * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function writeText(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
}
