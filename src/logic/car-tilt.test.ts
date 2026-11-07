import { describe, expect, it } from 'vitest'
import { CAR_CAP_DEG, CAR_DEADZONE_DEG, carFace, carTiltFromDevice, carTiltLive, driveCueOnEntry, initialDriveSoundClock, smoothCarTilt } from './car-tilt.ts'

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

  it('draws four different leans and a plain neutral', () => {
    const accel = carFace({ throttle: 1, bank: 0 })
    const brake = carFace({ throttle: -1, bank: 0 })
    const left = carFace({ throttle: 0, bank: -1 })
    const right = carFace({ throttle: 0, bank: 1 })
    const still = carFace({ throttle: 0, bank: 0 })
    expect([accel.state, brake.state, left.state, right.state, still.state]).toEqual(['accel', 'brake', 'left', 'right', 'neutral'])
    expect(accel.sy).toBeGreaterThan(1)
    expect(accel.y).toBeLessThan(0)
    expect(brake.sx).toBeGreaterThan(1)
    expect(brake.sy).toBeLessThan(1)
    expect(left.rotate).toBeLessThan(0)
    expect(right.rotate).toBeGreaterThan(0)
    expect(still).toMatchObject({ x: 0, y: 0, rotate: 0, sx: 1, sy: 1, speed: 0 })
  })

  it('sounds once on entering accelerate or brake, then waits', () => {
    let clock = initialDriveSoundClock()
    const first = driveCueOnEntry('neutral', 'accel', 2_000, clock)
    expect(first.key).toBe('car_accel_rev_a')
    clock = first.clock
    expect(driveCueOnEntry('accel', 'accel', 2_200, clock).key).toBeNull()
    const soon = driveCueOnEntry('neutral', 'brake', 2_400, { ...clock, neutralSince: 2_100 })
    expect(soon.key).toBeNull()
    const later = driveCueOnEntry('neutral', 'brake', 4_000, { ...clock, neutralSince: 3_200 })
    expect(later.key).toBe('car_brake_soft_a')
    const again = driveCueOnEntry('neutral', 'accel', 6_000, { ...later.clock, neutralSince: 5_500 })
    expect(again.key).toBe('car_accel_rev_b')
  })
})