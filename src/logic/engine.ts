import {
  DWELL_MS,
  EXPRESSIONS,
  expressionPose,
  lerpPose,
  orderedSet,
  POSES,
  REST_POSE,
  sampleAuto,
  smoothPose,
  type Expression,
  type ExpressionPhase,
  type FacePose,
} from './expressions.ts'
import { MAX_FRAME_DT_MS, REST_HOLD_MS, smoothToward, WAKE_DEBOUNCE_MS, WAKE_LEVEL } from './motion.ts'

export type Presence = 'awake' | 'rest'
export type Selection = 'auto' | Expression

export interface BuddyState {
  presence: Presence
  selection: Selection
  autoSet: Expression[]
  expression: Expression
  phase: ExpressionPhase
  resting: boolean
  wakefulness: number
  blink: number
  pose: FacePose
  reduced: boolean
  hidden: boolean
  motionLevel: number
}

const BLINK_HALF_MS = 140
const BLINK_HALF_REDUCED_MS = 260

export class BuddyEngine {
  private presence: Presence = 'awake'
  private selection: Selection = 'auto'
  private autoSet: Expression[] = [...EXPRESSIONS]
  private autoElapsed = 0
  private uiElapsed = 0
  private resting = false
  private wakefulness = 1
  private holdMs = REST_HOLD_MS
  private motionTarget = 0
  private motionLevel = 0
  private highMs = 0
  private lookTargetX = 0
  private lookTargetY = 0
  private lookX = 0
  private lookY = 0
  private blink = 0
  private blinkStart = -1
  private nextBlinkAt: number
  private reduced = false
  private hidden = false
  private shown: FacePose = { ...POSES.curious }
  private readonly random: () => number

  constructor(options?: { random?: () => number }) {
    this.random = options?.random ?? Math.random
    this.nextBlinkAt = this.blinkGap(false)
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden
  }

  setReduced(reduced: boolean): void {
    const changed = reduced !== this.reduced
    this.reduced = reduced
    if (reduced) {
      this.lookTargetX = 0
      this.lookTargetY = 0
      if (changed && this.blinkStart < 0) this.nextBlinkAt = this.uiElapsed + this.blinkGap(false)
    }
  }

  setPresence(presence: Presence): void {
    this.presence = presence
    if (presence === 'awake') {
      this.resting = false
      this.highMs = 0
    } else {
      this.resting = true
      this.holdMs = 0
      this.highMs = 0
    }
  }

  setSelection(selection: Selection): void {
    if (selection !== 'auto' && !this.autoSet.includes(selection)) return
    this.selection = selection
  }

  toggleAutoExpression(expression: Expression): void {
    const has = this.autoSet.includes(expression)
    if (has && this.autoSet.length === 1) return
    this.autoSet = has
      ? this.autoSet.filter((item) => item !== expression)
      : orderedSet([...this.autoSet, expression])
    this.autoElapsed = 0
    if (this.selection !== 'auto' && !this.autoSet.includes(this.selection)) this.selection = 'auto'
  }

  /** Jump the Auto clock. Tests use this instead of waiting out a dwell. */
  seek(elapsedMs: number): void {
    this.selection = 'auto'
    this.autoElapsed = Math.max(0, elapsedMs)
  }

  /**
   * Explicit stand-in for a movement. It does not claim a sensor event.
   * Ignored unless Rest until motion is the open-page mode.
   */
  previewWake(): void {
    if (this.presence !== 'rest' || this.hidden) return
    this.resting = false
    this.holdMs = REST_HOLD_MS
    this.highMs = 0
  }

  feedMotion(level: number): void {
    if (this.hidden) return
    this.motionTarget = clamp01(level)
  }

  feedLook(x: number, y: number): void {
    if (this.hidden || this.reduced) return
    this.lookTargetX = clampUnit(x)
    this.lookTargetY = clampUnit(y)
  }

  tick(dtMs: number): BuddyState {
    if (!this.hidden) {
      const dt = Math.max(0, Math.min(dtMs, MAX_FRAME_DT_MS))
      this.uiElapsed += dt
      if (this.selection === 'auto' && this.presence === 'awake') this.autoElapsed += dt
      this.advanceMotion(dt)
      this.advanceWake(dt)
      this.advanceBlink()
      const desired = this.desiredPose()
      this.shown = smoothPose(this.shown, desired, dt, this.reduced ? 80 : 380)
    }
    return this.snapshot()
  }

  snapshot(): BuddyState {
    const sample = this.logical()
    return {
      presence: this.presence,
      selection: this.selection,
      autoSet: [...this.autoSet],
      expression: sample.expression,
      phase: sample.phase,
      resting: this.presence === 'rest' && this.resting,
      wakefulness: this.wakefulness,
      blink: this.blink,
      pose: { ...this.shown },
      reduced: this.reduced,
      hidden: this.hidden,
      motionLevel: this.motionLevel,
    }
  }

  private logical() {
    if (this.selection !== 'auto' && this.autoSet.includes(this.selection)) {
      return {
        expression: this.selection,
        phase: 'dwell' as const,
        from: this.selection,
        to: this.selection,
        t: 0,
      }
    }
    return sampleAuto(this.autoElapsed, this.autoSet)
  }

  private desiredPose(): FacePose {
    const sample = this.logical()
    const expressive = expressionPose(sample)
    const idle = this.reduced || this.wakefulness < 0.75 ? 0 : Math.sin(this.uiElapsed / 2200) * 0.1
    expressive.lookX = clampUnit(expressive.lookX + idle + this.lookX * 0.28)
    expressive.lookY = clampUnit(expressive.lookY + this.lookY * 0.2)
    if (this.presence === 'awake') return expressive
    return lerpPose(REST_POSE, expressive, this.wakefulness)
  }

  private advanceMotion(dt: number): void {
    this.motionLevel = smoothToward(this.motionLevel, this.motionTarget, dt, 180)
    this.lookX = smoothToward(this.lookX, this.reduced ? 0 : this.lookTargetX, dt, 200)
    this.lookY = smoothToward(this.lookY, this.reduced ? 0 : this.lookTargetY, dt, 200)
    if (this.presence !== 'rest') {
      this.highMs = 0
      return
    }
    if (this.motionLevel >= WAKE_LEVEL) {
      this.highMs += dt
      if (this.highMs >= WAKE_DEBOUNCE_MS) {
        this.resting = false
        this.holdMs = REST_HOLD_MS
      }
      return
    }
    this.highMs = 0
  }

  private advanceWake(dt: number): void {
    const target = this.presence === 'awake' || !this.resting ? 1 : 0
    this.wakefulness = smoothToward(this.wakefulness, target, dt, this.reduced ? 70 : 340)
    if (this.presence !== 'rest' || this.resting) return
    if (this.wakefulness > 0.85 && this.motionLevel < WAKE_LEVEL * 0.45) {
      this.holdMs -= dt
      if (this.holdMs <= 0) this.resting = true
    }
  }

  private advanceBlink(): void {
    if (this.wakefulness < 0.4) {
      this.blink = 0
      return
    }
    if (this.blinkStart < 0 && this.uiElapsed >= this.nextBlinkAt) this.blinkStart = this.uiElapsed
    if (this.blinkStart < 0) return
    const half = this.reduced ? BLINK_HALF_REDUCED_MS : BLINK_HALF_MS
    const u = (this.uiElapsed - this.blinkStart) / half
    if (u >= 2) {
      this.blink = 0
      this.blinkStart = -1
      const double = !this.reduced && this.random() < 0.16
      this.nextBlinkAt = this.uiElapsed + this.blinkGap(double)
      return
    }
    this.blink = u < 1 ? u : 2 - u
  }

  private blinkGap(double: boolean): number {
    if (double) return 200 + this.random() * 140
    if (this.reduced) return 9_000 + this.random() * 4_000
    return 3_400 + this.random() * 2_600
  }
}

export function advance(engine: BuddyEngine, ms: number, step = 16): BuddyState {
  let left = ms
  let state = engine.snapshot()
  while (left > 0) {
    const dt = Math.min(step, left)
    state = engine.tick(dt)
    left -= dt
  }
  return state
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

export { DWELL_MS, REST_HOLD_MS }
