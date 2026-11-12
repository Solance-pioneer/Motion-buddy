import { describe, expect, it } from 'vitest'
import { GENRE_LOOKS, GENRE_PULSE_MIN_MS, genreFromStorage, genrePulse } from './genres.ts'

describe('genre looks', () => {
  it('lists indie, hip-hop, country, disco, and rave as one entry each', () => {
    expect(GENRE_LOOKS.map((look) => look.id)).toEqual(['indie', 'hip-hop', 'country', 'disco', 'rave-iator'])
    expect(genreFromStorage('country')).toBe('country')
    expect(genreFromStorage('nope')).toBe('none')
    expect(GENRE_PULSE_MIN_MS).toBeGreaterThan(333)
  })

  it('bounces on a beat, harder in party mode, and never flashes in reduced motion or faster than the cap', () => {
    const first = genrePulse({ now: 1_000, lastAt: 0, beat: true, reduced: false, party: false })
    expect(first.pulse).toBe(true)
    expect(first.scale).toBe(1.04)
    const party = genrePulse({ now: 1_000, lastAt: 0, beat: true, reduced: false, party: true })
    expect(party.scale).toBeGreaterThan(first.scale)
    const soon = genrePulse({ now: 1_200, lastAt: first.lastAt, beat: true, reduced: false, party: true })
    expect(soon.pulse).toBe(false)
    expect(soon.scale).toBe(1)
    const later = genrePulse({ now: first.lastAt + GENRE_PULSE_MIN_MS, lastAt: first.lastAt, beat: true, reduced: false, party: false })
    expect(later.pulse).toBe(true)
    expect(genrePulse({ now: 5_000, lastAt: 0, beat: true, reduced: true, party: true })).toEqual({ pulse: false, scale: 1, lastAt: 0 })
  })
})
