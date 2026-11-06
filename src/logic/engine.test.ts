import { describe, expect, it } from 'vitest'
import { advance, BuddyEngine, REST_HOLD_MS } from './engine.ts'
import { DWELL_MS, POSES, sampleAuto, TRANSITION_MS } from './expressions.ts'
import { WAKE_DEBOUNCE_MS } from './motion.ts'

describe('sampleAuto', () => {
  it('walks the selected expressions and skips the others', () => {
    const set = ['curious', 'happy'] as const
    expect(sampleAuto(0, set).expression).toBe('curious')
    expect(sampleAuto(DWELL_MS - 1, set).phase).toBe('dwell')
    const mid = sampleAuto(DWELL_MS + TRANSITION_MS * 0.25, set)
    expect(mid.phase).toBe('transition')
    expect(mid.from).toBe('curious')
    expect(mid.to).toBe('happy')
    expect(sampleAuto(DWELL_MS + TRANSITION_MS + 10, set).expression).toBe('happy')
    expect(sampleAuto(2 * (DWELL_MS + TRANSITION_MS) + 10, set).expression).toBe('curious')
  })

  it('holds a single choice', () => {
    expect(sampleAuto(99_000, ['sleepy'])).toMatchObject({ expression: 'sleepy', phase: 'dwell' })
  })
})

describe('BuddyEngine', () => {
  it('does not drop the last Auto expression', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.toggleAutoExpression('happy')
    engine.toggleAutoExpression('grumpy')
    engine.toggleAutoExpression('sleepy')
    engine.toggleAutoExpression('curious')
    expect(engine.snapshot().autoSet).toEqual(['curious'])
  })

  it('changes the manual expression without bobbing state', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.setSelection('grumpy')
    const state = advance(engine, 1_600)
    expect(state.expression).toBe('grumpy')
    expect(state.pose.mouthCurve).toBeLessThan(-0.4)
    expect(state.pose.eyeOpen).toBeLessThan(POSES.curious.eyeOpen)
    expect('bounce' in state).toBe(false)
  })

  it('stays resting through a small movement and wakes after a sustained one', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.setPresence('rest')
    advance(engine, 1_600)
    engine.feedMotion(0.2)
    const quiet = advance(engine, 1_000)
    expect(quiet.resting).toBe(true)
    expect(quiet.wakefulness).toBeLessThan(0.2)

    engine.feedMotion(1)
    const waking = advance(engine, WAKE_DEBOUNCE_MS + 500)
    expect(waking.resting).toBe(false)
    expect(waking.wakefulness).toBeGreaterThan(0.5)
  })

  it('returns to rest after a calm hold when the preview wake is used', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.setPresence('rest')
    advance(engine, 1_200)
    engine.previewWake()
    const awake = advance(engine, 1_200)
    expect(awake.resting).toBe(false)
    expect(awake.wakefulness).toBeGreaterThan(0.8)
    engine.feedMotion(0)
    const rested = advance(engine, REST_HOLD_MS + 1_800)
    expect(rested.resting).toBe(true)
    expect(rested.wakefulness).toBeLessThan(0.35)
    expect(rested.pose.eyeOpen).toBeLessThan(0.25)
  })

  it('does not treat preview wake as a sensor while Awake is selected', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.previewWake()
    expect(engine.snapshot().presence).toBe('awake')
    expect(engine.snapshot().motionLevel).toBe(0)
  })

  it('freezes while hidden', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.seek(DWELL_MS - 40)
    engine.setHidden(true)
    engine.feedMotion(1)
    const state = engine.tick(10_000)
    expect(state.hidden).toBe(true)
    expect(state.expression).toBe('curious')
    expect(state.phase).toBe('dwell')
    expect(state.motionLevel).toBe(0)
  })

  it('blinks and reopens', () => {
    const engine = new BuddyEngine({ random: () => 0.5 })
    let peak = 0
    let reopened = false
    for (let step = 0; step < 400; step++) {
      const blink = engine.tick(16).blink
      if (peak > 0.8 && blink === 0) reopened = true
      peak = Math.max(peak, blink)
    }
    expect(peak).toBeGreaterThan(0.8)
    expect(reopened).toBe(true)
  })

  it('keeps a calmer blink gap when reduced motion is on', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.setReduced(true)
    engine.setSelection('happy')
    let peak = 0
    for (let ms = 0; ms <= 4_500; ms += 16) peak = Math.max(peak, engine.tick(16).blink)
    expect(peak).toBe(0)
    expect(engine.snapshot().expression).toBe('happy')
  })
})
