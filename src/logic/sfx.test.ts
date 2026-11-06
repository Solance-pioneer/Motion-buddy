import { describe, expect, it } from 'vitest'
import { cueForHearState, encodeWav, gateCue, initialGate, initialMoveClock, initialTapClock, mutedFromStorage, noteFaceTap, noteMovement, renderCue, type MoveClock } from './sfx.ts'

describe('sound cues', () => {
  it('stays silent until a gesture unlocks it, then respects mute and cooldown', () => {
    const gate = initialGate()
    expect(gate.muted).toBe(false)
    expect(gate.unlocked).toBe(false)
    expect(gateCue(gate, 'chirp', 0)).toBe(false)
    gate.unlocked = true
    expect(gateCue(gate, 'chirp', 1_000)).toBe(true)
    gate.muted = true
    expect(gateCue(gate, 'chirp', 2_000)).toBe(false)
    gate.muted = false
    expect(gateCue(gate, 'chirp', 2_000)).toBe(true)
    expect(gateCue(gate, 'chirp', 2_100)).toBe(false)
    expect(gateCue(gate, 'chirp', 2_500)).toBe(true)
  })

  it('writes a short local chirp with a bounded peak', () => {
    const samples = renderCue('chirp', 22050)
    const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
    const duration = samples.length / 22050
    expect(duration).toBeGreaterThan(0.08)
    expect(duration).toBeLessThan(0.2)
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThanOrEqual(0.85)
    const wav = encodeWav(samples, 22050)
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF')
  })

  it('remembers an explicit mute and otherwise wants sound', () => {
    expect(mutedFromStorage(null)).toBe(false)
    expect(mutedFromStorage('{"muted":true}')).toBe(true)
    expect(mutedFromStorage('{"muted":false}')).toBe(false)
  })
})

function shove(clock: MoveClock, now: number, magnitude: number, extra?: Partial<Parameters<typeof noteMovement>[1]>) {
  return noteMovement(clock, {
    now,
    magnitude,
    reduced: false,
    muted: false,
    unlocked: true,
    allowDizzy: true,
    allowGrumpy: true,
    busyUntil: 0,
    ...extra,
  })
}

describe('movement chirps', () => {
  it('chirps every second distinct move and ignores jitter and a held tilt', () => {
    let clock = initialMoveClock()
    const cues: string[] = []
    for (let i = 0; i < 12; i += 1) {
      const step = shove(clock, 1_000, 0.2)
      clock = step.clock
      if (step.cue) cues.push(step.cue)
    }
    expect(cues).toEqual([])
    const first = shove(clock, 2_000, 1.2)
    clock = first.clock
    for (let i = 0; i < 8; i += 1) clock = shove(clock, 2_000 + i * 30, 1.3).clock
    expect(first.cue).toBeNull()
    const release = shove(clock, 3_000, 0.1)
    const second = shove(release.clock, 3_400, 1.2)
    expect(second.cue).toBe('chirp')
  })

  it('turns a rapid repeat into dizzy, then stays quiet, and respects mute and exclusion', () => {
    let clock = initialMoveClock()
    const cues: Array<string | null> = []
    for (const time of [0, 400, 800]) {
      const step = shove(clock, time, 0.2)
      clock = step.clock
      const up = shove(clock, time + 40, 1.2)
      clock = up.clock
      cues.push(up.cue)
      clock = shove(clock, time + 200, 0.1).clock
    }
    expect(cues).toEqual([null, 'chirp', 'dizzy'])
    const during = shove(clock, 900, 1.2)
    expect(during.cue).toBeNull()
    const muted = shove(initialMoveClock(), 0, 1.2, { muted: true })
    expect(muted.cue).toBeNull()
    let blocked = initialMoveClock()
    const burst: Array<string | null> = []
    for (const time of [0, 400, 800]) {
      blocked = shove(blocked, time, 0.1).clock
      const up = shove(blocked, time + 40, 1.2, { allowDizzy: false })
      blocked = up.clock
      burst.push(up.cue)
      blocked = shove(blocked, time + 200, 0.1).clock
    }
    expect(burst).toEqual([null, 'chirp', null])
    expect(shove(initialMoveClock(), 0, 1.2, { reduced: true }).cue).toBeNull()
    expect(shove(initialMoveClock(), 0, 1.2, { unlocked: false }).cue).toBeNull()
    const first = shove(initialMoveClock(), 0, 1.2)
    const released = shove(first.clock, 500, 0.1)
    const dropped = shove(released.clock, 2_000, 1.2, { busyUntil: 2_500 })
    expect(dropped.cue).toBeNull()
  })

  it('frowns after busy motion or repeated face taps, and ignores idle grumpy', () => {
    let clock = initialMoveClock()
    const cues: Array<string | null> = []
    for (let step = 0; step < 4; step += 1) {
      const time = step * 1_200
      clock = shove(clock, time, 0.1).clock
      const up = shove(clock, time + 40, 1.1)
      clock = up.clock
      cues.push(up.cue)
    }
    expect(cues).toEqual([null, 'chirp', null, 'grumpy'])
    expect(shove(clock, 4_000, 1.1).cue).toBeNull()
    expect(cueForHearState({ expression: 'grumpy', reaction: 'none', reduced: false, allowDizzy: true, allowStartled: true })).toBeNull()

    let taps = initialTapClock()
    const faces: Array<string | null> = []
    for (let step = 0; step < 5; step += 1) {
      const next = noteFaceTap(taps, { now: step * 400, reduced: false, muted: false, unlocked: true, allowGrumpy: true, busyUntil: 0 })
      taps = next.clock
      faces.push(next.cue)
    }
    expect(faces).toEqual([null, null, null, 'disapprove', null])
    const ui = noteFaceTap(initialTapClock(), { now: 0, reduced: false, muted: false, unlocked: true, allowGrumpy: false, busyUntil: 0 })
    expect(ui.frown).toBe(false)
    expect(noteFaceTap(initialTapClock(), { now: 0, reduced: true, muted: false, unlocked: true, allowGrumpy: true, busyUntil: 0 }).frown).toBe(false)
  })
})