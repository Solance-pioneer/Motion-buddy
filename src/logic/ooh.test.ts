import { describe, expect, it } from 'vitest'
import { OOH_SOURCE, choosePetNote, dragOohCue, nextCodedIdle, noteOohRun, oohClip, oohIdleDue, oohReleaseSeconds, OOH_IDLE_COOLDOWN_MS, OOH_PET_WEIGHT } from './ooh.ts'

describe('ooh', () => {
  it('uses the contact clip unless the one constant says glide', () => {
    expect(OOH_SOURCE).toBe('contact')
    expect(oohClip().key).toBe('curious_contact_loop')
    expect(oohClip().b64.length).toBeGreaterThan(1000)
  })

  it('picks ooh about 55% of the time and never three times in a row', () => {
    let run = 0
    let ooh = 0
    let max = 0
    const seen = new Set<string>()
    let seed = 1
    for (let i = 0; i < 8_000; i += 1) {
      seed = (seed * 16807) % 2147483647
      const choice = choosePetNote(seed / 2147483647, run)
      if (choice === 'ooh') {
        ooh += 1
        run += 1
        max = Math.max(max, run)
      } else {
        run = 0
        seen.add(choice)
      }
    }
    expect(ooh / 8000).toBeGreaterThan(0.48)
    expect(ooh / 8000).toBeLessThan(0.58)
    expect(max).toBeLessThanOrEqual(2)
    expect(max).toBe(2)
    expect(seen.size).toBe(5)
    expect(choosePetNote(0, 2)).not.toBe('ooh')
    expect(choosePetNote(0.5, 1)).toBe('ooh')
    expect(OOH_PET_WEIGHT).toBe(0.55)
    expect(noteOohRun(1, 'ooh')).toBe(2)
    expect(noteOohRun(2, 'pet_soft_squeak')).toBe(0)
  })

  it('waits 45s before another idle ooh', () => {
    expect(OOH_IDLE_COOLDOWN_MS).toBe(45_000)
    expect(oohIdleDue(0, 44_999)).toBe(false)
    expect(oohIdleDue(0, 45_000)).toBe(true)
    expect(oohIdleDue(10_000, 50_000)).toBe(false)
    expect(nextCodedIdle('sheet_ghost', new Set(['ninja', 'cord_hero', 'racer', 'sheet_ghost', 'ooh']))).toBe('ooh')
    expect(nextCodedIdle('ooh', new Set(['ninja', 'ooh']))).toBe('ninja')
    expect(nextCodedIdle('sheet_ghost', new Set(['ninja', 'cord_hero', 'racer', 'sheet_ghost']))).toBe('ninja')
    expect(nextCodedIdle(null, new Set(['racer']))).toBe('racer')
  })

  it('plays one ooh per drag and fades the release inside 100–150ms', () => {
    expect(dragOohCue(false)).toBe('ooh')
    expect(dragOohCue(true)).toBeNull()
    expect(oohReleaseSeconds(130)).toBeGreaterThanOrEqual(0.1)
    expect(oohReleaseSeconds(130)).toBeLessThanOrEqual(0.15)
    expect(oohReleaseSeconds(50)).toBe(0.1)
    expect(oohReleaseSeconds(400)).toBe(0.15)
  })
})
