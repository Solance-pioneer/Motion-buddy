import { describe, expect, it } from 'vitest'
import { GENRE_ART } from '../view/genre-art.tsx'
import { GENRE_PACK, GENRE_PULSE_MIN_MS, genreById, genreFromStorage, genreNotes, headbangTilt, highBandEnergy, initialGenreHitClock, isHighNote, planGenreHit, spectralCentroid } from './genre-pack.ts'

const SHORTLIST = ['pop', 'rock', 'hip-hop', 'electronic', 'k-pop', 'classical', 'rave', 'reggae', 'soul', 'country', 'jazz', 'blues', 'metal', 'latin', 'punk', 'indie', 'emo']

describe('genre pack', () => {
  it('lists the shortlist batch and gives each look a pack, a drawing, and a sting', () => {
    expect(GENRE_PACK.map((genre) => genre.id)).toEqual(SHORTLIST)
    expect(GENRE_PACK).toHaveLength(17)
    expect(genreById('rave')).toMatchObject({ pack: 'rave', grid: 'kick', strobe: true })
    expect(genreById('emo')).toMatchObject({ pack: 'punk', feature: 'genre-punk' })
    expect(genreById('punk')?.feature).toBe('genre-punk')
    expect(genreById('reggae')?.grid).toBe('offbeat')
    expect(genreById('metal')).toMatchObject({ reaction: 'headbang', strobe: true })
    expect(['reggae', 'soul', 'country', 'jazz', 'blues', 'metal', 'latin', 'punk', 'indie'].every((id) => genreById(id))).toBe(true)
    for (const genre of GENRE_PACK) {
      expect(genre.feature).toBe(`genre-${genre.pack}`)
      expect(genre.tier).toBe('premium')
      expect(genre.beat.partyScale).toBeGreaterThan(genre.beat.scale)
      expect(GENRE_ART[genre.id as keyof typeof GENRE_ART]).toBeTypeOf('function')
      const notes = genreNotes(genre.sound, false)
      expect(notes.length).toBeGreaterThan(0)
      expect(Math.max(...notes.map((note) => note.at + note.dur))).toBeLessThan(8)
    }
    expect(genreById('electronic')?.grid).toBe('kick')
    expect(genreById('classical')?.reaction).toBe('shiver')
    expect(genreFromStorage('disco')).toBe('none')
    expect(genreFromStorage('pop')).toBe('pop')
    expect(GENRE_PULSE_MIN_MS).toBeGreaterThan(333)
  })

  it('fires electronic on each kick, reggae on the off-beat, and classical on a high note', () => {
    let clock = initialGenreHitClock()
    const kicks = [1_000, 1_470, 1_940]
    const hits: number[] = []
    for (const now of kicks) {
      const step = planGenreHit(clock, { now, onset: true, meanGap: 470, grid: 'kick', reduced: false, high: false, hearsHigh: false })
      clock = step.clock
      if (step.hit) hits.push(now)
    }
    expect(hits).toEqual(kicks)
    const crowded = planGenreHit(clock, { now: kicks[2] + 200, onset: true, meanGap: 470, grid: 'kick', reduced: false, high: false, hearsHigh: false, strobe: true })
    expect(crowded.hit).toBe(true)
    expect(crowded.flash).toBe(false)
    const again = planGenreHit(crowded.clock, { now: kicks[2] + 200 + 340, onset: true, meanGap: 470, grid: 'kick', reduced: false, high: false, hearsHigh: false, strobe: true })
    expect(again.flash).toBe(true)
    const doubled = planGenreHit(initialGenreHitClock(), { now: 3_000, onset: true, meanGap: 344, grid: 'double', reduced: false, high: false, hearsHigh: false, strobe: true })
    expect(doubled.hit).toBe(true)
    expect(doubled.flash).toBe(true)
    const echo = planGenreHit(doubled.clock, { now: doubled.clock.pendingOff, onset: false, meanGap: 344, grid: 'double', reduced: false, high: false, hearsHigh: false, strobe: true })
    expect(echo.hit).toBe(true)
    expect(echo.flash).toBe(false)

    const onset = planGenreHit(initialGenreHitClock(), { now: 1_000, onset: true, meanGap: 500, grid: 'offbeat', reduced: false, high: false, hearsHigh: false })
    expect(onset.hit).toBe(false)
    expect(onset.clock.pendingOff).toBe(1_250)
    const off = planGenreHit(onset.clock, { now: 1_250, onset: false, meanGap: 500, grid: 'offbeat', reduced: false, high: false, hearsHigh: false })
    expect(off.hit).toBe(true)

    const quiet = planGenreHit(initialGenreHitClock(), { now: 2_000, onset: false, meanGap: 0, grid: 'onset', reduced: false, high: true, hearsHigh: true })
    expect(quiet).toMatchObject({ hit: true, wide: true, shiver: true })
    const held = planGenreHit(quiet.clock, { now: 2_200, onset: false, meanGap: 0, grid: 'onset', reduced: true, high: true, hearsHigh: true })
    expect(held.hit).toBe(false)
  })

  it('treats a bright spectrum as a high note and keeps metal nods ordered by speed', () => {
    const rate = 48_000
    const fft = 1_024
    const bins = new Float32Array(32)
    bins[2] = 0.9
    expect(isHighNote(spectralCentroid(bins, rate, fft), highBandEnergy(bins, rate, fft))).toBe(false)
    const bright = new Float32Array(200)
    for (let i = 50; i < 110; i += 1) bright[i] = 0.5
    expect(spectralCentroid(bright, rate, fft)).toBeGreaterThan(1_600)
    expect(isHighNote(spectralCentroid(bright, rate, fft), highBandEnergy(bright, rate, fft))).toBe(true)
    const slow = headbangTilt(14, 'slow', false)
    const medium = headbangTilt(14, 'medium', false)
    const fast = headbangTilt(14, 'fast', false)
    expect(slow).toBeLessThan(medium)
    expect(medium).toBeLessThan(fast)
    expect(headbangTilt(14, 'medium', true)).toBeGreaterThan(medium)
  })
})
