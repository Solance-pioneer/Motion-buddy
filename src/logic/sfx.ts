import { APPROVED_WAV_BASE64 } from './approved-wavs.ts'

export type ApprovedCue = 'scan' | 'giggle' | 'surprise' | 'yawn' | 'wink' | 'dizzy'
export type Cue = ApprovedCue | 'blink' | 'curious' | 'chirp' | 'happy' | 'movement'

export const APPROVED_MS: Record<ApprovedCue, number> = {
  scan: 500,
  giggle: 680,
  surprise: 500,
  yawn: 900,
  wink: 340,
  dizzy: 1200,
}

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

export function cueForCandidate(id: string): ApprovedCue | null {
  if (id === 'scan') return 'scan'
  if (id === 'giggle') return 'giggle'
  if (id === 'take-left' || id === 'take-right' || id === 'startled' || id.includes('shock')) return 'surprise'
  if (id === 'yawn' || id === 'yawn-stretch') return 'yawn'
  if (id === 'wink' || id === 'wink-play') return 'wink'
  if (id === 'dizzy' || id === 'spiral-dizzy') return 'dizzy'
  return null
}

export interface HearState {
  expression: string
  reaction: string
  reduced: boolean
  allowDizzy: boolean
  allowStartled: boolean
}

export interface SoundMemory {
  beatKey: string
  voiceUntil: number
}

export function initialSoundMemory(): SoundMemory {
  return { beatKey: '', voiceUntil: 0 }
}

export function cueForHearState(state: HearState): ApprovedCue | null {
  if (state.reduced) return null
  if (state.reaction === 'dizzy') return state.allowDizzy ? 'dizzy' : null
  if (state.reaction === 'startled') return state.allowStartled ? 'surprise' : null
  if (state.reaction !== 'none' && state.reaction !== 'recovery') return null
  if (state.expression === 'dizzy' || state.expression === 'spiral-dizzy') return state.allowDizzy ? 'dizzy' : null
  if (state.expression === 'startled' || state.expression === 'take-left') return state.allowStartled ? 'surprise' : null
  if (state.expression === 'yawn' || state.expression === 'yawn-stretch') return 'yawn'
  if (state.expression === 'wink' || state.expression === 'wink-play') return 'wink'
  if (state.expression === 'scan') return 'scan'
  if (state.expression === 'giggle') return 'giggle'
  return null
}

function hearKey(state: HearState, cue: ApprovedCue | null): string {
  return `${state.reduced ? 'reduced' : 'full'}|${state.reaction}|${state.expression}|${cue ?? ''}|${state.allowDizzy}|${state.allowStartled}`
}

/** One approved sound per expression entrance. A busy voice keeps the previous beat so it can still play once the sound ends. */
export function advanceSound(memory: SoundMemory, state: HearState, now: number): { memory: SoundMemory; cue: ApprovedCue | null } {
  const cue = cueForHearState(state)
  const beatKey = hearKey(state, cue)
  if (!cue) return { memory: { ...memory, beatKey }, cue: null }
  if (beatKey === memory.beatKey || now < memory.voiceUntil) return { memory, cue: null }
  return { memory: { beatKey, voiceUntil: now + APPROVED_MS[cue] }, cue }
}

/** One approved sound when a review candidate is entered. Repeating the same id does not retrigger. */
export function advanceCandidate(memory: SoundMemory, id: string, now: number): { memory: SoundMemory; cue: ApprovedCue | null } {
  const cue = cueForCandidate(id)
  const beatKey = `candidate:${id}`
  if (!cue) return { memory: { ...memory, beatKey }, cue: null }
  if (beatKey === memory.beatKey || now < memory.voiceUntil) return { memory, cue: null }
  return { memory: { beatKey, voiceUntil: now + APPROVED_MS[cue] }, cue }
}

/** The chirp is only the explicit sound-on confirmation, and it waits until the voice is free. */
export function claimChirp(
  memory: SoundMemory,
  now: number,
  access: { unlocked: boolean; muted: boolean; explicit: boolean },
): { memory: SoundMemory; ok: boolean } {
  if (!access.explicit || !access.unlocked || access.muted || now < memory.voiceUntil) return { memory, ok: false }
  return { memory: { ...memory, voiceUntil: now + 120 }, ok: true }
}

export function decodeApprovedWav(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const mark = (offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length))
  if (mark(0, 4) !== 'RIFF' || mark(8, 4) !== 'WAVE') throw new Error('Approved sound is not a WAV')
  let offset = 12
  let dataOffset = -1
  let dataLength = 0
  let channels = 0
  let rate = 0
  let bits = 0
  while (offset + 8 <= bytes.length) {
    const id = mark(offset, 4)
    const size = view.getUint32(offset + 4, true)
    if (id === 'fmt ') {
      channels = view.getUint16(offset + 10, true)
      rate = view.getUint32(offset + 12, true)
      bits = view.getUint16(offset + 22, true)
    } else if (id === 'data') {
      dataOffset = offset + 8
      dataLength = size
      break
    }
    offset += 8 + size + (size % 2)
  }
  if (dataOffset < 0 || channels !== 1 || rate !== 22050 || bits !== 16) throw new Error('Approved sound is not 22050 Hz mono PCM')
  const samples = new Float32Array(dataLength / 2)
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(dataOffset + i * 2, true) / 32768
  return samples
}

const approvedCache = new Map<ApprovedCue, Float32Array>()

export function approvedSamples(kind: ApprovedCue): Float32Array {
  const cached = approvedCache.get(kind)
  if (cached) return cached
  const binary = Uint8Array.from(atob(APPROVED_WAV_BASE64[kind]), (char) => char.charCodeAt(0))
  const samples = decodeApprovedWav(binary)
  approvedCache.set(kind, samples)
  return samples
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

let playingUntil = 0

export function playCue(kind: Cue | null): boolean {
  if (!kind || !context || !gate.unlocked || gate.muted) return false
  const now = performance.now()
  if (now < playingUntil) return false
  const approved = kind === 'scan' || kind === 'giggle' || kind === 'surprise' || kind === 'yawn' || kind === 'wink' || kind === 'dizzy'
  if (!approved && kind !== 'chirp') return false
  const samples = approved ? approvedSamples(kind) : renderCue('chirp', 22050)
  const buffer = context.createBuffer(1, samples.length, 22050)
  buffer.getChannelData(0).set(samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  gain.gain.value = kind === 'chirp' ? 0.35 : 1
  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
  playingUntil = now + (samples.length / 22050) * 1000
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
