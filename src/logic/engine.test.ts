import { describe, expect, it } from 'vitest'
import { advance, CompanionEngine } from './engine.ts'
import { facePose } from './face.ts'
import { CURIOUS_DWELL_MS, TRANSITION_MS } from './mood.ts'

describe('CompanionEngine', () => {
  it('caps a long frame so a hitch cannot skip a mood', () => {
    const engine = new CompanionEngine({ random: () => 0 })
    engine.seek(CURIOUS_DWELL_MS - 10)
    engine.tick(5_000)
    expect(engine.snapshot().blend).toBeLessThan(0.2)
    expect(engine.snapshot().settled).toBe('curious')
  })

  it('blinks and reopens on a deterministic clock', () => {
    const engine = new CompanionEngine({ random: () => 0 })
    let peak = 0
    for (let ms = 0; ms <= 3_600; ms += 16) {
      peak = Math.max(peak, engine.tick(16).blink)
    }
    expect(peak).toBeGreaterThan(0.85)
    expect(engine.snapshot().blink).toBe(0)
  })

  it('holds a still pose when reduced motion is on', () => {
    const engine = new CompanionEngine({ random: () => 0 })
    engine.setReduced(true)
    engine.setSway(true)
    engine.setLeanTarget(1, 1)
    const state = advance(engine, 1_200)
    expect(state.reduced).toBe(true)
    expect(state.sway).toBe(false)
    expect(state.bounce).toBe(0)
    expect(state.breath).toBe(1)
    expect(state.lean).toBe(0)
    expect(state.lookX).toBe(0)
  })

  it('lets preview sway lean without a sensor', () => {
    const engine = new CompanionEngine({ random: () => 0 })
    engine.setSway(true)
    const state = advance(engine, 2_200)
    expect(state.sensor).toBe(false)
    expect(Math.abs(state.lean)).toBeGreaterThan(0.15)
    expect(Math.abs(state.lean)).toBeLessThanOrEqual(1)
  })

  it('moves to an explicit mood and can return', () => {
    const engine = new CompanionEngine({ random: () => 0 })
    engine.setMode('grumpy')
    expect(engine.snapshot().phase).toBe('transition')
    const grumpy = advance(engine, TRANSITION_MS + 40)
    expect(grumpy.blend).toBeGreaterThan(0.98)
    expect(grumpy.settled).toBe('grumpy')
    expect(grumpy.mode).toBe('grumpy')
    engine.setMode('curious')
    const curious = advance(engine, TRANSITION_MS + 40)
    expect(curious.blend).toBeLessThan(0.02)
    expect(curious.settled).toBe('curious')
  })

  it('freezes while hidden', () => {
    const engine = new CompanionEngine({ random: () => 0 })
    engine.seek(CURIOUS_DWELL_MS - 20)
    engine.setHidden(true)
    engine.tick(10_000)
    expect(engine.snapshot().blend).toBe(0)
    expect(engine.snapshot().phase).toBe('dwell')
  })
})

describe('facePose', () => {
  it('uses the same face and only changes the expression', () => {
    const curious = facePose(0)
    const grumpy = facePose(1)
    expect(curious.eyeRy).toBeGreaterThan(grumpy.eyeRy)
    expect(curious.mouthOpenOpacity).toBe(1)
    expect(curious.mouthFrownOpacity).toBe(0)
    expect(grumpy.mouthOpenOpacity).toBe(0)
    expect(grumpy.mouthFrownOpacity).toBe(1)
    expect(grumpy.browLeft.y0).toBeGreaterThan(curious.browLeft.y0)
    expect(grumpy.browLeft.y1).toBeGreaterThan(curious.browLeft.y1)
    expect(grumpy.cheek).toBeLessThan(curious.cheek)
  })
})
