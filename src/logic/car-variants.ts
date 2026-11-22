import type { DriveCueName } from './car-tilt.ts'

/**
 * Run-45 car reactions. The v2 squish correction replaces the drawn window:
 * the phone screen is the glass, and the cheeks are a face overlay.
 * Hard-brake film stays in charge when it plays. These poses are the fallback.
 */
export type CarVariantId = 'brake_glass_squish' | 'brake_fly_forward_crack' | 'accel_helmet_mic' | 'accel_anime_rush'

export interface CarVariantPose {
  id: CarVariantId
  done: boolean
  scaleX: number
  scaleY: number
  rotate: number
  faceOpacity: number
  cheeks: number
  mouthScaleX: number
  mouthScaleY: number
  helmet: number
  helmetY: number
  crack: number
  speed: number
  speedX: number
}

export interface CarVariantRun {
  id: CarVariantId
  started: number
  reduced: boolean
}

const CUE_VARIANT: Record<DriveCueName, CarVariantId> = {
  car_brake_soft_a: 'brake_glass_squish',
  car_brake_soft_b: 'brake_fly_forward_crack',
  car_accel_rev_a: 'accel_helmet_mic',
  car_accel_rev_b: 'accel_anime_rush',
}

const DURATION_MS: Record<CarVariantId, number> = {
  brake_glass_squish: 1_100,
  brake_fly_forward_crack: 1_500,
  accel_helmet_mic: 1_700,
  accel_anime_rush: 2_600,
}

interface Frame {
  t: number
  scaleX: number
  scaleY: number
  rotate: number
  cheeks: number
  mouthScaleX: number
  mouthScaleY: number
  helmet: number
  helmetY: number
}

const SQUISH: Frame[] = [
  { t: 0, scaleX: 0.45, scaleY: 0.45, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
  { t: 0.12, scaleX: 0.68, scaleY: 0.68, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
  { t: 0.29, scaleX: 1.38, scaleY: 1.06, rotate: 0, cheeks: 0.3, mouthScaleX: 1.15, mouthScaleY: 0.6, helmet: 0, helmetY: 0 },
  { t: 0.36, scaleX: 1.5, scaleY: 0.66, rotate: 0, cheeks: 1, mouthScaleX: 1.45, mouthScaleY: 0.25, helmet: 0, helmetY: 0 },
  { t: 0.54, scaleX: 1.5, scaleY: 0.66, rotate: 0, cheeks: 1, mouthScaleX: 1.45, mouthScaleY: 0.25, helmet: 0, helmetY: 0 },
  { t: 0.78, scaleX: 1.12, scaleY: 0.95, rotate: 0, cheeks: 0.25, mouthScaleX: 1.1, mouthScaleY: 0.8, helmet: 0, helmetY: 0 },
  { t: 1.1, scaleX: 1, scaleY: 1, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
]

/** Film wins. The coded pose, including squish v2, plays only when no film started. */
export function codedVariantId(cue: DriveCueName, filmPlayed: boolean): CarVariantId | null {
  if (filmPlayed) return null
  return CUE_VARIANT[cue]
}

export function sampleCarVariantRun(run: CarVariantRun | null, now: number): CarVariantPose | null {
  if (!run) return null
  return sampleCarVariant(run.id, now - run.started, run.reduced)
}

export function sampleCarVariant(id: CarVariantId, ms: number, reduced: boolean): CarVariantPose {
  const seconds = Math.max(0, ms) / 1000
  const limit = DURATION_MS[id] / 1000
  if (seconds >= limit) return restPose(id)
  if (id === 'brake_glass_squish') return squishPose(seconds, seconds, reduced, false)
  if (id === 'brake_fly_forward_crack') return squishPose(seconds / (1.5 / 1.1), seconds, reduced, true)
  if (id === 'accel_helmet_mic') return helmetPose(seconds, reduced)
  return animePose(seconds, reduced)
}

function squishPose(frameSeconds: number, wallSeconds: number, reduced: boolean, crack: boolean): CarVariantPose {
  const id: CarVariantId = crack ? 'brake_fly_forward_crack' : 'brake_glass_squish'
  const frame = reduced ? reducedSquish(Math.min(frameSeconds, 1.1)) : lerp(SQUISH, Math.min(frameSeconds, 1.1))
  const fade = reduced ? 1 : Math.min(1, frameSeconds / 0.05)
  let crackOpacity = 0
  if (crack && !reduced && wallSeconds >= 0.49 && wallSeconds <= 1.3) {
    if (wallSeconds < 0.55) crackOpacity = (wallSeconds - 0.49) / 0.06
    else if (wallSeconds > 1.2) crackOpacity = (1.3 - wallSeconds) / 0.1
    else crackOpacity = 1
  }
  return {
    id,
    done: false,
    scaleX: frame.scaleX,
    scaleY: frame.scaleY,
    rotate: 0,
    faceOpacity: fade,
    cheeks: frame.cheeks,
    mouthScaleX: frame.mouthScaleX,
    mouthScaleY: frame.mouthScaleY,
    helmet: 0,
    helmetY: 0,
    crack: crackOpacity,
    speed: 0,
    speedX: 0,
  }
}

function reducedSquish(seconds: number): Frame {
  let cheeks = 0
  if (seconds < 0.2) cheeks = seconds / 0.2
  else if (seconds < 0.7) cheeks = 1
  else cheeks = Math.max(0, 1 - (seconds - 0.7) / 0.4)
  const flat = cheeks
  return {
    t: seconds,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    cheeks,
    mouthScaleX: 1 + 0.45 * flat,
    mouthScaleY: 1 - 0.75 * flat,
    helmet: 0,
    helmetY: 0,
  }
}

function helmetPose(seconds: number, reduced: boolean): CarVariantPose {
  const live = lerp(
    [
      { t: 0, scaleX: 1, scaleY: 1, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 1, helmetY: -100 },
      { t: 0.18, scaleX: 0.94, scaleY: 1.06, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 1, helmetY: 0 },
      { t: 1.25, scaleX: 0.94, scaleY: 1.06, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 1, helmetY: 0 },
      { t: 1.7, scaleX: 1, scaleY: 1, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
    ],
    seconds,
  )
  const fade = helmetFade(seconds, 0.18, 1.25, 1.7)
  return {
    id: 'accel_helmet_mic',
    done: false,
    scaleX: reduced ? 1 : live.scaleX,
    scaleY: reduced ? 1 : live.scaleY,
    rotate: 0,
    faceOpacity: 1,
    cheeks: 0,
    mouthScaleX: 1,
    mouthScaleY: 1,
    helmet: reduced ? fade : live.helmet,
    helmetY: reduced ? 0 : live.helmetY,
    crack: 0,
    speed: 0,
    speedX: 0,
  }
}

function animePose(seconds: number, reduced: boolean): CarVariantPose {
  const live = lerp(
    [
      { t: 0, scaleX: 1, scaleY: 1, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
      { t: 0.22, scaleX: 0.8, scaleY: 0.92, rotate: -5, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
      { t: 2.15, scaleX: 0.8, scaleY: 0.92, rotate: -5, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
      { t: 2.6, scaleX: 1, scaleY: 1, rotate: 0, cheeks: 0, mouthScaleX: 1, mouthScaleY: 1, helmet: 0, helmetY: 0 },
    ],
    seconds,
  )
  const helmet = helmetFade(seconds, 0.18, 2.15, 2.6)
  const rushing = !reduced && seconds >= 0.25 && seconds <= 2.2
  const pass = ((seconds - 0.25) % 0.28) / 0.28
  return {
    id: 'accel_anime_rush',
    done: false,
    scaleX: reduced ? 1 : live.scaleX,
    scaleY: reduced ? 1 : live.scaleY,
    rotate: reduced ? 0 : live.rotate,
    faceOpacity: 1,
    cheeks: 0,
    mouthScaleX: 1,
    mouthScaleY: 1,
    helmet,
    helmetY: 0,
    crack: 0,
    speed: rushing ? 0.75 : 0,
    speedX: rushing ? -16 + pass * 32 : 0,
  }
}

function helmetFade(seconds: number, inn: number, hold: number, out: number): number {
  if (seconds <= 0 || seconds >= out) return 0
  if (seconds < inn) return seconds / inn
  if (seconds < hold) return 1
  return Math.max(0, 1 - (seconds - hold) / (out - hold))
}

function restPose(id: CarVariantId): CarVariantPose {
  return {
    id,
    done: true,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    faceOpacity: 1,
    cheeks: 0,
    mouthScaleX: 1,
    mouthScaleY: 1,
    helmet: 0,
    helmetY: 0,
    crack: 0,
    speed: 0,
    speedX: 0,
  }
}

function lerp(frames: Frame[], seconds: number): Frame {
  if (seconds <= frames[0].t) return frames[0]
  for (let i = 1; i < frames.length; i += 1) {
    const next = frames[i]
    if (seconds > next.t) continue
    const prev = frames[i - 1]
    const span = next.t - prev.t
    const u = span <= 0 ? 1 : (seconds - prev.t) / span
    const mix = (from: number, to: number) => from + (to - from) * u
    return {
      t: seconds,
      scaleX: mix(prev.scaleX, next.scaleX),
      scaleY: mix(prev.scaleY, next.scaleY),
      rotate: mix(prev.rotate, next.rotate),
      cheeks: mix(prev.cheeks, next.cheeks),
      mouthScaleX: mix(prev.mouthScaleX, next.mouthScaleX),
      mouthScaleY: mix(prev.mouthScaleY, next.mouthScaleY),
      helmet: mix(prev.helmet, next.helmet),
      helmetY: mix(prev.helmetY, next.helmetY),
    }
  }
  return frames[frames.length - 1]
}

/** Paint one frame. A finished or missing run restores the plain face. */
export function applyCarVariant(root: ParentNode | null, pose: CarVariantPose | null): void {
  if (!root) return
  const shown = pose && !pose.done ? pose : null
  const reaction = root.querySelector('[data-part="car-reaction"]') as SVGGElement | null
  const cheeks = root.querySelector('[data-part="squashed-cheeks"]') as SVGGElement | null
  const helmet = root.querySelector('[data-part="racing-helmet"]') as SVGGElement | null
  const crack = root.querySelector('[data-part="glass-crack"]') as SVGGElement | null
  const speed = root.querySelector('[data-part="anime-speed"]') as SVGGElement | null
  const mouth = root.querySelector('[data-part="mouth"]') as SVGPathElement | null
  if (reaction) {
    if (!shown) {
      reaction.removeAttribute('transform')
      reaction.setAttribute('opacity', '1')
    } else {
      reaction.setAttribute('opacity', shown.faceOpacity.toFixed(3))
      reaction.setAttribute(
        'transform',
        `translate(50 46) rotate(${shown.rotate.toFixed(2)}) scale(${shown.scaleX.toFixed(3)} ${shown.scaleY.toFixed(3)}) translate(-50 -46)`,
      )
    }
  }
  if (cheeks) cheeks.setAttribute('opacity', shown ? shown.cheeks.toFixed(3) : '0')
  if (helmet) {
    helmet.setAttribute('opacity', shown ? shown.helmet.toFixed(3) : '0')
    helmet.setAttribute('transform', shown && shown.helmetY !== 0 ? `translate(0 ${shown.helmetY.toFixed(2)})` : '')
  }
  if (crack) crack.setAttribute('opacity', shown ? shown.crack.toFixed(3) : '0')
  if (speed) {
    speed.setAttribute('opacity', shown ? shown.speed.toFixed(3) : '0')
    speed.setAttribute('transform', shown && shown.speed > 0 ? `translate(${shown.speedX.toFixed(2)} 0)` : '')
  }
  if (mouth) {
    if (!shown) {
      mouth.removeAttribute('transform')
      mouth.setAttribute('opacity', '1')
    } else {
      mouth.setAttribute(
        'transform',
        `translate(50 69.5) scale(${shown.mouthScaleX.toFixed(3)} ${shown.mouthScaleY.toFixed(3)}) translate(-50 -69.5)`,
      )
      const chinOn = shown.helmet > 0.15 && Math.abs(shown.helmetY) < 20
      mouth.setAttribute('opacity', chinOn ? '0' : '1')
    }
  }
}
