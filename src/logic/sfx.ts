import { APPROVED_WAV_BASE64 } from './approved-wavs.ts'
import { DISAPPROVE_OGG_BASE64 } from './disapprove-ogg.ts'
import { VOICE_MP3_BASE64 } from './voice-mp3.ts'

export type ApprovedCue = 'scan' | 'giggle' | 'surprise' | 'yawn' | 'wink' | 'dizzy' | 'clap' | 'level-up' | 'disapprove'
export type Cue = ApprovedCue | 'blink' | 'curious' | 'chirp' | 'happy' | 'movement'

export const APPROVED_MS: Record<ApprovedCue, number> = {
  scan: 500,
  giggle: 680,
  surprise: 500,
  yawn: 900,
  wink: 340,
  dizzy: 1200,
  clap: 1992,
  'level-up': 2496,
  disapprove: 104,
}

/**
 * Playback gains only. Files are not rewritten.
 * Active-region RMS was about -13 to -16 dBFS for the six cues at full scale,
 * -17 dBFS for the chirp at its old 0.35 gain, and about -10 dBFS for the two voices,
 * whose peaks sat near -1.5 dBFS. These gains aim near -18 dBFS active RMS
 * and keep peaks no hotter than about -12 dBFS.
 */
export const PLAYBACK_GAIN: Record<ApprovedCue | 'chirp', number> = {
  scan: 0.56,
  giggle: 0.6,
  surprise: 0.6,
  yawn: 0.6,
  wink: 0.6,
  dizzy: 0.56,
  chirp: 0.32,
  clap: 0.3,
  'level-up': 0.3,
  disapprove: 0.2,
}

export const SOUND_KEY = 'motion-buddy-sound-v1'
const COOLDOWN_MS = 340

export interface SoundGate {
  muted: boolean
  unlocked: boolean
  last: Record<string, number>
}

export function initialGate(): SoundGate {
  return { muted: false, unlocked: false, last: {} }
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
  if (id === 'clap') return 'clap'
  if (id === 'level-up') return 'level-up'
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
  if (state.expression === 'clap') return 'clap'
  if (state.expression === 'level-up') return 'level-up'
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
  if (beatKey === memory.beatKey || now < memory.voiceUntil - 40) return { memory, cue: null }
  return { memory: { beatKey, voiceUntil: now + APPROVED_MS[cue] }, cue }
}

/** Absent storage means sound is wanted. An explicit mute is remembered. */
export function mutedFromStorage(raw: string | null): boolean {
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { muted?: boolean }
    if (typeof parsed.muted === 'boolean') return parsed.muted
  } catch {
    return false
  }
  return false
}

/** One approved sound when a review candidate is entered. Repeating the same id does not retrigger. */
export function advanceCandidate(memory: SoundMemory, id: string, now: number): { memory: SoundMemory; cue: ApprovedCue | null } {
  const cue = cueForCandidate(id)
  const beatKey = `candidate:${id}`
  if (!cue) return { memory: { ...memory, beatKey }, cue: null }
  if (beatKey === memory.beatKey || now < memory.voiceUntil) return { memory, cue: null }
  return { memory: { beatKey, voiceUntil: now + APPROVED_MS[cue] }, cue }
}

export interface MoveClock {
  armed: boolean
  moves: number
  recent: number[]
  quietUntil: number
}

export function initialMoveClock(): MoveClock {
  return { armed: false, moves: 0, recent: [], quietUntil: 0 }
}

const MOVE_NOTICE = 0.9
const MOVE_RELEASE = 0.45
const MOVE_FAST = 3.4
const RAPID_WINDOW_MS = 1_400
const RAPID_MOVES = 3

/**
 * One chirp for every second distinct shove. Held tilt, jitter, and idle do not count.
 * Three distinct moves in a short window become the dizzy cue instead, and extra
 * cues during playback or that window are dropped.
 */
export function noteMovement(
  clock: MoveClock,
  input: {
    now: number
    magnitude: number
    reduced: boolean
    muted: boolean
    unlocked: boolean
    allowDizzy: boolean
    allowGrumpy: boolean
    busyUntil: number
  },
): { clock: MoveClock; cue: 'chirp' | 'dizzy' | 'grumpy' | null } {
  const recent = clock.recent.filter((time) => input.now - time <= 6_000)
  let armed = clock.armed
  if (input.magnitude < MOVE_RELEASE) armed = false
  const rising = !clock.armed && input.magnitude >= MOVE_NOTICE
  let moves = clock.moves
  if (rising) {
    armed = true
    moves += 1
    recent.push(input.now)
  }
  const rapid = recent.filter((time) => input.now - time <= RAPID_WINDOW_MS).length >= RAPID_MOVES
  const silent = input.reduced || input.muted || !input.unlocked || input.now < clock.quietUntil
  const busy = recent.length >= 4
  let cue: 'chirp' | 'dizzy' | 'grumpy' | null = null
  let quietUntil = clock.quietUntil
  if (rising && !silent && rapid && input.allowDizzy) {
    cue = 'dizzy'
    quietUntil = input.now + 1_600
  } else if (rising && !silent && busy && input.allowGrumpy && input.now >= input.busyUntil) {
    cue = 'grumpy'
    quietUntil = input.now + 4_000
  } else if (rising && !silent && input.now >= input.busyUntil && !rapid && moves % 2 === 0 && input.magnitude < MOVE_FAST) {
    cue = 'chirp'
  }
  return { clock: { armed, moves, recent, quietUntil }, cue }
}

export interface TapClock {
  taps: number[]
  quietUntil: number
}

export function initialTapClock(): TapClock {
  return { taps: [], quietUntil: 0 }
}

/** Four face taps in a short window frown once. Later taps in the quiet spell are dropped. */
export function noteFaceTap(
  clock: TapClock,
  input: {
    now: number
    reduced: boolean
    muted: boolean
    unlocked: boolean
    allowGrumpy: boolean
    busyUntil: number
  },
): { clock: TapClock; frown: boolean; cue: 'disapprove' | null } {
  if (input.reduced || !input.allowGrumpy) return { clock, frown: false, cue: null }
  const taps = clock.taps.filter((time) => input.now - time <= 2_500)
  taps.push(input.now)
  if (taps.length < 4 || input.now < clock.quietUntil) return { clock: { taps, quietUntil: clock.quietUntil }, frown: false, cue: null }
  const audible = !input.muted && input.unlocked && input.now >= input.busyUntil
  return { clock: { taps: [], quietUntil: input.now + 4_000 }, frown: true, cue: audible ? 'disapprove' : null }
}

/** The chirp is the explicit confirmation and the movement answer. It waits until the voice is free. */
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

export function approvedSamples(kind: Exclude<ApprovedCue, 'clap' | 'level-up' | 'disapprove'>): Float32Array {
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
    gate.muted = mutedFromStorage(raw)
  } catch {
    gate = initialGate()
  }
}

export function soundStatus(): { muted: boolean; unlocked: boolean; available: boolean } {
  return { muted: gate.muted, unlocked: gate.unlocked, available: typeof AudioContext !== 'undefined' }
}

const voicePcm = new Map<string, { samples: Float32Array; rate: number }>()
let voicePrepare: Promise<void> | null = null

export function unlockSound(): boolean {
  if (typeof AudioContext === 'undefined') return false
  if (!context) context = new AudioContext()
  void context.resume()
  gate.unlocked = true
  void prepareVoices()
  return true
}

export function prepareVoices(): Promise<void> {
  if (!context) return Promise.resolve()
  if (voicePrepare) return voicePrepare
  const audio = context
  voicePrepare = (async () => {
    const clips = { clap: VOICE_MP3_BASE64.clap, 'level-up': VOICE_MP3_BASE64['level-up'], disapprove: DISAPPROVE_OGG_BASE64 } as const
    for (const kind of ['clap', 'level-up', 'disapprove'] as const) {
      if (voicePcm.has(kind)) continue
      const bytes = Uint8Array.from(atob(clips[kind]), (char) => char.charCodeAt(0))
      const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      const decoded = await audio.decodeAudioData(copy)
      voicePcm.set(kind, { samples: decoded.getChannelData(0).slice(), rate: decoded.sampleRate })
    }
  })()
  return voicePrepare
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
  const spoken = kind === 'clap' || kind === 'level-up' || kind === 'disapprove'
  const approved = kind === 'scan' || kind === 'giggle' || kind === 'surprise' || kind === 'yawn' || kind === 'wink' || kind === 'dizzy'
  if (!approved && !spoken && kind !== 'chirp') return false
  const voice = spoken ? voicePcm.get(kind) : undefined
  if (spoken && !voice) return false
  let samples: Float32Array
  let rate: number
  if (voice) {
    samples = voice.samples
    rate = voice.rate
  } else if (kind === 'chirp') {
    samples = renderCue('chirp', 22050)
    rate = 22050
  } else if (approved) {
    samples = approvedSamples(kind)
    rate = 22050
  } else return false
  const buffer = context.createBuffer(1, samples.length, rate)
  buffer.getChannelData(0).set(samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  gain.gain.value = PLAYBACK_GAIN[kind === 'chirp' || approved || spoken ? kind : 'chirp']
  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
  playingUntil = now + (samples.length / rate) * 1000
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
