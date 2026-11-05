import { clamp } from './math.ts'

/**
 * Tilt policy: orientation only, never acceleration.
 * Hard braking and bumps should not get a reward or a big reaction.
 * Angles are relative to a calibrated rest pose.
 */
export const TILT_DEADBAND_DEG = 4
export const TILT_CAP_DEG = 26
export const MAX_VISUAL_LEAN_DEG = 7
export const LEAN_SMOOTH_TAU_MS = 240
export const MOTION_EVENT_TIMEOUT_MS = 2_500
/** Frames hitching longer than this do not fast-forward the pose. */
export const MAX_FRAME_DT_MS = 80

export type MotionPermission = 'listen' | 'denied' | 'unavailable'

export function mapTilt(degrees: number | null | undefined): number {
  if (degrees == null || Number.isNaN(degrees)) return 0
  const magnitude = Math.abs(degrees)
  if (magnitude <= TILT_DEADBAND_DEG) return 0
  const span = TILT_CAP_DEG - TILT_DEADBAND_DEG
  const scaled = Math.min(1, (magnitude - TILT_DEADBAND_DEG) / span)
  return Math.sign(degrees) * scaled
}

export function smoothToward(current: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return current
  const k = 1 - Math.exp(-dtMs / tauMs)
  return current + (target - current) * k
}

/** Normalized pointer offset around the stage center, roughly -1..1, already gentle. */
export function pointerLean(nx: number, ny: number): { x: number; y: number } {
  const x = soften(nx)
  const y = soften(ny)
  return { x: clamp(x * 0.75, -1, 1), y: clamp(y * 0.45, -1, 1) }
}

function soften(value: number): number {
  const limited = clamp(value, -1.4, 1.4) / 1.4
  const magnitude = Math.abs(limited)
  const deadband = 0.12
  if (magnitude <= deadband) return 0
  const sign = Math.sign(limited)
  return clamp((sign * (magnitude - deadband)) / (1 - deadband), -1, 1)
}

export async function resolveMotionPermission(env: {
  secure: boolean
  hasOrientationEvent: boolean
  requestPermission?: () => Promise<string>
}): Promise<MotionPermission> {
  if (!env.secure || !env.hasOrientationEvent) return 'unavailable'
  if (typeof env.requestPermission !== 'function') return 'listen'
  try {
    const result = await env.requestPermission()
    return result === 'granted' ? 'listen' : 'denied'
  } catch {
    return 'denied'
  }
}
