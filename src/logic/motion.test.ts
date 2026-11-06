import { describe, expect, it } from 'vitest'
import {
  lookFromDegrees,
  resolveMotionPermission,
  smoothToward,
  WAKE_CAP_DEG,
  WAKE_DEADBAND_DEG,
  WAKE_LEVEL,
  wakeLevelFromDegrees,
} from './motion.ts'

describe('wake and look mapping', () => {
  it('ignores small tilt for wake and caps a large one', () => {
    expect(wakeLevelFromDegrees(0, 0)).toBe(0)
    expect(wakeLevelFromDegrees(WAKE_DEADBAND_DEG, 3)).toBe(0)
    expect(wakeLevelFromDegrees(WAKE_CAP_DEG, 0)).toBe(1)
    expect(wakeLevelFromDegrees(WAKE_CAP_DEG + 40, -80)).toBe(1)
    const partial = wakeLevelFromDegrees(WAKE_DEADBAND_DEG + (WAKE_CAP_DEG - WAKE_DEADBAND_DEG) / 2, 0)
    expect(partial).toBeGreaterThan(0.4)
    expect(partial).toBeLessThan(WAKE_LEVEL)
  })

  it('lets a modest tilt move the eyes a long way without counting as a wake', () => {
    expect(Math.abs(lookFromDegrees(1))).toBe(0)
    expect(Math.abs(lookFromDegrees(10))).toBeGreaterThan(0.7)
    expect(wakeLevelFromDegrees(10, 0)).toBeLessThan(WAKE_LEVEL)
  })
})

describe('smoothToward', () => {
  it('eases instead of jumping', () => {
    let value = 0
    let largest = 0
    for (let i = 0; i < 30; i++) {
      const next = smoothToward(value, 1, 16, 180)
      largest = Math.max(largest, next - value)
      value = next
    }
    expect(largest).toBeLessThan(0.12)
    expect(value).toBeGreaterThan(0.8)
    expect(value).toBeLessThan(1)
  })
})

describe('resolveMotionPermission', () => {
  it('does not treat a permission result as proof that events arrived', async () => {
    await expect(resolveMotionPermission({ secure: false, hasOrientationEvent: true })).resolves.toBe('unavailable')
    await expect(resolveMotionPermission({ secure: true, hasOrientationEvent: false })).resolves.toBe('unavailable')
    await expect(resolveMotionPermission({ secure: true, hasOrientationEvent: true })).resolves.toBe('listen')
    await expect(
      resolveMotionPermission({
        secure: true,
        hasOrientationEvent: true,
        requestPermission: () => Promise.resolve('granted'),
      }),
    ).resolves.toBe('listen')
    await expect(
      resolveMotionPermission({
        secure: true,
        hasOrientationEvent: true,
        requestPermission: () => Promise.resolve('denied'),
      }),
    ).resolves.toBe('denied')
    await expect(
      resolveMotionPermission({
        secure: true,
        hasOrientationEvent: true,
        requestPermission: () => Promise.reject(new Error('dismissed')),
      }),
    ).resolves.toBe('denied')
  })
})
