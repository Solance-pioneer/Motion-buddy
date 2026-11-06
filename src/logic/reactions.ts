import type { FacePose } from './expressions.ts'

export type Sensitivity = 'low' | 'medium' | 'high'
export type MotionBand = 'still' | 'gentle' | 'fast'
export type ReactionName = 'none' | 'worried' | 'startled' | 'dizzy' | 'recovery'
export type ReactionKind = 'startled' | 'dizzy'

/** How long a gentle movement must hold before worried/startled begins. */
export const GENTLE_HOLD_MS = 280
/** How long a quicker movement must hold before dizziness begins. */
export const FAST_HOLD_MS = 160
export const COOLDOWN_MS = 4_000
export const WORRIED_MS = 320
export const STARTLED_MS = 450
export const DIZZY_MS = 800
export const RECOVERY_MS = 1_400

export interface ReactionClock {
  name: ReactionName
  elapsed: number
  cooldown: number
  gentleMs: number
  fastMs: number
}

export function initialReaction(): ReactionClock {
  return { name: 'none', elapsed: 0, cooldown: 0, gentleMs: 0, fastMs: 0 }
}

/**
 * Gentle movement is a moderate acceleration. Fast is a quicker move, not a slam.
 * Low sensitivity asks for a clearer move. High sensitivity notices a smaller one.
 */
export function motionBand(magnitude: number, sensitivity: Sensitivity): MotionBand {
  const gentle = sensitivity === 'high' ? 1 : sensitivity === 'low' ? 1.7 : 1.35
  const fast = sensitivity === 'high' ? 3.2 : sensitivity === 'low' ? 4.8 : 4
  if (magnitude >= fast) return 'fast'
  if (magnitude >= gentle) return 'gentle'
  return 'still'
}

export function stepReaction(
  clock: ReactionClock,
  dt: number,
  input: { band: MotionBand; allowStartled: boolean; allowDizzy: boolean },
): ReactionClock {
  const next: ReactionClock = { ...clock }
  if ((next.name === 'dizzy' || next.name === 'recovery') && !input.allowDizzy) {
    return { ...next, name: 'none', elapsed: 0, gentleMs: 0, fastMs: 0 }
  }
  if ((next.name === 'worried' || next.name === 'startled') && !input.allowStartled) {
    return { ...next, name: 'none', elapsed: 0, gentleMs: 0, fastMs: 0 }
  }
  if (next.name !== 'none') {
    next.elapsed += dt
    next.gentleMs = 0
    next.fastMs = 0
    if (next.name === 'worried' && next.elapsed >= WORRIED_MS) {
      next.name = 'startled'
      next.elapsed = 0
    } else if (next.name === 'startled' && next.elapsed >= STARTLED_MS) {
      next.name = 'none'
      next.elapsed = 0
      next.cooldown = COOLDOWN_MS
    } else if (next.name === 'dizzy' && next.elapsed >= DIZZY_MS) {
      next.name = 'recovery'
      next.elapsed = 0
    } else if (next.name === 'recovery' && next.elapsed >= RECOVERY_MS) {
      next.name = 'none'
      next.elapsed = 0
      next.cooldown = COOLDOWN_MS
    }
    return next
  }

  if (next.cooldown > 0) {
    next.cooldown = Math.max(0, next.cooldown - dt)
    next.gentleMs = 0
    next.fastMs = 0
    return next
  }

  if (input.band === 'fast' && input.allowDizzy) {
    next.fastMs += dt
    next.gentleMs = 0
    if (next.fastMs >= FAST_HOLD_MS) {
      next.name = 'dizzy'
      next.elapsed = 0
      next.fastMs = 0
    }
    return next
  }

  if (input.band === 'gentle' && input.allowStartled) {
    next.gentleMs += dt
    next.fastMs = 0
    if (next.gentleMs >= GENTLE_HOLD_MS) {
      next.name = 'worried'
      next.elapsed = 0
      next.gentleMs = 0
    }
    return next
  }

  next.gentleMs = 0
  next.fastMs = 0
  return next
}

/** Labelled simulation. It ignores the cooldown so a demo can be tried on purpose. */
export function forceReaction(kind: ReactionKind): ReactionClock {
  return {
    name: kind === 'startled' ? 'worried' : 'dizzy',
    elapsed: 0,
    cooldown: 0,
    gentleMs: 0,
    fastMs: 0,
  }
}

export const REACTION_POSES: Record<Exclude<ReactionName, 'none'>, FacePose> = {
  worried: { eyeOpen: 1.16, eyeWide: 1.2, eyeTilt: 7, skew: 0, asym: 2, mouthCurve: 0, mouthOpen: 0.85, lookX: 0, lookY: -0.08 },
  startled: { eyeOpen: 1.24, eyeWide: 1.08, eyeTilt: 2, skew: 0, asym: 0, mouthCurve: 0, mouthOpen: 1, lookX: 0, lookY: -0.12 },
  dizzy: { eyeOpen: 0.82, eyeWide: 1, eyeTilt: 5, skew: 0, asym: 16, mouthCurve: -0.15, mouthOpen: 0, lookX: 0, lookY: 0 },
  recovery: { eyeOpen: 0.92, eyeWide: 1, eyeTilt: 0, skew: 0, asym: 0, mouthCurve: 0.12, mouthOpen: 0, lookX: 0, lookY: 0 },
}
