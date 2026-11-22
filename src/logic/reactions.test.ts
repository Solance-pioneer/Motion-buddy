import { describe, expect, it } from 'vitest'
import { CAR_ANNOY_COOLDOWN_MS, CAR_ANNOY_FAST, CAR_ANNOY_HOLD_MS } from './car-annoyance.ts'
import {
  COOLDOWN_MS,
  DIZZY_MS,
  FAST_HOLD_MS,
  forceReaction,
  GENTLE_HOLD_MS,
  initialReaction,
  motionBand,
  RECOVERY_MS,
  stepReaction,
  type ReactionClock,
} from './reactions.ts'

function run(clock: ReactionClock, ms: number, band: 'still' | 'gentle' | 'fast', allow = { startled: true, dizzy: true }, car = false) {
  let current = clock
  let left = ms
  while (left > 0) {
    const dt = Math.min(16, left)
    current = stepReaction(current, dt, {
      band,
      allowStartled: allow.startled,
      allowDizzy: allow.dizzy,
      car,
    })
    left -= dt
  }
  return current
}

describe('motionBand', () => {
  it('keeps a small move still and separates a gentle move from a quicker one', () => {
    expect(motionBand(0.4, 'medium')).toBe('still')
    expect(motionBand(1.6, 'medium')).toBe('gentle')
    expect(motionBand(4.6, 'medium')).toBe('fast')
    expect(motionBand(1.1, 'low')).toBe('still')
    expect(motionBand(2, 'low')).toBe('gentle')
    expect(motionBand(1.1, 'high')).toBe('gentle')
  })
})

describe('car annoyance', () => {
  it('ignores ordinary driving and reacts only after a sustained jolt, then waits longer', () => {
    expect(motionBand(1.5, 'medium', true)).toBe('still')
    expect(motionBand(1.5, 'high', true)).toBe('still')
    expect(motionBand(1.5, 'medium')).toBe('gentle')
    expect(motionBand(3.5, 'medium', true)).toBe('gentle')
    expect(motionBand(CAR_ANNOY_FAST, 'low', true)).toBe('fast')

    const brief = run(initialReaction(), CAR_ANNOY_HOLD_MS - 40, 'gentle', { startled: true, dizzy: true }, true)
    expect(brief.name).toBe('none')
    const worried = run(initialReaction(), CAR_ANNOY_HOLD_MS + 20, 'gentle', { startled: true, dizzy: true }, true)
    expect(worried.name).toBe('worried')
    let done = worried
    for (let i = 0; i < 200 && done.name !== 'none'; i += 1) {
      done = stepReaction(done, 16, { band: 'still', allowStartled: true, allowDizzy: true, car: true })
    }
    expect(done.name).toBe('none')
    expect(done.cooldown).toBe(CAR_ANNOY_COOLDOWN_MS)
    const during = run(done, 500, 'gentle', { startled: true, dizzy: true }, true)
    expect(during.name).toBe('none')
    expect(during.cooldown).toBe(CAR_ANNOY_COOLDOWN_MS - 500)

    const desk = run(initialReaction(), GENTLE_HOLD_MS + 20, 'gentle')
    expect(desk.name).toBe('worried')
    let deskDone = desk
    for (let i = 0; i < 200 && deskDone.name !== 'none'; i += 1) {
      deskDone = stepReaction(deskDone, 16, { band: 'still', allowStartled: true, allowDizzy: true })
    }
    expect(deskDone.cooldown).toBe(COOLDOWN_MS)
  })
})

describe('stepReaction', () => {
  it('starts worried only after a gentle move holds, then startled, then idle', () => {
    const early = run(initialReaction(), GENTLE_HOLD_MS - 40, 'gentle')
    expect(early.name).toBe('none')
    const worried = run(initialReaction(), GENTLE_HOLD_MS + 20, 'gentle')
    expect(worried.name).toBe('worried')
    const startled = run(worried, 500, 'still')
    expect(startled.name).toBe('startled')
    const done = run(startled, 800, 'still')
    expect(done.name).toBe('none')
    expect(done.cooldown).toBeGreaterThan(0)
  })

  it('prefers dizziness for a quicker move and then recovers', () => {
    const dizzy = run(initialReaction(), FAST_HOLD_MS + 20, 'fast')
    expect(dizzy.name).toBe('dizzy')
    const recovery = run(dizzy, DIZZY_MS + 40, 'still')
    expect(recovery.name).toBe('recovery')
    const done = run(recovery, RECOVERY_MS + 40, 'still')
    expect(done.name).toBe('none')
  })

  it('does not start a reaction that was turned off, and does not turn it back on', () => {
    const blocked = run(initialReaction(), 1_000, 'gentle', { startled: false, dizzy: true })
    expect(blocked.name).toBe('none')
    const dizzyBlocked = run(initialReaction(), 1_000, 'fast', { startled: true, dizzy: false })
    expect(dizzyBlocked.name).toBe('none')
  })

  it('waits out the cooldown before another reaction', () => {
    const cooling = { ...initialReaction(), cooldown: COOLDOWN_MS }
    const during = run(cooling, 500, 'fast')
    expect(during.name).toBe('none')
    expect(during.cooldown).toBeLessThan(COOLDOWN_MS)
    const after = run(cooling, COOLDOWN_MS + FAST_HOLD_MS + 40, 'fast')
    expect(after.name).toBe('dizzy')
  })

  it('drops a recovery that is no longer allowed', () => {
    const recovery = { ...initialReaction(), name: 'recovery' as const, elapsed: 200 }
    const cleared = stepReaction(recovery, 16, { band: 'still', allowStartled: true, allowDizzy: false })
    expect(cleared.name).toBe('none')
  })

  it('lets a labelled simulation start without a sensor sample', () => {
    expect(forceReaction('startled').name).toBe('worried')
    expect(forceReaction('dizzy').name).toBe('dizzy')
  })
})
