import { describe, expect, it } from 'vitest'
import { DEFAULT_AUTO, POSE_IDS, fallbackPose, gazeCount, resolvePose, sampleIdle, type PoseId } from './library.ts'

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

  it('keeps ordinary faces for most of a desk minute and saves wink for a short beat', () => {
    const allowed = new Set<PoseId>(DEFAULT_AUTO)
    const frames = []
    for (let t = 0; t < 39_000; t += 200) frames.push(sampleIdle(t, 'desk', allowed, false))
    const poses = frames.map((frame) => frame.pose)
    expect(poses.includes('laugh')).toBe(false)
    expect(poses.includes('wink')).toBe(true)
    expect(poses.filter((pose) => pose === 'wink').length / poses.length).toBeLessThan(0.15)
    expect(poses.filter((pose) => pose === 'curious' || pose === 'happy').length / poses.length).toBeGreaterThan(0.55)
  })

  it('shows the parted laugh only after it is opted in, and only briefly', () => {
    const opted = new Set<PoseId>(POSE_IDS)
    const frames = []
    for (let t = 0; t < 39_000; t += 200) frames.push(sampleIdle(t, 'desk', opted, false).pose)
    const laughs = frames.filter((pose) => pose === 'laugh').length / frames.length
    expect(laughs).toBeGreaterThan(0)
    expect(laughs).toBeLessThan(0.12)
  })

  it('drops travel and blinks when reduced motion is on', () => {
    const frame = sampleIdle(2300, 'desk', all, true)
    expect(frame.gazeX).toBe(0)
    expect(frame.gazeY).toBe(0)
    expect(frame.blink).toBe(0)
  })
})
