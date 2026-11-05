import { clamp, lerp } from './math.ts'
import { elapsedForBlend, sampleAutoMood, TRANSITION_MS, type MoodName, type MoodPhase, type MoodSample } from './mood.ts'
import { LEAN_SMOOTH_TAU_MS, MAX_FRAME_DT_MS, smoothToward } from './motion.ts'

export type Mode = 'auto' | MoodName

export interface CompanionState {
  mode: Mode
  blend: number
  settled: MoodName
  phase: MoodPhase
  blink: number
  lean: number
  pitch: number
  bounce: number
  breath: number
  lookX: number
  lookY: number
  reduced: boolean
  sway: boolean
  sensor: boolean
}

interface ManualTransition {
  from: number
  to: number
  start: number
  dur: number
}

const BLINK_HALF_MS = 150
const BLINK_HALF_REDUCED_MS = 280

export class CompanionEngine {
  private mode: Mode = 'auto'
  private autoElapsed = 0
  private uiElapsed = 0
  private blend = 0
  private sample: MoodSample = sampleAutoMood(0)
  private manual: ManualTransition | null = null
  private lean = 0
  private pitch = 0
  private leanTarget = 0
  private pitchTarget = 0
  private blink = 0
  private blinkStart = -1
  private nextBlinkAt: number
  private bouncePhase = 0
  private bounce = 0
  private breath = 1
  private lookX = 0
  private lookY = 0
  private reduced = false
  private sway = false
  private sensor = false
  private hidden = false
  private readonly random: () => number

  constructor(options?: { random?: () => number }) {
    this.random = options?.random ?? Math.random
    this.nextBlinkAt = this.blinkGap(false)
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced
    if (reduced) {
      this.sway = false
      this.leanTarget = 0
      this.pitchTarget = 0
    }
  }

  setSway(on: boolean): void {
    if (this.reduced || this.sensor) {
      this.sway = false
      return
    }
    this.sway = on
  }

  setSensorActive(on: boolean): void {
    this.sensor = on
    if (on) this.sway = false
  }

  setLeanTarget(x: number, y = 0): void {
    if (this.reduced) return
    this.leanTarget = clamp(x, -1, 1)
    this.pitchTarget = clamp(y, -1, 1)
  }

  setMode(mode: Mode): void {
    if (mode === 'auto') {
      if (this.mode === 'auto') return
      this.manual = null
      this.autoElapsed = elapsedForBlend(this.blend)
      this.sample = sampleAutoMood(this.autoElapsed)
      this.blend = this.sample.blend
      this.mode = 'auto'
      return
    }
    const target = mode === 'curious' ? 0 : 1
    if (this.mode === mode && !this.manual && Math.abs(this.blend - target) < 0.001) return
    this.mode = mode
    this.manual = {
      from: this.blend,
      to: target,
      start: this.uiElapsed,
      dur: this.reduced ? 220 : TRANSITION_MS,
    }
  }

  /** Jump the Auto clock. Tests use this so dwells do not need a wall-clock wait. */
  seek(elapsedMs: number): void {
    this.mode = 'auto'
    this.manual = null
    this.autoElapsed = Math.max(0, elapsedMs)
    this.sample = sampleAutoMood(this.autoElapsed)
    this.blend = this.sample.blend
  }

  tick(dtMs: number): CompanionState {
    if (!this.hidden) {
      const dt = Math.max(0, Math.min(dtMs, MAX_FRAME_DT_MS))
      this.uiElapsed += dt
      if (this.mode === 'auto') {
        this.autoElapsed += dt
        this.sample = sampleAutoMood(this.autoElapsed)
        this.blend = this.sample.blend
      } else if (this.manual) {
        const u = clamp((this.uiElapsed - this.manual.start) / this.manual.dur, 0, 1)
        const eased = u * u * (3 - 2 * u)
        this.blend = this.manual.from + (this.manual.to - this.manual.from) * eased
        if (u >= 1) this.manual = null
      }
      this.advanceBlink()
      this.advanceBody(dt)
    }
    return this.snapshot()
  }

  snapshot(): CompanionState {
    const settled = this.mode === 'auto' ? this.sample.settled : this.blend < 0.5 ? 'curious' : 'grumpy'
    const phase: MoodPhase = this.mode === 'auto' ? this.sample.phase : this.manual ? 'transition' : 'dwell'
    return {
      mode: this.mode,
      blend: this.blend,
      settled,
      phase,
      blink: this.blink,
      lean: this.lean,
      pitch: this.pitch,
      bounce: this.bounce,
      breath: this.breath,
      lookX: this.lookX,
      lookY: this.lookY,
      reduced: this.reduced,
      sway: this.sway,
      sensor: this.sensor,
    }
  }

  private advanceBlink(): void {
    if (this.blinkStart < 0 && this.uiElapsed >= this.nextBlinkAt) {
      this.blinkStart = this.uiElapsed
    }
    if (this.blinkStart < 0) return
    const half = this.reduced ? BLINK_HALF_REDUCED_MS : BLINK_HALF_MS
    const u = (this.uiElapsed - this.blinkStart) / half
    if (u >= 2) {
      this.blink = 0
      this.blinkStart = -1
      const double = !this.reduced && this.random() < 0.18
      this.nextBlinkAt = this.uiElapsed + this.blinkGap(double)
      return
    }
    this.blink = u < 1 ? u : 2 - u
  }

  private advanceBody(dt: number): void {
    const leanTarget = this.reduced ? 0 : this.composedLean()
    const pitchTarget = this.reduced ? 0 : this.pitchTarget
    this.lean = smoothToward(this.lean, leanTarget, dt, LEAN_SMOOTH_TAU_MS)
    this.pitch = smoothToward(this.pitch, pitchTarget, dt, LEAN_SMOOTH_TAU_MS)
    if (this.reduced) {
      this.bounce = 0
      this.breath = 1
      this.lookX = 0
      this.lookY = 0
      return
    }
    const freq = lerp(1 / 2900, 1 / 4600, this.blend)
    this.bouncePhase = (this.bouncePhase + dt * freq) % 1
    const amp = lerp(8, 2.4, this.blend)
    this.bounce = (1 - Math.cos(this.bouncePhase * Math.PI * 2)) * 0.5 * amp
    this.breath = 1 + Math.sin(this.uiElapsed / 560) * lerp(0.015, 0.006, this.blend)
    this.lookX = clamp(
      Math.sin(this.uiElapsed / 1800) * 0.35 + Math.sin(this.uiElapsed / 4100) * 0.15 + this.lean * 0.5,
      -1,
      1,
    )
    this.lookY = clamp(Math.sin(this.uiElapsed / 2400) * 0.22 + this.pitch * 0.35, -1, 1)
  }

  private composedLean(): number {
    let target = this.leanTarget
    if (!this.sensor && this.sway) {
      target = clamp(target + Math.sin(this.uiElapsed / 1500) * 0.4, -1, 1)
    }
    return target
  }

  private blinkGap(double: boolean): number {
    if (double) return 180 + this.random() * 160
    if (this.reduced) return 8_000 + this.random() * 4_000
    return 3_200 + this.random() * 2_800
  }
}

export function advance(engine: CompanionEngine, ms: number, step = 16): CompanionState {
  let left = ms
  let state = engine.snapshot()
  while (left > 0) {
    const dt = Math.min(step, left)
    state = engine.tick(dt)
    left -= dt
  }
  return state
}
