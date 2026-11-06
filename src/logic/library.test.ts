import { describe, expect, it } from 'vitest'
import { CLAP_AT_MS, DEFAULT_AUTO, POSE_IDS, SHOWCASE_INTRO_MS, VOICE_PERIOD_MS, deskLoopMs, fallbackPose, gazeCount, placeApproved, resolvePose, sampleIdle, type PoseId } from './library.ts'

const all = new Set<PoseId>(POSE_IDS)

describe('sampleIdle', () => {
  it('shows several gazes, a blink, and more than one pose in ten stationary seconds', () => {
    const frames = []
    for (let t = 0; t <= 10_000; t += 40) frames.push(sampleIdle(t, 'desk', all, false))
    expect(gazeCount(frames)).toBeGreaterThanOrEqual(3)
    expect(frames.some((frame) => frame.blink > 0.5)).toBe(true)
    expect(new Set(frames.map((frame) => frame.pose)).size).toBeGreaterThanOrEqual(2)
    expect(frames[0]?.pose).toBe('curious')
  })

  it('keeps car accents off the desk loop and on a determined car beat', () => {
    expect(sampleIdle(500, 'desk', all, false).speed).toBe(false)
    expect(sampleIdle(500, 'car', all, false).pose).toBe('determined')
    expect(sampleIdle(500, 'car', all, false).speed).toBe(true)
    expect(sampleIdle(500, 'wrist', all, false).pose).toBe('pant')
  })

  it('never shows a pose the person turned off, in any profile', () => {
    const allowed = new Set<PoseId>(['happy'])
    for (const profile of ['desk', 'car', 'wrist'] as const) {
      for (let t = 0; t <= 20_000; t += 250) {
        expect(sampleIdle(t, profile, allowed, false).pose).toBe('happy')
        expect(sampleIdle(t, profile, allowed, false).speed).toBe(false)
      }
    }
    expect(resolvePose('determined', allowed, 'car')).toBe('happy')
    expect(fallbackPose(allowed, 'desk')).toBe('happy')
  })

  it('plays the documented desk actions and keeps wink and laugh uncommon', () => {
    const allowed = new Set<PoseId>(DEFAULT_AUTO)
    const frames = []
    for (let t = 0; t < 23_200; t += 200) frames.push(sampleIdle(t, 'desk', allowed, false).pose)
    for (const pose of ['curious', 'shy', 'happy', 'startled', 'grumpy', 'sleepy', 'yawn', 'wink', 'content']) {
      expect(frames, pose).toContain(pose)
    }
    expect(frames.filter((pose) => pose === 'laugh').length / frames.length).toBeLessThan(0.12)
    expect(frames.filter((pose) => pose === 'wink').length / frames.length).toBeLessThan(0.12)
  })

  it('shows the parted laugh only after it is opted in, and only briefly', () => {
    const opted = new Set<PoseId>(POSE_IDS)
    const frames = []
    for (let t = 0; t < 23_200; t += 200) frames.push(sampleIdle(t, 'desk', opted, false).pose)
    const laughs = frames.filter((pose) => pose === 'laugh').length / frames.length
    expect(laughs).toBeGreaterThan(0)
    expect(laughs).toBeLessThan(0.12)
  })

  it('visits each approved action once per cycle, then the existing yawn and wink', () => {
    const allow = { dizzy: true, startled: true }
    const seen = new Set<string>()
    const cycle = deskLoopMs() + 2100 + 1600 + 1800 + 2300 + 2400
    for (let t = 0; t < cycle; t += 100) {
      const placed = placeApproved(t, allow)
      if (placed.showcase) seen.add(placed.showcase.id)
      else if (sampleIdle(placed.idleMs, 'desk', all, false).pose === 'yawn') seen.add('yawn')
      else if (sampleIdle(placed.idleMs, 'desk', all, false).pose === 'wink') seen.add('wink')
    }
    expect([...seen]).toEqual(expect.arrayContaining(['scan', 'giggle', 'take-left', 'dizzy', 'spiral-dizzy', 'yawn', 'wink']))
    expect(placeApproved(1_000, allow).showcase).toBeNull()
    expect(placeApproved(SHOWCASE_INTRO_MS + 100, allow).showcase?.id).toBe('scan')
    const quiet = { dizzy: false, startled: false }
    const blocked = new Set<string>()
    for (let t = 0; t < cycle; t += 100) {
      const id = placeApproved(t, quiet).showcase?.id
      if (id) blocked.add(id)
    }
    expect(blocked.has('dizzy')).toBe(false)
    expect(blocked.has('spiral-dizzy')).toBe(false)
    expect(blocked.has('take-left')).toBe(false)
    expect(blocked.has('scan')).toBe(true)
    expect(blocked.has('giggle')).toBe(true)
    expect(placeApproved(CLAP_AT_MS + 80, allow).showcase?.id).toBe('clap')
    expect(placeApproved(CLAP_AT_MS + 2_400, allow).showcase?.id).toBe('level-up')
    let beeps = 0
    let voices = 0
    let previous = ''
    for (let t = 0; t < 180_000; t += 100) {
      const id = placeApproved(t, allow).showcase?.id ?? ''
      if (id === previous) continue
      previous = id
      if (id === 'clap' || id === 'level-up') voices += 1
      if (id === 'scan' || id === 'giggle' || id === 'take-left' || id === 'dizzy' || id === 'spiral-dizzy') beeps += 1
    }
    expect(beeps).toBeGreaterThan(voices * 3)
    expect(voices).toBeGreaterThan(0)
    expect(placeApproved(VOICE_PERIOD_MS / 2, allow).showcase?.id).not.toBe('clap')
    expect(placeApproved(36_100, allow).showcase?.id).toBe('eye-pop')
    expect(placeApproved(38_200, allow).showcase?.id).toBe('eye-bounce')
    expect(placeApproved(40_200, allow).showcase?.id).toBe('eye-sleepy')
  })

  it('drops travel and blinks when reduced motion is on', () => {
    const frame = sampleIdle(2300, 'desk', all, true)
    expect(frame.gazeX).toBe(0)
    expect(frame.gazeY).toBe(0)
    expect(frame.blink).toBe(0)
  })
})
