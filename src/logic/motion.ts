import { clamp } from './math.ts'

/**
 * Orientation only. Acceleration is unused, so a hard jerk is not a wake.
 * Wake uses a wider deadband than a small glance.
 */
export const LOOK_DEADBAND_DEG = 4
export const LOOK_CAP_DEG = 26
export const WAKE_DEADBAND_DEG = 8
export const WAKE_CAP_DEG = 28
export const WAKE_LEVEL = 0.55
export const WAKE_DEBOUNCE_MS = 200
export const REST_HOLD_MS = 12_000
export const MOTION_EVENT_TIMEOUT_MS = 2_500
export const MAX_FRAME_DT_MS = 80

export type MotionPermission = 'listen' | 'denied' | 'unavailable'

export function smoothToward(current: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return current
  const k = 1 - Math.exp(-dtMs / tauMs)
  return current + (target - current) * k
}

export function lookFromDegrees(degrees: number | null | undefined): number {
  return unitFromDegrees(degrees, LOOK_DEADBAND_DEG, LOOK_CAP_DEG)
}

/** 0 inside the wake deadband, 1 at the cap. Combined with hypot for both axes. */
export function wakeLevelFromDegrees(deltaGamma: number | null | undefined, deltaBeta: number | null | undefined): number {
  const gamma = unitFromDegrees(deltaGamma, WAKE_DEADBAND_DEG, WAKE_CAP_DEG)
  const beta = unitFromDegrees(deltaBeta, WAKE_DEADBAND_DEG, WAKE_CAP_DEG)
  return Math.min(1, Math.hypot(Math.abs(gamma), Math.abs(beta)))
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

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.wakeLock?.request === 'function'
}

function unitFromDegrees(degrees: number | null | undefined, deadband: number, cap: number): number {
  if (degrees == null || Number.isNaN(degrees)) return 0
  const magnitude = Math.abs(degrees)
  if (magnitude <= deadband) return 0
  const span = cap - deadband
  const scaled = Math.min(1, (magnitude - deadband) / span)
  return clamp(Math.sign(degrees) * scaled, -1, 1)
}
