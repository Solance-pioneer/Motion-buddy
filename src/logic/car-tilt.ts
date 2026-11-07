import { orientedDelta, smoothToward } from './motion.ts'

/** Degrees from the captured neutral before a lean counts. */
export const CAR_DEADZONE_DEG = 4
/** Degrees from neutral that counts as a full gentle lean. */
export const CAR_CAP_DEG = 18

export interface CarTilt {
  /** Positive leans the top of the phone toward you. Negative leans it away. Not vehicle speed. */
  throttle: number
  /** Positive banks to screen-right. Negative banks to screen-left. */
  bank: number
}

const neutral = (): CarTilt => ({ throttle: 0, bank: 0 })

function unit(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0
  const magnitude = Math.abs(degrees)
  if (magnitude <= CAR_DEADZONE_DEG) return 0
  const scaled = Math.min(1, (magnitude - CAR_DEADZONE_DEG) / (CAR_CAP_DEG - CAR_DEADZONE_DEG))
  return Math.sign(degrees) * scaled
}

/** Screen axes after `orientedDelta`. Positive Y is toward the viewer. Positive X is screen-right. */
export function carTiltFromScreen(deltaXDeg: number, deltaYDeg: number): CarTilt {
  return { throttle: unit(deltaYDeg), bank: unit(deltaXDeg) }
}

/** Map a device reading through the current screen angle, then into the car lean. */
export function carTiltFromDevice(gammaDeg: number, betaDeg: number, screenAngle: number): CarTilt {
  const screen = orientedDelta(gammaDeg, betaDeg, screenAngle)
  return carTiltFromScreen(screen.x, screen.y)
}

/** Denied, missing, or paused sensors stay at the captured neutral. */
export function carTiltLive(deltaXDeg: number, deltaYDeg: number, live: boolean): CarTilt {
  if (!live) return neutral()
  return carTiltFromScreen(deltaXDeg, deltaYDeg)
}

export function smoothCarTilt(current: CarTilt, target: CarTilt, dtMs: number): CarTilt {
  return {
    throttle: smoothToward(current.throttle, target.throttle, dtMs, 160),
    bank: smoothToward(current.bank, target.bank, dtMs, 160),
  }
}
