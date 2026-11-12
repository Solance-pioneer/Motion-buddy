/** Premium genre looks. A new look is one entry here, plus its drawing. */
export const GENRE_LOOKS = [
  { id: 'indie', label: 'Indie' },
  { id: 'hip-hop', label: 'Hip-hop' },
  { id: 'country', label: 'Country' },
  { id: 'disco', label: 'Disco' },
  { id: 'rave-iator', label: 'Rave' },
] as const

export type GenreLook = (typeof GENRE_LOOKS)[number]['id']
export type GenreId = 'none' | GenreLook

/** Longer than 1/3 second, so a flash stays under 3 a second. */
export const GENRE_PULSE_MIN_MS = 340

export function isGenreLook(id: string): id is GenreLook {
  return GENRE_LOOKS.some((look) => look.id === id)
}

export function genreFromStorage(raw: string | null): GenreId {
  if (raw && isGenreLook(raw)) return raw
  return 'none'
}

/**
 * One small bounce per accepted beat. Party mode is a slightly bigger bounce.
 * Reduced motion never pulses. Beats closer than GENRE_PULSE_MIN_MS are ignored.
 */
export function genrePulse(input: { now: number; lastAt: number; beat: boolean; reduced: boolean; party: boolean }): { pulse: boolean; scale: number; lastAt: number } {
  if (input.reduced || !input.beat || input.now - input.lastAt < GENRE_PULSE_MIN_MS) {
    return { pulse: false, scale: 1, lastAt: input.lastAt }
  }
  return { pulse: true, scale: input.party ? 1.08 : 1.04, lastAt: input.now }
}
