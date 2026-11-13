import { describe, expect, it } from 'vitest'
import { bassEnergy, initialBeatClock, stepBeat, tempoBpm } from './beat.ts'

describe('beat listening', () => {
  it('reads the bass band and ignores a steady rumble', () => {
    const bins = new Array(32).fill(0.2)
    bins[2] = 0.9
    const energy = bassEnergy(bins, 48_000, 1024)
    expect(energy).toBeGreaterThan(0.2)
    let clock = initialBeatClock()
    for (let i = 0; i < 40; i += 1) {
      const step = stepBeat(clock, 0.2, i * 50, 'steady')
      clock = step.clock
      expect(step.beat).toBe(false)
    }
  })

  it('marks an onset and estimates tempo, and hype is easier than chill', () => {
    let clock = { ...initialBeatClock(), floor: 0.2, primed: true }
    const quiet = stepBeat(clock, 0.22, 1_000, 'steady')
    expect(quiet.beat).toBe(false)
    const hit = stepBeat(quiet.clock, 0.5, 1_400, 'steady')
    expect(hit.beat).toBe(true)
    const again = stepBeat(hit.clock, 0.5, 1_500, 'steady')
    expect(again.beat).toBe(false)
    const party = stepBeat({ ...initialBeatClock(), floor: 0.2, primed: true }, 0.3, 2_000, 'party')
    expect(party.beat).toBe(true)
    expect(tempoBpm([500, 500, 500])).toBe(120)
  })
})
