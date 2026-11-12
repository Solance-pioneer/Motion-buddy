/** One entry is a whole genre. Drawings live beside it, keyed by id. Emo is its own genre and shares the punk pack. */
export type GenreGrid = 'onset' | 'offbeat' | 'kick'
export type HeadbangSpeed = 'slow' | 'medium' | 'fast'

export interface GenreSound {
  tempo: number
  rootHz: number
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth'
  scale: number[]
  pattern: number[]
}

export interface GenreEntry {
  id: string
  label: string
  pack: string
  tier: 'premium'
  feature: string
  idle: string
  grid: GenreGrid
  reaction: string
  beat: { scale: number; partyScale: number; tilt: number }
  sound: GenreSound
}

function pack(id: string, label: string, packId: string, idle: string, grid: GenreGrid, reaction: string, beat: GenreEntry['beat'], sound: GenreSound): GenreEntry {
  return { id, label, pack: packId, tier: 'premium', feature: `genre-${packId}`, idle, grid, reaction, beat, sound }
}

export const GENRE_PACK: readonly GenreEntry[] = [
  pack('pop', 'Pop', 'pop', 'step', 'onset', 'freeze', { scale: 1.04, partyScale: 1.09, tilt: 8 }, { tempo: 118, rootHz: 262, waveform: 'sine', scale: [0, 4, 7, 12], pattern: [1, 0, 1, 1, 0, 1, 0, 0] }),
  pack('rock', 'Rock', 'rock', 'nod', 'onset', 'nod', { scale: 1.05, partyScale: 1.1, tilt: 6 }, { tempo: 120, rootHz: 165, waveform: 'sawtooth', scale: [0, 0, 7, 5], pattern: [1, 0, 1, 0, 1, 0, 0, 1] }),
  pack('hip-hop', 'Hip-hop / rap', 'hip-hop', 'nod', 'onset', 'heavy', { scale: 1.06, partyScale: 1.11, tilt: 0 }, { tempo: 92, rootHz: 110, waveform: 'square', scale: [0, 0, 3, 5], pattern: [1, 0, 0, 1, 0, 1, 0, 0] }),
  pack('electronic', 'Electronic', 'electronic', 'bounce', 'kick', 'kick', { scale: 1.06, partyScale: 1.12, tilt: 0 }, { tempo: 128, rootHz: 220, waveform: 'square', scale: [0, 7, 0, 12], pattern: [1, 0, 1, 0, 1, 0, 1, 0] }),
  pack('k-pop', 'K-pop', 'k-pop', 'choreo', 'onset', 'point', { scale: 1.04, partyScale: 1.09, tilt: 0 }, { tempo: 126, rootHz: 294, waveform: 'sine', scale: [0, 4, 7, 11], pattern: [1, 0, 1, 1, 0, 1, 0, 1] }),
  pack('classical', 'Classical', 'classical', 'breath', 'onset', 'shiver', { scale: 1.03, partyScale: 1.05, tilt: 0 }, { tempo: 72, rootHz: 262, waveform: 'sine', scale: [0, 4, 7, 12], pattern: [1, 0, 0, 1, 0, 1, 0, 0] }),
  pack('reggae', 'Reggae', 'reggae', 'sway', 'offbeat', 'offbeat', { scale: 1.04, partyScale: 1.08, tilt: 3 }, { tempo: 78, rootHz: 196, waveform: 'sine', scale: [0, 0, 5, 7], pattern: [1, 0, 0, 1, 0, 0, 1, 0] }),
  pack('soul', 'R&B / soul', 'soul', 'sway', 'onset', 'glow', { scale: 1.03, partyScale: 1.06, tilt: 0 }, { tempo: 86, rootHz: 220, waveform: 'sine', scale: [0, 3, 7, 10], pattern: [1, 0, 1, 0, 0, 1, 0, 0] }),
  pack('country', 'Country', 'country', 'step', 'onset', 'tip', { scale: 1.03, partyScale: 1.07, tilt: -8 }, { tempo: 104, rootHz: 196, waveform: 'triangle', scale: [0, 4, 7, 4], pattern: [1, 0, 1, 0, 1, 1, 0, 0] }),
  pack('jazz', 'Jazz', 'jazz', 'lean', 'onset', 'snap', { scale: 1.03, partyScale: 1.06, tilt: 2 }, { tempo: 96, rootHz: 196, waveform: 'triangle', scale: [0, 3, 5, 10], pattern: [1, 0, 0, 1, 0, 1, 0, 1] }),
  pack('blues', 'Blues', 'blues', 'rock', 'onset', 'puff', { scale: 1.03, partyScale: 1.06, tilt: 0 }, { tempo: 76, rootHz: 147, waveform: 'triangle', scale: [0, 3, 5, 6], pattern: [1, 0, 0, 1, 0, 0, 1, 0] }),
  pack('metal', 'Metal', 'metal', 'headbang', 'onset', 'headbang', { scale: 1.06, partyScale: 1.12, tilt: 14 }, { tempo: 160, rootHz: 98, waveform: 'sawtooth', scale: [0, 1, 6, 7], pattern: [1, 1, 0, 1, 1, 0, 1, 1] }),
  pack('latin', 'Latin', 'latin', 'sway', 'onset', 'spin', { scale: 1.05, partyScale: 1.1, tilt: 12 }, { tempo: 168, rootHz: 220, waveform: 'square', scale: [0, 4, 7, 9], pattern: [1, 0, 1, 1, 0, 1, 0, 1] }),
  pack('punk', 'Punk', 'punk', 'pogo', 'onset', 'pogo', { scale: 1.06, partyScale: 1.12, tilt: 0 }, { tempo: 176, rootHz: 185, waveform: 'square', scale: [0, 0, 5, 7], pattern: [1, 1, 1, 0, 1, 0, 1, 0] }),
  pack('indie', 'Indie', 'indie', 'shuffle', 'onset', 'double', { scale: 1.04, partyScale: 1.08, tilt: 0 }, { tempo: 96, rootHz: 220, waveform: 'sine', scale: [0, 2, 4, 7], pattern: [1, 0, 1, 0, 1, 0, 1, 0] }),
  pack('emo', 'Emo', 'punk', 'down', 'onset', 'flick', { scale: 1.04, partyScale: 1.08, tilt: 12 }, { tempo: 104, rootHz: 196, waveform: 'sine', scale: [0, 3, 7, 10], pattern: [1, 0, 0, 1, 0, 1, 0, 0] }),
]

export type GenreLook = (typeof GENRE_PACK)[number]['id']
export type GenreId = 'none' | GenreLook

/** Longer than 1/3 second, so a flash stays under 3 a second. */
export const GENRE_PULSE_MIN_MS = 340
export const HIGH_CENTROID_HZ = 1_600
export const HIGH_BAND_MIN = 0.12

export function genreById(id: string): GenreEntry | undefined {
  return GENRE_PACK.find((genre) => genre.id === id)
}

export function shownGenre(id: string, unlocked: (feature: string) => boolean): GenreId {
  const look = genreById(id)
  if (!look || !unlocked('genre-looks') || !unlocked(look.feature)) return 'none'
  return look.id as GenreId
}

export function isGenreLook(id: string): id is GenreLook {
  return GENRE_PACK.some((genre) => genre.id === id)
}

export function genreFromStorage(raw: string | null): GenreId {
  if (raw && isGenreLook(raw)) return raw
  return 'none'
}

export function genreNotes(sound: GenreSound, party: boolean): { hz: number; at: number; dur: number }[] {
  const step = (60 / sound.tempo) / 2 * (party ? 0.85 : 1)
  return sound.pattern.flatMap((gate, index) => {
    if (!gate) return []
    const semis = sound.scale[index % sound.scale.length]
    return [{ hz: sound.rootHz * 2 ** (semis / 12), at: index * step, dur: step * 0.65 }]
  })
}

export function genrePulse(input: { now: number; lastAt: number; beat: boolean; reduced: boolean; party: boolean; scale: number; partyScale: number }): { pulse: boolean; scale: number; lastAt: number } {
  if (input.reduced || !input.beat || input.now - input.lastAt < GENRE_PULSE_MIN_MS) {
    return { pulse: false, scale: 1, lastAt: input.lastAt }
  }
  return { pulse: true, scale: input.party ? input.partyScale : input.scale, lastAt: input.now }
}

export function spectralCentroid(magnitudes: ArrayLike<number>, sampleRate: number, fftSize: number): number {
  const width = sampleRate / fftSize
  let weighted = 0
  let sum = 0
  for (let i = 0; i < magnitudes.length; i += 1) {
    const power = magnitudes[i]
    weighted += (i + 0.5) * width * power
    sum += power
  }
  return sum === 0 ? 0 : weighted / sum
}

/** Average energy from 2 kHz to 6 kHz. Magnitudes are 0–1. */
export function highBandEnergy(magnitudes: ArrayLike<number>, sampleRate: number, fftSize: number): number {
  const width = sampleRate / fftSize
  let sum = 0
  let count = 0
  for (let i = 0; i < magnitudes.length; i += 1) {
    const hz = (i + 0.5) * width
    if (hz < 2_000 || hz > 6_000) continue
    sum += magnitudes[i]
    count += 1
  }
  return count === 0 ? 0 : sum / count
}

export function isHighNote(centroidHz: number, band: number): boolean {
  return centroidHz >= HIGH_CENTROID_HZ && band >= HIGH_BAND_MIN
}

export interface GenreHitClock {
  lastAt: number
  pendingOff: number
}

export function initialGenreHitClock(): GenreHitClock {
  return { lastAt: -10_000, pendingOff: 0 }
}

/**
 * Onset and kick fire on the detected bass hit. Off-beat waits half a gap.
 * A high-note genre can also fire from the high band. Reduced motion never fires.
 * Nothing fires again before GENRE_PULSE_MIN_MS.
 */
export function planGenreHit(clock: GenreHitClock, input: { now: number; onset: boolean; meanGap: number; grid: GenreGrid; reduced: boolean; high: boolean; hearsHigh: boolean }): { clock: GenreHitClock; hit: boolean; wide: boolean; shiver: boolean } {
  if (input.reduced) return { clock: { ...clock, pendingOff: 0 }, hit: false, wide: false, shiver: false }
  const spaced = input.now - clock.lastAt >= GENRE_PULSE_MIN_MS
  if (input.hearsHigh && input.high && spaced) {
    return { clock: { lastAt: input.now, pendingOff: 0 }, hit: true, wide: true, shiver: true }
  }
  if (input.grid === 'offbeat') {
    if (input.onset) {
      const half = Math.min(600, Math.max(180, (input.meanGap > 0 ? input.meanGap : 500) / 2))
      return { clock: { ...clock, pendingOff: input.now + half }, hit: false, wide: false, shiver: false }
    }
    if (clock.pendingOff > 0 && input.now >= clock.pendingOff && spaced) {
      return { clock: { lastAt: input.now, pendingOff: 0 }, hit: true, wide: false, shiver: false }
    }
    return { clock, hit: false, wide: false, shiver: false }
  }
  if (input.onset && spaced) return { clock: { lastAt: input.now, pendingOff: 0 }, hit: true, wide: false, shiver: false }
  return { clock, hit: false, wide: false, shiver: false }
}

export function headbangFromStorage(raw: string | null): HeadbangSpeed {
  if (raw === 'slow' || raw === 'fast') return raw
  return 'medium'
}

/** Metal only. Party mode nods harder. Reduced motion is handled by the caller. */
export function headbangTilt(base: number, speed: HeadbangSpeed, party: boolean): number {
  const mul = speed === 'slow' ? 0.55 : speed === 'fast' ? 1.45 : 1
  return base * mul * (party ? 1.25 : 1)
}
