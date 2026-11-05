import { clamp, inverseSmoothstep, smoothstep } from './math.ts'

/** How long Auto rests on the curious pose before it starts to shift. */
export const CURIOUS_DWELL_MS = 14_000
/** How long Auto rests on the slightly grumpy pose. */
export const GRUMPY_DWELL_MS = 11_000
/** Shared length of both mood transitions. */
export const TRANSITION_MS = 1_800

export const MOOD_CYCLE_MS =
  CURIOUS_DWELL_MS + TRANSITION_MS + GRUMPY_DWELL_MS + TRANSITION_MS

export type MoodName = 'curious' | 'grumpy'
export type MoodPhase = 'dwell' | 'transition'

export interface MoodSample {
  /** 0 is fully curious, 1 is fully grumpy. */
  blend: number
  phase: MoodPhase
  settled: MoodName
}

export function sampleAutoMood(elapsedMs: number): MoodSample {
  const cycle = MOOD_CYCLE_MS
  let t = elapsedMs % cycle
  if (t < 0) t += cycle

  if (t < CURIOUS_DWELL_MS) {
    return { blend: 0, phase: 'dwell', settled: 'curious' }
  }
  t -= CURIOUS_DWELL_MS
  if (t < TRANSITION_MS) {
    const blend = smoothstep(t / TRANSITION_MS)
    return {
      blend,
      phase: 'transition',
      settled: blend < 0.5 ? 'curious' : 'grumpy',
    }
  }
  t -= TRANSITION_MS
  if (t < GRUMPY_DWELL_MS) {
    return { blend: 1, phase: 'dwell', settled: 'grumpy' }
  }
  t -= GRUMPY_DWELL_MS
  const blend = 1 - smoothstep(t / TRANSITION_MS)
  return {
    blend,
    phase: 'transition',
    settled: blend < 0.5 ? 'curious' : 'grumpy',
  }
}

/**
 * Place the Auto clock so the current blend continues toward grumpy,
 * or sits at the start of a dwell when the pose is already settled.
 */
export function elapsedForBlend(blend: number): number {
  const b = clamp(blend, 0, 1)
  if (b <= 0.001) return 0
  if (b >= 0.999) return CURIOUS_DWELL_MS + TRANSITION_MS
  return CURIOUS_DWELL_MS + inverseSmoothstep(b) * TRANSITION_MS
}
