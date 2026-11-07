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

export type CarLook = 'neutral' | 'accel' | 'brake' | 'left' | 'right'

export interface CarFace {
  state: CarLook
  x: number
  y: number
  rotate: number
  sx: number
  sy: number
  speed: number
}

/** Four readable leans. Mixed tilt still moves both ways; the name is the stronger axis. */
export function carFace(tilt: CarTilt): CarFace {
  const along = Math.abs(tilt.throttle)
  const side = Math.abs(tilt.bank)
  let state: CarLook = 'neutral'
  if (along >= 0.12 && along >= side) state = tilt.throttle > 0 ? 'accel' : 'brake'
  else if (side >= 0.12) state = tilt.bank > 0 ? 'right' : 'left'
  return {
    state,
    x: tilt.bank * 18,
    y: tilt.throttle === 0 ? 0 : -tilt.throttle * 16,
    rotate: tilt.bank * 12,
    sx: 1 - Math.max(0, tilt.throttle) * 0.06 + Math.max(0, -tilt.throttle) * 0.1,
    sy: 1 + tilt.throttle * 0.14,
    speed: Math.max(0, tilt.throttle),
  }
}

export const DRIVE_SOUND_GAP_MS = 1_500
export const DRIVE_NEUTRAL_REARM_MS = 300

export type DriveCueName =
  | 'race_activate_rev'
  | 'car_accel_rev_a'
  | 'car_accel_rev_b'
  | 'car_brake_soft_a'
  | 'car_brake_soft_b'

export interface DriveSoundClock {
  lastAny: number
  neutralSince: number
  accelPlayed: boolean
  brakePlayed: boolean
  accelFlip: number
  brakeFlip: number
}

export function initialDriveSoundClock(): DriveSoundClock {
  return { lastAny: -10_000, neutralSince: 0, accelPlayed: false, brakePlayed: false, accelFlip: 0, brakeFlip: 0 }
}

/** One short cue when accelerate or brake begins. Same lean waits for neutral, then the global gap. */
export function driveCueOnEntry(previous: CarLook, next: CarLook, now: number, clock: DriveSoundClock): { key: DriveCueName | null; clock: DriveSoundClock } {
  const heldNeutral = previous === 'neutral' && clock.neutralSince > 0 ? now - clock.neutralSince : 0
  let nextClock = { ...clock }
  if (next === 'neutral') {
    if (previous !== 'neutral') nextClock.neutralSince = now
    return { key: null, clock: nextClock }
  }
  if (previous === 'neutral') nextClock.neutralSince = 0
  if (next !== 'accel' && next !== 'brake') return { key: null, clock: nextClock }
  if (previous === next) return { key: null, clock: nextClock }
  if (now - clock.lastAny < DRIVE_SOUND_GAP_MS) return { key: null, clock: nextClock }
  if (next === 'accel') {
    if (clock.accelPlayed && heldNeutral < DRIVE_NEUTRAL_REARM_MS) return { key: null, clock: nextClock }
    const key = clock.accelFlip % 2 === 0 ? 'car_accel_rev_a' : 'car_accel_rev_b'
    nextClock = { ...nextClock, lastAny: now, accelPlayed: true, accelFlip: clock.accelFlip + 1 }
    return { key, clock: nextClock }
  }
  if (clock.brakePlayed && heldNeutral < DRIVE_NEUTRAL_REARM_MS) return { key: null, clock: nextClock }
  const key = clock.brakeFlip % 2 === 0 ? 'car_brake_soft_a' : 'car_brake_soft_b'
  nextClock = { ...nextClock, lastAny: now, brakePlayed: true, brakeFlip: clock.brakeFlip + 1 }
  return { key, clock: nextClock }
}
