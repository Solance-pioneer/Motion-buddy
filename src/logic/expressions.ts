import { lerp, smoothstep } from './math.ts'

export const EXPRESSIONS = ['curious', 'happy', 'grumpy', 'sleepy'] as const

export type Expression = (typeof EXPRESSIONS)[number]

/** How long Auto holds one expression before it starts to ease onward. */
export const DWELL_MS = 12_000
/** How long an Auto handoff between two expressions takes. */
export const TRANSITION_MS = 1_600

export type ExpressionPhase = 'dwell' | 'transition'

export interface AutoSample {
  expression: Expression
  phase: ExpressionPhase
  from: Expression
  to: Expression
  /** 0 during a dwell, otherwise 0..1 through the handoff. */
  t: number
}

export interface FacePose {
  eyeOpen: number
  lid: number
  /** Positive lifts the outer eye corners. */
  eyeTilt: number
  pupil: number
  mouthCurve: number
  mouthOpen: number
  lookX: number
  lookY: number
}

export const POSES: Record<Expression, FacePose> = {
  curious: { eyeOpen: 1, lid: 0.02, eyeTilt: 0, pupil: 1, mouthCurve: 0, mouthOpen: 1, lookX: 0, lookY: -0.08 },
  happy: { eyeOpen: 0.7, lid: 0.1, eyeTilt: 12, pupil: 1.04, mouthCurve: 1, mouthOpen: 0, lookX: 0, lookY: 0 },
  grumpy: { eyeOpen: 0.62, lid: 0.22, eyeTilt: -6, pupil: 0.86, mouthCurve: -0.78, mouthOpen: 0, lookX: 0, lookY: 0.04 },
  sleepy: { eyeOpen: 0.3, lid: 0.42, eyeTilt: 0, pupil: 0.72, mouthCurve: 0.12, mouthOpen: 0.04, lookX: 0, lookY: 0.16 },
}

/** Fully at rest. Distinct from the sleepy expression, which is still awake. */
export const REST_POSE: FacePose = {
  eyeOpen: 0.07,
  lid: 0.2,
  eyeTilt: 0,
  pupil: 0.65,
  mouthCurve: 0.04,
  mouthOpen: 0,
  lookX: 0,
  lookY: 0,
}

export function poseOf(expression: Expression): FacePose {
  return { ...POSES[expression] }
}

export function lerpPose(a: FacePose, b: FacePose, t: number): FacePose {
  return {
    eyeOpen: lerp(a.eyeOpen, b.eyeOpen, t),
    lid: lerp(a.lid, b.lid, t),
    eyeTilt: lerp(a.eyeTilt, b.eyeTilt, t),
    pupil: lerp(a.pupil, b.pupil, t),
    mouthCurve: lerp(a.mouthCurve, b.mouthCurve, t),
    mouthOpen: lerp(a.mouthOpen, b.mouthOpen, t),
    lookX: lerp(a.lookX, b.lookX, t),
    lookY: lerp(a.lookY, b.lookY, t),
  }
}

export function smoothPose(current: FacePose, target: FacePose, dtMs: number, tauMs: number): FacePose {
  if (dtMs <= 0) return current
  const k = 1 - Math.exp(-dtMs / tauMs)
  return lerpPose(current, target, k)
}

export function orderedSet(set: readonly Expression[]): Expression[] {
  return EXPRESSIONS.filter((expression) => set.includes(expression))
}

export function sampleAuto(elapsedMs: number, set: readonly Expression[]): AutoSample {
  const order = orderedSet(set)
  const fallback = order[0] ?? 'curious'
  if (order.length <= 1) {
    return { expression: fallback, phase: 'dwell', from: fallback, to: fallback, t: 0 }
  }
  const slot = DWELL_MS + TRANSITION_MS
  const cycle = slot * order.length
  let time = elapsedMs % cycle
  if (time < 0) time += cycle
  const index = Math.floor(time / slot)
  const into = time - index * slot
  const from = order[index] ?? fallback
  const to = order[(index + 1) % order.length] ?? fallback
  if (into < DWELL_MS) {
    return { expression: from, phase: 'dwell', from, to: from, t: 0 }
  }
  const t = (into - DWELL_MS) / TRANSITION_MS
  return {
    expression: t < 0.5 ? from : to,
    phase: 'transition',
    from,
    to,
    t,
  }
}

export function expressionPose(sample: AutoSample): FacePose {
  if (sample.phase === 'dwell') return poseOf(sample.expression)
  return lerpPose(poseOf(sample.from), poseOf(sample.to), smoothstep(sample.t))
}
