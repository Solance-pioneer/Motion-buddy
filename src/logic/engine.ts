import {
  DWELL_MS,
  expressionPose,
  lerpPose,
  POSES,
  REST_POSE,
  sampleAuto,
  smoothPose,
  type Expression,
  type ExpressionPhase,
  type FacePose,
} from './expressions.ts'
import { DEFAULT_AUTO, POSE_IDS, resolvePose, sampleIdle, type PoseId, type Profile } from './library.ts'
import { MAX_FRAME_DT_MS, REST_HOLD_MS, smoothToward, WAKE_DEBOUNCE_MS, WAKE_LEVEL } from './motion.ts'
import {
  forceReaction,
  initialReaction,
  motionBand,
  REACTION_POSES,
  stepReaction,
  type ReactionClock,
  type ReactionKind,
  type ReactionName,
  type Sensitivity,
} from './reactions.ts'

export type Presence = 'awake' | 'rest'
export type Selection = 'auto' | PoseId

export interface BuddyState {
  presence: Presence
  selection: Selection
  autoSet: PoseId[]
  expression: PoseId
  profile: Profile
  gazeX: number
  gazeY: number
  speed: boolean
  phase: ExpressionPhase
  resting: boolean
  wakefulness: number
  blink: number
  pose: FacePose
  reduced: boolean
  hidden: boolean
  motionLevel: number
  reaction: ReactionName
  sensitivity: Sensitivity
  allowStartled: boolean
  allowDizzy: boolean
}

const BLINK_HALF_MS = 140
const BLINK_HALF_REDUCED_MS = 260

export class BuddyEngine {
  private presence: Presence = 'awake'
  private selection: Selection = 'auto'
  private autoSet: PoseId[] = [...DEFAULT_AUTO]
  private profile: Profile = 'desk'
  private idleElapsed = 0
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
  private reaction: ReactionClock = initialReaction()
  private sensitivity: Sensitivity = 'medium'
  private allowStartled = true
  private allowDizzy = true
  private accelTarget = 0
  private accelLevel = 0
  private simLookX = 0
  private simLookUntil = 0
  private reactionDir = 0
  private settleUntil = 0
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

  setProfile(profile: Profile): void {
    this.profile = profile
    this.idleElapsed = 0
  }

  setSelection(selection: Selection): void {
    if (selection !== 'auto' && !this.autoSet.includes(selection)) return
    this.selection = selection
  }

  toggleAutoExpression(expression: PoseId): void {
    const has = this.autoSet.includes(expression)
    if (has && this.autoSet.length === 1) return
    const next = has ? this.autoSet.filter((item) => item !== expression) : [...this.autoSet, expression]
    this.autoSet = POSE_IDS.filter((id) => next.includes(id))
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

  setSensitivity(sensitivity: Sensitivity): void {
    this.sensitivity = sensitivity
  }

  setReactionEnabled(kind: ReactionKind, enabled: boolean): void {
    if (kind === 'startled') this.allowStartled = enabled
    else this.allowDizzy = enabled
  }

  /** Labelled stand-in. It does not mark the sensor as on. */
  previewReaction(kind: ReactionKind): void {
    if (this.hidden) return
    if (kind === 'startled' && !this.allowStartled) return
    if (kind === 'dizzy' && !this.allowDizzy) return
    this.reaction = forceReaction(kind)
    this.resting = false
    this.holdMs = REST_HOLD_MS
  }

  previewGlance(direction: -1 | 1): void {
    if (this.hidden || this.reduced) return
    this.simLookX = direction
    this.simLookUntil = this.uiElapsed + 1_400
  }

  feedAcceleration(magnitude: number, lateral = 0): void {
    if (this.hidden) return
    this.accelTarget = Math.max(0, magnitude)
    this.steerLook(lateral)
  }

  feedMotion(level: number): void {
    if (this.hidden) return
    this.motionTarget = clamp01(level)
  }

  feedLook(x: number, y: number): void {
    if (this.hidden || this.reduced) return
    this.lookTargetX = clampUnit(x)
    this.lookTargetY = clampUnit(y)
    if (Math.abs(x) >= 0.35) this.reactionDir = Math.sign(x)
  }

  private steerLook(lateral: number): void {
    if (this.reduced || Math.abs(lateral) < 0.35) return
    const opposite = this.lookTargetX !== 0 && Math.sign(lateral) !== Math.sign(this.lookTargetX)
    if (opposite || Math.abs(lateral) > Math.abs(this.lookTargetX)) {
      this.lookTargetX = clampUnit(lateral)
      this.reactionDir = Math.sign(lateral)
    }
  }

  tick(dtMs: number): BuddyState {
    if (!this.hidden) {
      const dt = Math.max(0, Math.min(dtMs, MAX_FRAME_DT_MS))
      this.uiElapsed += dt
      const holdingFace = this.reaction.name !== 'none' || this.uiElapsed < this.settleUntil
      if (this.presence === 'awake' && !holdingFace) this.idleElapsed += dt
      if (this.selection === 'auto' && this.presence === 'awake' && !holdingFace) this.autoElapsed += dt
      this.advanceMotion(dt)
      this.advanceReaction(dt)
      this.advanceWake(dt)
      this.advanceBlink()
      const desired = this.desiredPose()
      this.shown = this.reduced ? desired : smoothPose(this.shown, desired, dt, 250)
    }
    return this.snapshot()
  }

  snapshot(): BuddyState {
    const sample = this.logical()
    const shown = this.display()
    const mouthCurve = shown.pose === 'grumpy' ? -0.75 : shown.pose === 'happy' || shown.pose === 'laugh' || shown.pose === 'curious' ? 0.9 : 0.2
    const eyeOpen = shown.pose === 'sleepy' ? 0.2 : shown.pose === 'grumpy' ? 0.6 : 1
    return {
      presence: this.presence,
      selection: this.selection,
      autoSet: [...this.autoSet],
      expression: shown.pose,
      profile: this.profile,
      gazeX: shown.gazeX,
      gazeY: shown.gazeY,
      speed: shown.speed,
      phase: sample.phase,
      resting: this.presence === 'rest' && this.resting,
      wakefulness: this.wakefulness,
      blink: Math.max(this.blink, shown.blink),
      pose: { ...this.shown, mouthCurve, eyeOpen, lookX: shown.gazeX, lookY: shown.gazeY },
      reduced: this.reduced,
      hidden: this.hidden,
      motionLevel: this.motionLevel,
      reaction: this.reaction.name,
      sensitivity: this.sensitivity,
      allowStartled: this.allowStartled,
      allowDizzy: this.allowDizzy,
    }
  }

  private display() {
    const allowed = new Set(this.autoSet)
    let frame = sampleIdle(this.idleElapsed, this.profile, allowed, this.reduced)
    if (this.selection !== 'auto') {
      frame = { ...frame, pose: resolvePose(this.selection, allowed, this.profile), speed: false }
    }
    const reaction = this.reaction.name
    const directed = reaction === 'worried' || reaction === 'startled' || reaction === 'dizzy'
    if (directed) {
      frame = { ...frame, pose: resolvePose(reaction, allowed, this.profile), speed: false }
    } else if (reaction === 'recovery' || (this.uiElapsed < this.settleUntil && this.selection === 'auto' && !(this.presence === 'rest' && this.resting))) {
      frame = { ...frame, pose: resolvePose(this.profile === 'wrist' ? 'happy' : 'curious', allowed, this.profile), speed: false }
    } else if (this.presence === 'rest' && this.resting) {
      frame = { pose: resolvePose('sleepy', allowed, this.profile), gazeX: 0, gazeY: 0, blink: 0, speed: false }
    }
    if (!this.reduced && directed) {
      const dir = Math.abs(this.lookX) > 0.15 ? this.lookX : this.reactionDir
      frame.gazeX = clampUnit(dir === 0 ? frame.gazeX : Math.sign(dir))
      frame.gazeY = clampUnit(this.lookY * 0.35)
    } else if (!this.reduced) {
      const steerX = clampUnit(this.lookX)
      const steerY = clampUnit(this.lookY)
      frame.gazeX = Math.abs(steerX) > 0.35 ? steerX : clampUnit(frame.gazeX * (1 - Math.abs(steerX) / 0.35) + steerX)
      frame.gazeY = Math.abs(steerY) > 0.35 ? steerY : clampUnit(frame.gazeY * (1 - Math.abs(steerY) / 0.35) + steerY)
    }
    return frame
  }

  private logical() {
    const classic = this.autoSet.filter(
      (id): id is Expression => id === 'curious' || id === 'happy' || id === 'grumpy' || id === 'sleepy',
    )
    if (this.selection !== 'auto' && classic.includes(this.selection as Expression)) {
      const expression = this.selection as Expression
      return { expression, phase: 'dwell' as const, from: expression, to: expression, t: 0 }
    }
    return sampleAuto(this.autoElapsed, classic)
  }

  private desiredPose(): FacePose {
    const reactionName = this.reaction.name
    const base = reactionName === 'none' ? expressionPose(this.logical()) : { ...REACTION_POSES[reactionName] }
    if (!this.reduced && this.wakefulness >= 0.75 && reactionName === 'none') {
      base.lookX = clampUnit(base.lookX + Math.sin(this.uiElapsed / 2200) * 0.08 + this.lookX * 0.35)
      base.lookY = clampUnit(base.lookY + this.lookY * 0.2)
    } else if (this.reduced) {
      base.lookX = 0
      base.lookY = 0
    }
    if (this.presence === 'awake' || reactionName !== 'none') return base
    return lerpPose(REST_POSE, base, this.wakefulness)
  }

  private advanceReaction(dt: number): void {
    this.accelLevel = smoothToward(this.accelLevel, this.accelTarget, dt, 140)
    const before = this.reaction.name
    this.reaction = stepReaction(this.reaction, dt, {
      band: motionBand(this.accelLevel, this.sensitivity),
      allowStartled: this.allowStartled,
      allowDizzy: this.allowDizzy,
    })
    if (before === 'none' && this.reaction.name !== 'none') {
      this.resting = false
      this.holdMs = REST_HOLD_MS
    }
    if (before !== 'none' && this.reaction.name === 'none') this.settleUntil = this.uiElapsed + 800
    if (this.uiElapsed < this.simLookUntil && !this.reduced) this.lookTargetX = this.simLookX
  }

  private advanceMotion(dt: number): void {
    this.motionLevel = smoothToward(this.motionLevel, this.motionTarget, dt, 180)
    this.lookX = smoothToward(this.lookX, this.reduced ? 0 : this.lookTargetX, dt, 140)
    this.lookY = smoothToward(this.lookY, this.reduced ? 0 : this.lookTargetY, dt, 140)
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
    if (
      this.reaction.name === 'recovery' &&
      !this.reduced &&
      this.blinkStart < 0 &&
      this.reaction.elapsed < 180
    ) {
      this.nextBlinkAt = Math.min(this.nextBlinkAt, this.uiElapsed + 30)
    }
    if (this.blinkStart < 0 && this.uiElapsed >= this.nextBlinkAt) this.blinkStart = this.uiElapsed
    if (this.blinkStart < 0) return
    const half = this.reduced ? BLINK_HALF_REDUCED_MS : BLINK_HALF_MS
    const u = (this.uiElapsed - this.blinkStart) / half
    if (u >= 2) {
      this.blink = 0
      this.blinkStart = -1
      const double = !this.reduced && this.random() < 0.16
      const recoveryBlink = this.reaction.name === 'recovery' && !this.reduced
      this.nextBlinkAt = this.uiElapsed + (recoveryBlink ? 260 : this.blinkGap(double))
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
