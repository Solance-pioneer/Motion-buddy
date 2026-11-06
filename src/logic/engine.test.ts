import { describe, expect, it } from 'vitest'
import { advance, BuddyEngine, REST_HOLD_MS } from './engine.ts'
import { DWELL_MS, POSES, sampleAuto, TRANSITION_MS } from './expressions.ts'
import { POSE_IDS } from './library.ts'
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
    for (const pose of POSE_IDS) {
      if (pose !== 'curious' && engine.snapshot().autoSet.includes(pose)) engine.toggleAutoExpression(pose)
    }
    engine.toggleAutoExpression('curious')
    expect(engine.snapshot().autoSet).toEqual(['curious'])
  })

  it('blocks an excluded expression for a manual choice and for motion wake', () => {
    const engine = new BuddyEngine({ random: () => 0 })
    engine.toggleAutoExpression('grumpy')
    engine.setSelection('grumpy')
    expect(engine.snapshot().selection).toBe('auto')
    expect(engine.snapshot().expression).not.toBe('grumpy')
    engine.setPresence('rest')
    advance(engine, 400)
    engine.previewWake()
    const woken = advance(engine, 1_200)
    expect(woken.autoSet).not.toContain('grumpy')
    expect(woken.expression).not.toBe('grumpy')
    engine.setPresence('awake')
    engine.setSelection('happy')
    engine.toggleAutoExpression('happy')
    expect(engine.snapshot().selection).toBe('auto')
    expect(engine.snapshot().expression).not.toBe('happy')
  })

  it('sends opposite signed moves to opposite sides and then settles', () => {
    const engine = new BuddyEngine({ random: () => 0.5 })
    engine.feedLook(-1, 0)
    engine.feedAcceleration(2, -1)
    const left = advance(engine, 900)
    expect(left.reaction === 'worried' || left.reaction === 'startled').toBe(true)
    expect(left.gazeX).toBeLessThan(-0.7)
    engine.feedLook(1, 0)
    engine.feedAcceleration(2, 1)
    const right = advance(engine, 480)
    expect(right.gazeX).toBeGreaterThan(0.7)
    expect(Math.sign(right.gazeX)).not.toBe(Math.sign(left.gazeX))
    engine.feedLook(0, 0)
    engine.feedAcceleration(0, 0)
    const calm = advance(engine, 2_200)
    expect(calm.reaction).toBe('none')
    expect(calm.expression === 'startled' || calm.expression === 'worried' || calm.expression === 'dizzy').toBe(false)
  })

  it('uses a gentle move for worried and a quicker move for dizzy, without stacking', () => {
    const engine = new BuddyEngine({ random: () => 0.5 })
    engine.feedAcceleration(2)
    const worried = advance(engine, 900)
    expect(worried.reaction === 'worried' || worried.reaction === 'startled').toBe(true)
    engine.feedAcceleration(6)
    const stillInReaction = advance(engine, 200)
    expect(stillInReaction.reaction === 'worried' || stillInReaction.reaction === 'startled').toBe(true)
    const settled = advance(engine, 4_000)
    expect(settled.reaction).toBe('none')
    expect(settled.expression).not.toBe('grumpy')
  })

  it('does not start a reaction the person turned off', () => {
    const engine = new BuddyEngine({ random: () => 0.5 })
    engine.setReactionEnabled('dizzy', false)
    engine.feedAcceleration(8)
    const state = advance(engine, 1_200)
    expect(state.allowDizzy).toBe(false)
    expect(state.reaction).toBe('none')
    engine.previewReaction('dizzy')
    expect(engine.snapshot().reaction).toBe('none')
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

  it('switches Desk, Car, and Wrist without restoring an excluded pose', () => {
    const engine = new BuddyEngine({ random: () => 0.5 })
    expect(engine.snapshot()).toMatchObject({ profile: 'desk', expression: 'curious', speed: false })
    engine.setProfile('car')
    expect(engine.snapshot()).toMatchObject({ profile: 'car', expression: 'determined', speed: true })
    engine.setProfile('wrist')
    expect(engine.snapshot()).toMatchObject({ profile: 'wrist', expression: 'pant', speed: false })
    engine.toggleAutoExpression('pant')
    engine.setProfile('wrist')
    expect(engine.snapshot().expression).not.toBe('pant')
    engine.setProfile('desk')
    engine.toggleAutoExpression('worried')
    engine.previewReaction('startled')
    const blocked = engine.snapshot()
    expect(blocked.reaction).toBe('worried')
    expect(blocked.expression).not.toBe('worried')
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
