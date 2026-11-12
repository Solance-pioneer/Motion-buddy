import { describe, expect, it } from 'vitest'
import { GENRE_ART } from '../view/genre-art.tsx'
import { GENRE_PACK, GENRE_PULSE_MIN_MS, genreById, genreFromStorage, genreNotes, genrePulse } from './genre-pack.ts'

describe('genre pack', () => {
  it('gives every look one entry, a drawing, a bounce, and an original sting', () => {
    const ids = GENRE_PACK.map((genre) => genre.id)
    expect(ids).toEqual([
      'indie', 'hip-hop', 'country', 'disco', 'rave-iator',
      'rock', 'pop', 'jazz', 'blues', 'classical', 'electronic', 'metal', 'punk',
      'reggae', 'funk', 'soul', 'gospel', 'folk', 'ambient', 'lo-fi', 'k-pop', 'latin', 'synthwave', 'drum-and-bass',
    ])
    expect(genreById('metal')?.beat.tilt).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const genre of GENRE_PACK) {
      expect(genre.feature).toBe('genre-looks')
      expect(genre.tier).toBe('premium')
      expect(genre.beat.partyScale).toBeGreaterThan(genre.beat.scale)
      expect(GENRE_ART[genre.id]).toBeTypeOf('function')
      const notes = genreNotes(genre.sound, false)
      expect(notes.length).toBeGreaterThan(0)
      expect(notes.every((note) => note.hz > 40 && note.dur < 2)).toBe(true)
      expect(Math.max(...notes.map((note) => note.at + note.dur))).toBeLessThan(8)
    }
    expect(genreFromStorage('disco')).toBe('disco')
    expect(genreFromStorage('nope')).toBe('none')
    expect(genreById('country')?.label).toBe('Country')
    expect(GENRE_PULSE_MIN_MS).toBeGreaterThan(333)
  })

  it('bounces from the genre amounts and refuses a fast or reduced flash', () => {
    const indie = genreById('indie')
    if (!indie) throw new Error('missing indie')
    const first = genrePulse({ now: 1_000, lastAt: 0, beat: true, reduced: false, party: false, scale: indie.beat.scale, partyScale: indie.beat.partyScale })
    expect(first).toMatchObject({ pulse: true, scale: indie.beat.scale })
    const party = genrePulse({ now: 1_000, lastAt: 0, beat: true, reduced: false, party: true, scale: indie.beat.scale, partyScale: indie.beat.partyScale })
    expect(party.scale).toBe(indie.beat.partyScale)
    expect(genrePulse({ now: 1_200, lastAt: first.lastAt, beat: true, reduced: false, party: true, scale: 1.04, partyScale: 1.08 }).pulse).toBe(false)
    expect(genrePulse({ now: 5_000, lastAt: 0, beat: true, reduced: true, party: true, scale: 1.04, partyScale: 1.08 })).toEqual({ pulse: false, scale: 1, lastAt: 0 })
    const calm = genreNotes(indie.sound, false)
    const faster = genreNotes(indie.sound, true)
    expect(faster[faster.length - 1].at).toBeLessThan(calm[calm.length - 1].at)
  })
})
