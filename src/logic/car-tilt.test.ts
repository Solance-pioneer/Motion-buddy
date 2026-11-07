import { describe, expect, it } from 'vitest'
import { CAR_CAP_DEG, CAR_DEADZONE_DEG, carTiltFromDevice, carTiltLive, smoothCarTilt } from './car-tilt.ts'

describe('car tilt prototype', () => {
  it('maps toward, away, left, and right from a neutral deadzone', () => {
    const toward = carTiltFromDevice(0, CAR_CAP_DEG, 0)
    const away = carTiltFromDevice(0, -CAR_CAP_DEG, 0)
    const right = carTiltFromDevice(CAR_CAP_DEG, 0, 0)
    const left = carTiltFromDevice(-CAR_CAP_DEG, 0, 0)
    expect(toward.throttle).toBe(1)
    expect(toward.bank).toBe(0)
    expect(away.throttle).toBe(-1)
    expect(right.bank).toBe(1)
    expect(left.bank).toBe(-1)
    expect(carTiltFromDevice(CAR_DEADZONE_DEG - 1, CAR_DEADZONE_DEG - 1, 0)).toEqual({ throttle: 0, bank: 0 })
  })

  it('keeps the same screen lean after the phone is turned sideways', () => {
    const portrait = carTiltFromDevice(0, 12, 0)
    const landscape = carTiltFromDevice(-12, 0, 90)
    expect(portrait.throttle).toBeGreaterThan(0.4)
    expect(landscape.throttle).toBeGreaterThan(0.4)
    expect(carTiltFromDevice(0, 12, 90).bank).toBeGreaterThan(0.4)
  })

  it('drops to neutral when the sensor is denied, missing, or the lean is reset', () => {
    expect(carTiltLive(20, 20, false)).toEqual({ throttle: 0, bank: 0 })
    expect(carTiltLive(0, 0, true)).toEqual({ throttle: 0, bank: 0 })
    const eased = smoothCarTilt({ throttle: 1, bank: -1 }, { throttle: 0, bank: 0 }, 80)
    expect(eased.throttle).toBeLessThan(1)
    expect(eased.throttle).toBeGreaterThan(0)
    expect(eased.bank).toBeGreaterThan(-1)
    expect(eased.bank).toBeLessThan(0)
  })
})