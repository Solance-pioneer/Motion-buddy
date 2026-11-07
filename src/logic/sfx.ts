import { APPROVED_WAV_BASE64 } from './approved-wavs.ts'
import { DISAPPROVE_OGG_BASE64 } from './disapprove-ogg.ts'
import { CONTACT_WAV_BASE64 } from './contact-wavs.ts'
import { SCENE_WAV_BASE64 } from './scene-wavs.ts'
import { COUNTRY_WAV_BASE64 } from './country-wavs.ts'
import { COUNTRY_GAIN } from './countries.ts'
import { VOICE_FREE_WAV_BASE64 } from './voice-free-wavs.ts'

import { ORIGINAL_WAV_BASE64 } from './original-wavs.ts'

export type ApprovedCue = 'scan' | 'giggle' | 'surprise' | 'yawn' | 'wink' | 'dizzy' | 'celebration_three_squeaks' | 'proud_rise_beeps' | 'disapprove' | 'sneeze_zip' | 'peek_pop' | 'pout_boop'
export type Cue = ApprovedCue | 'blink' | 'curious' | 'chirp' | 'happy' | 'movement'

export const APPROVED_MS: Record<ApprovedCue, number> = {
  scan: 500,
  giggle: 680,
  surprise: 500,
  yawn: 900,
  wink: 340,
  dizzy: 1200,
  celebration_three_squeaks: 1150,
  proud_rise_beeps: 920,
  disapprove: 104,
  sneeze_zip: 620,
  peek_pop: 580,
  pout_boop: 480,
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
  celebration_three_squeaks: 0.78,
  proud_rise_beeps: 0.75,
  disapprove: 0.2,
  sneeze_zip: 0.62,
  peek_pop: 0.7,
  pout_boop: 0.62,
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
  if (id === 'clap') return 'celebration_three_squeaks'
  if (id === 'level-up') return 'proud_rise_beeps'
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
  if (state.expression === 'clap') return 'celebration_three_squeaks'
  if (state.expression === 'level-up') return 'proud_rise_beeps'
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

export function approvedSamples(kind: 'scan' | 'giggle' | 'surprise' | 'yawn' | 'wink' | 'dizzy'): Float32Array {
  const cached = approvedCache.get(kind)
  if (cached) return cached
  const binary = Uint8Array.from(atob(APPROVED_WAV_BASE64[kind]), (char) => char.charCodeAt(0))
  const samples = decodeApprovedWav(binary)
  approvedCache.set(kind, samples)
  return samples
}

const pcmCache = new Map<string, { samples: Float32Array; rate: number }>()

function pcm16(kind: string, b64: string): { samples: Float32Array; rate: number } {
  const cached = pcmCache.get(kind)
  if (cached) return cached
  const binary = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0))
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
  const rate = view.getUint32(24, true)
  const dataLength = view.getUint32(40, true)
  const samples = new Float32Array(dataLength / 2)
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(44 + i * 2, true) / 32768
  const parsed = { samples, rate }
  pcmCache.set(kind, parsed)
  return parsed
}

export function originalSamples(kind: 'sneeze_zip' | 'peek_pop' | 'pout_boop'): { samples: Float32Array; rate: number } {
  return pcm16(kind, ORIGINAL_WAV_BASE64[kind])
}

export function replacementSamples(kind: 'celebration_three_squeaks' | 'proud_rise_beeps'): { samples: Float32Array; rate: number } {
  return pcm16(kind, VOICE_FREE_WAV_BASE64[kind])
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
    const clips = { disapprove: DISAPPROVE_OGG_BASE64 } as const
    for (const kind of ['disapprove'] as const) {
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
  if (muted) {
    endContact(130)
    stopSceneAudio(130)
  }
  try {
    window.localStorage.setItem(SOUND_KEY, JSON.stringify({ muted, volume: 0.4 }))
  } catch {
    // Storage can be blocked. The choice still applies for this visit.
  }
}

let playingUntil = 0

const CONTACT_VARIANTS = ['pet_soft_squeak', 'pet_round_chirp', 'pet_content_wobble'] as const
const BED_GAIN = 1
const VARIANT_GAIN = 0.84
const DUCK_GAIN = 0.35
const VARIANT_GATE_MS = 900

export type ContactVariant = (typeof CONTACT_VARIANTS)[number]

export interface ContactStatus {
  active: boolean
  bedStarts: number
  variantStarts: number
  variantKeys: ContactVariant[]
  yields: number
  loop: boolean
  loopEnd: number
  liveSources: number
}

let contactGen = 0
let bedSource: AudioBufferSourceNode | null = null
let bedGain: GainNode | null = null
let bedLevel = 0
let variantSource: AudioBufferSourceNode | null = null
let variantGain: GainNode | null = null
let variantReadyAt = 0
let variantCursor = 0
let bedStarts = 0
let variantKeys: ContactVariant[] = []
let contactYields = 0

export function contactActive(): boolean {
  return bedSource !== null
}

export function contactStatus(): ContactStatus {
  return {
    active: bedSource !== null,
    bedStarts,
    variantStarts: variantKeys.length,
    variantKeys: [...variantKeys],
    yields: contactYields,
    loop: bedSource?.loop ?? false,
    loopEnd: bedSource?.loopEnd ?? 0,
    liveSources: (bedSource ? 1 : 0) + (variantSource ? 1 : 0),
  }
}

export function resetContactForTests(): void {
  endContact(100)
  bedStarts = 0
  variantKeys = []
  contactYields = 0
  variantReadyAt = 0
  variantCursor = 0
}

function fadeNode(gain: GainNode, from: number, to: number, seconds: number): void {
  if (!context) return
  const t = context.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(from, t)
  gain.gain.linearRampToValueAtTime(to, t + seconds)
}

function stopLater(source: AudioBufferSourceNode, seconds: number): void {
  if (!context) return
  source.stop(context.currentTime + seconds + 0.02)
}

/** One play of the drag clip. A second call while it is still sounding does not start another. */
export function beginContact(): boolean {
  if (!context || gate.muted || !gate.unlocked || bedSource) return false
  const clip = pcm16('curious_contact_loop', CONTACT_WAV_BASE64.curious_contact_loop)
  const buffer = context.createBuffer(1, clip.samples.length, clip.rate)
  buffer.getChannelData(0).set(clip.samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  source.buffer = buffer
  source.loop = false
  source.connect(gain)
  gain.connect(context.destination)
  fadeNode(gain, 0, BED_GAIN, 0.12)
  bedLevel = BED_GAIN
  source.start()
  bedSource = source
  bedGain = gain
  bedStarts += 1
  const generation = contactGen
  source.onended = () => {
    if (generation !== contactGen) return
    if (bedSource === source) {
      bedSource = null
      bedGain = null
    }
  }
  return true
}

/** Duck the same bed by about 9 dB, play one variant, then restore that bed's phase. */
export function playContactVariant(now = performance.now()): ContactVariant | null {
  if (!context || !bedSource || !bedGain || gate.muted || variantSource || now < variantReadyAt) return null
  const key = CONTACT_VARIANTS[variantCursor % CONTACT_VARIANTS.length]
  variantCursor += 1
  const clip = pcm16(key, CONTACT_WAV_BASE64[key])
  const buffer = context.createBuffer(1, clip.samples.length, clip.rate)
  buffer.getChannelData(0).set(clip.samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  source.buffer = buffer
  source.loop = false
  source.connect(gain)
  gain.connect(context.destination)
  fadeNode(bedGain, bedLevel, DUCK_GAIN, 0.12)
  bedLevel = DUCK_GAIN
  fadeNode(gain, 0, VARIANT_GAIN, 0.12)
  source.start()
  variantSource = source
  variantGain = gain
  variantKeys = [...variantKeys, key]
  variantReadyAt = now + VARIANT_GATE_MS
  const generation = contactGen
  const bed = bedSource
  source.onended = () => {
    if (variantSource === source) {
      variantSource = null
      variantGain = null
    }
    if (generation !== contactGen || bedSource !== bed || !bedGain) return
    fadeNode(bedGain, DUCK_GAIN, BED_GAIN, 0.12)
    bedLevel = BED_GAIN
  }
  return key
}

let sceneGuard = false
let sceneSource: AudioBufferSourceNode | null = null
let sceneGain: GainNode | null = null
let sceneLevel = 0.84
let sceneToken = 0

export function setSceneGuard(active: boolean): void {
  sceneGuard = active
}

export function sceneAudioActive(): boolean {
  return sceneSource !== null
}

export function sceneAudioStatus(): { active: boolean } {
  return { active: sceneSource !== null }
}

/** One short scene cue at its beat. It does not loop and does not replace the contact bed. */
export function playSceneCue(key: keyof typeof SCENE_WAV_BASE64): boolean {
  if (!context || gate.muted || !gate.unlocked) return false
  stopSceneAudio(80)
  const clip = pcm16(key, SCENE_WAV_BASE64[key])
  const buffer = context.createBuffer(1, clip.samples.length, clip.rate)
  buffer.getChannelData(0).set(clip.samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  source.buffer = buffer
  source.loop = false
  source.connect(gain)
  gain.connect(context.destination)
  sceneLevel = 0.84
  fadeNode(gain, 0, sceneLevel, 0.08)
  source.start()
  sceneSource = source
  sceneGain = gain
  const token = sceneToken
  source.onended = () => {
    if (token !== sceneToken) return
    if (sceneSource === source) {
      sceneSource = null
      sceneGain = null
    }
  }
  return true
}

const CUE_DUCK = 10 ** (-3 / 20)
let cueSource: AudioBufferSourceNode | null = null
let cueGain: GainNode | null = null
let cueToken = 0
let cueLevel = 1

export type CountrySting = 'egypt_wonder_once' | 'uk_soft_march_once'

/** One finite country sting. A second call while it is sounding does nothing. Music ducks 3 dB until it ends. */
export function playCountrySting(key: CountrySting): boolean {
  if (!context || gate.muted || !gate.unlocked || cueSource) return false
  const clip = pcm16(key, COUNTRY_WAV_BASE64[key])
  const buffer = context.createBuffer(1, clip.samples.length, clip.rate)
  buffer.getChannelData(0).set(clip.samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  source.buffer = buffer
  source.loop = false
  source.connect(gain)
  gain.connect(context.destination)
  cueLevel = 1
  fadeNode(gain, 0, cueLevel, 0.03)
  source.start()
  cueSource = source
  cueGain = gain
  if (sceneGain) {
    const ducked = COUNTRY_GAIN * CUE_DUCK
    fadeNode(sceneGain, sceneLevel, ducked, 0.04)
    sceneLevel = ducked
  }
  const token = cueToken
  source.onended = () => {
    if (token !== cueToken) return
    if (cueSource === source) {
      cueSource = null
      cueGain = null
    }
    if (!sceneGain) return
    fadeNode(sceneGain, sceneLevel, COUNTRY_GAIN, 0.05)
    sceneLevel = COUNTRY_GAIN
  }
  return true
}

/** Full supplied country cue, once, through the same mute ramp as the other scenes. */
export function playCountryMusic(key: keyof typeof COUNTRY_WAV_BASE64): boolean {
  if (!context || gate.muted || !gate.unlocked) return false
  stopSceneAudio(80)
  const clip = pcm16(key, COUNTRY_WAV_BASE64[key])
  const buffer = context.createBuffer(1, clip.samples.length, clip.rate)
  buffer.getChannelData(0).set(clip.samples)
  const source = context.createBufferSource()
  const gain = context.createGain()
  source.buffer = buffer
  source.loop = false
  source.connect(gain)
  gain.connect(context.destination)
  sceneLevel = COUNTRY_GAIN
  fadeNode(gain, 0, sceneLevel, 0.04)
  source.start()
  sceneSource = source
  sceneGain = gain
  const token = sceneToken
  source.onended = () => {
    if (token !== sceneToken) return
    if (sceneSource === source) {
      sceneSource = null
      sceneGain = null
    }
  }
  return true
}

export function stopSceneAudio(ms = 130): void {
  const seconds = Math.max(0.1, Math.min(0.15, ms / 1000))
  sceneToken += 1
  cueToken += 1
  const source = sceneSource
  const gain = sceneGain
  const from = sceneLevel
  const sting = cueSource
  const stingGain = cueGain
  const stingFrom = cueLevel
  sceneSource = null
  sceneGain = null
  cueSource = null
  cueGain = null
  if (source && gain) {
    fadeNode(gain, from, 0, seconds)
    stopLater(source, seconds)
  }
  if (sting && stingGain) {
    fadeNode(stingGain, stingFrom, 0, seconds)
    stopLater(sting, seconds)
  }
}

/** Fade the bed and any variant. Pending ended callbacks from this contact cannot start audio again. */
export function endContact(ms = 130): void {
  const seconds = Math.max(0.1, Math.min(0.15, ms / 1000))
  contactGen += 1
  const bed = bedSource
  const bedAt = bedGain
  const variant = variantSource
  const variantAt = variantGain
  const level = bedLevel
  bedSource = null
  bedGain = null
  variantSource = null
  variantGain = null
  bedLevel = 0
  if (bed && bedAt) {
    fadeNode(bedAt, level, 0, seconds)
    stopLater(bed, seconds)
  }
  if (variant && variantAt) {
    fadeNode(variantAt, VARIANT_GAIN, 0, seconds)
    stopLater(variant, seconds)
  }
}

export function playCue(kind: Cue | null): boolean {
  if (!kind || !context || !gate.unlocked || gate.muted) return false
  if (contactActive() || sceneGuard) {
    contactYields += 1
    return false
  }
  const now = performance.now()
  if (now < playingUntil) return false
  const spoken = kind === 'disapprove'
  const replacement = kind === 'celebration_three_squeaks' || kind === 'proud_rise_beeps'
  const original = kind === 'sneeze_zip' || kind === 'peek_pop' || kind === 'pout_boop'
  const approved = kind === 'scan' || kind === 'giggle' || kind === 'surprise' || kind === 'yawn' || kind === 'wink' || kind === 'dizzy'
  if (!approved && !spoken && !original && !replacement && kind !== 'chirp') return false
  const voice = spoken ? voicePcm.get(kind) : undefined
  if (spoken && !voice) return false
  let samples: Float32Array
  let rate: number
  if (voice) {
    samples = voice.samples
    rate = voice.rate
  } else if (original) {
    const clip = originalSamples(kind)
    samples = clip.samples
    rate = clip.rate
  } else if (replacement) {
    const clip = replacementSamples(kind)
    samples = clip.samples
    rate = clip.rate
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
  gain.gain.value = kind in PLAYBACK_GAIN ? PLAYBACK_GAIN[kind] : 0.32
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
