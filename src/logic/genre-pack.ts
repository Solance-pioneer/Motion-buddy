/** One entry is a whole genre. Drawings live beside it, keyed by id. */
export const GENRE_PACK = [
  { id: 'indie', label: 'Indie', tier: 'premium', feature: 'genre-looks', beat: { scale: 1.04, partyScale: 1.08, tilt: 0 }, sound: { tempo: 92, rootHz: 220, waveform: 'sine', scale: [0, 2, 4, 7], pattern: [1, 0, 1, 0, 1, 0, 1, 0] } },
  { id: 'hip-hop', label: 'Hip-hop', tier: 'premium', feature: 'genre-looks', beat: { scale: 1.05, partyScale: 1.1, tilt: 0 }, sound: { tempo: 90, rootHz: 110, waveform: 'square', scale: [0, 0, 3, 5], pattern: [1, 0, 0, 1, 0, 1, 0, 0] } },
  { id: 'country', label: 'Country', tier: 'premium', feature: 'genre-looks', beat: { scale: 1.03, partyScale: 1.07, tilt: 0 }, sound: { tempo: 104, rootHz: 196, waveform: 'triangle', scale: [0, 4, 7, 4], pattern: [1, 0, 1, 0, 1, 1, 0, 0] } },
  { id: 'disco', label: 'Disco', tier: 'premium', feature: 'genre-looks', beat: { scale: 1.04, partyScale: 1.09, tilt: 0 }, sound: { tempo: 118, rootHz: 247, waveform: 'square', scale: [0, 7, 12, 7], pattern: [1, 0, 1, 0, 1, 0, 1, 0] } },
  { id: 'rave-iator', label: 'Rave', tier: 'premium', feature: 'genre-looks', beat: { scale: 1.05, partyScale: 1.1, tilt: 0 }, sound: { tempo: 140, rootHz: 330, waveform: 'sawtooth', scale: [0, 3, 7, 10], pattern: [1, 1, 0, 1, 1, 0, 1, 0] } },
] as const

export type GenreLook = (typeof GENRE_PACK)[number]['id']
export type GenreId = 'none' | GenreLook
export type GenreSound = (typeof GENRE_PACK)[number]['sound']

/** Longer than 1/3 second, so a flash stays under 3 a second. */
export const GENRE_PULSE_MIN_MS = 340

export function genreById(id: string) {
  return GENRE_PACK.find((genre) => genre.id === id)
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

/**
 * One bounce per accepted beat, using that genre's own amounts.
 * Reduced motion never pulses. Beats closer than GENRE_PULSE_MIN_MS are ignored.
 */
export function genrePulse(input: { now: number; lastAt: number; beat: boolean; reduced: boolean; party: boolean; scale: number; partyScale: number }): { pulse: boolean; scale: number; lastAt: number } {
  if (input.reduced || !input.beat || input.now - input.lastAt < GENRE_PULSE_MIN_MS) {
    return { pulse: false, scale: 1, lastAt: input.lastAt }
  }
  return { pulse: true, scale: input.party ? input.partyScale : input.scale, lastAt: input.now }
}
