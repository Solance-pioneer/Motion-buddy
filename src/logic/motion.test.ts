import { describe, expect, it } from 'vitest'
import {
  mapTilt,
  MAX_FRAME_DT_MS,
  pointerLean,
  resolveMotionPermission,
  smoothToward,
  TILT_CAP_DEG,
  TILT_DEADBAND_DEG,
} from './motion.ts'

describe('mapTilt', () => {
  it('ignores the deadband, caps the extremes, and keeps the sign', () => {
    expect(mapTilt(0)).toBe(0)
    expect(mapTilt(TILT_DEADBAND_DEG)).toBe(0)
    expect(mapTilt(TILT_DEADBAND_DEG - 0.5)).toBe(0)
    expect(mapTilt(null)).toBe(0)
    expect(mapTilt(undefined)).toBe(0)
    expect(mapTilt(Number.NaN)).toBe(0)
    expect(mapTilt(TILT_CAP_DEG)).toBe(1)
    expect(mapTilt(TILT_CAP_DEG + 40)).toBe(1)
    expect(mapTilt(-TILT_CAP_DEG)).toBe(-1)
    const partial = mapTilt(TILT_DEADBAND_DEG + (TILT_CAP_DEG - TILT_DEADBAND_DEG) / 2)
    expect(partial).toBeCloseTo(0.5, 5)
  })
})

describe('pointerLean', () => {
  it('stays quiet near the center and never reaches a hard edge from the pointer alone', () => {
    expect(pointerLean(0, 0)).toEqual({ x: 0, y: 0 })
    expect(pointerLean(0.05, -0.05)).toEqual({ x: 0, y: 0 })
    const edge = pointerLean(1.4, 1.4)
    expect(edge.x).toBeLessThanOrEqual(0.75)
    expect(edge.y).toBeLessThanOrEqual(0.45)
    expect(pointerLean(-1.4, 0).x).toBeLessThan(0)
  })
})

describe('smoothToward', () => {
  it('eases instead of jumping to the target', () => {
    let value = 0
    let largestStep = 0
    for (let i = 0; i < 40; i++) {
      const next = smoothToward(value, 1, 16, 240)
      largestStep = Math.max(largestStep, next - value)
      value = next
    }
    expect(largestStep).toBeLessThan(0.1)
    expect(value).toBeGreaterThan(0.85)
    expect(value).toBeLessThan(1)
    expect(MAX_FRAME_DT_MS).toBeLessThanOrEqual(100)
  })
})

describe('resolveMotionPermission', () => {
  it('never treats a permission result as proof that events are flowing', async () => {
    await expect(
      resolveMotionPermission({ secure: false, hasOrientationEvent: true }),
    ).resolves.toBe('unavailable')
    await expect(
      resolveMotionPermission({ secure: true, hasOrientationEvent: false }),
    ).resolves.toBe('unavailable')
    await expect(
      resolveMotionPermission({ secure: true, hasOrientationEvent: true }),
    ).resolves.toBe('listen')
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
