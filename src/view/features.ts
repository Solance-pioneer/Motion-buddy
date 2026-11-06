import type { PoseId } from '../logic/library.ts'
import { clamp } from '../logic/math.ts'
import { smoothToward } from '../logic/motion.ts'

export type FaceStyle = 'soft' | 'tile'

export interface EyeSpec {
  cx: number
  cy: number
  w: number
  h: number
  peak: number
  rot: number
  radius: number
  /** Clockwise turns. Absent or 0 draws the normal eye. */
  spiral?: number
}

export interface MouthSpec {
  y: number
  width: number
  curve: number
  open: number
  gape: number
  shift: number
}

export interface FaceFeatures {
  left: EyeSpec
  right: EyeSpec
  mouth: MouthSpec
  blush: number
  sweat: number
  anger: number
  speed: number
  /** 0–1 soft brow lift. Absent means no brows. */
  brow?: number
}

const POSE_MS = 360
const REACTION_MS = 210

const REACTION_POSES = new Set<PoseId>(['worried', 'startled', 'dizzy'])

export function featuresFor(pose: PoseId, style: FaceStyle): FaceFeatures {
  const drawn = poseSpec(pose)
  drawn.left.radius = corner(drawn.left, style)
  drawn.right.radius = corner(drawn.right, style)
  return drawn
}

export function lerpFeatures(a: FaceFeatures, b: FaceFeatures, t: number): FaceFeatures {
  return {
    left: lerpEye(a.left, b.left, t),
    right: lerpEye(a.right, b.right, t),
    mouth: {
      y: lerp(a.mouth.y, b.mouth.y, t),
      width: lerp(a.mouth.width, b.mouth.width, t),
      curve: lerp(a.mouth.curve, b.mouth.curve, t),
      open: lerp(a.mouth.open, b.mouth.open, t),
      gape: lerp(a.mouth.gape, b.mouth.gape, t),
      shift: lerp(a.mouth.shift, b.mouth.shift, t),
    },
    blush: lerp(a.blush, b.blush, t),
    sweat: lerp(a.sweat, b.sweat, t),
    anger: lerp(a.anger, b.anger, t),
    speed: lerp(a.speed, b.speed, t),
  }
}

const KAPPA = 0.5522847498

/**
 * One smooth outline for every eye. Open eyes are ellipses: the side tangents
 * stay vertical, so the left and right ends are round, not almond points.
 * A higher peak shortens the lower half into a crescent. The same four curves
 * are used in between, so a morph never grows a flat base or a center spike.
 */
export function eyePath(eye: EyeSpec): string {
  if (eye.spiral && eye.spiral > 0) return spiralPath(eye.cx, eye.cy, eye.spiral)
  const rx = Math.max(2.2, eye.w) / 2
  const ry = Math.max(1.6, eye.h) / 2
  const smile = Math.max(0, eye.peak)
  const closure = smile <= 0 ? 0 : Math.min(1, smile / (smile + ry))
  const top = ry * (1 - closure) + Math.min(rx * 0.62, ry * 0.35 + smile * 0.45) * closure
  let bot = ry * (1 - closure) - top * 0.55 * closure
  if (top + bot < 2.2) bot = 2.2 - top
  const cx = eye.cx
  const cy = eye.cy - closure * ry * 0.12
  const yTop = cy - top
  const yBot = cy + bot
  const ySide = cy
  const kx = rx * KAPPA
  const kTop = top * KAPPA
  const kBot = Math.abs(bot) * KAPPA
  return [
    `M ${n(cx)} ${n(yTop)}`,
    `C ${n(cx + kx)} ${n(yTop)} ${n(cx + rx)} ${n(ySide - kTop)} ${n(cx + rx)} ${n(ySide)}`,
    `C ${n(cx + rx)} ${n(ySide + kBot)} ${n(cx + kx)} ${n(yBot)} ${n(cx)} ${n(yBot)}`,
    `C ${n(cx - kx)} ${n(yBot)} ${n(cx - rx)} ${n(ySide + kBot)} ${n(cx - rx)} ${n(ySide)}`,
    `C ${n(cx - rx)} ${n(ySide - kTop)} ${n(cx - kx)} ${n(yTop)} ${n(cx)} ${n(yTop)}`,
    'Z',
  ].join(' ')
}

/** Local clockwise spiral with a rounded tip. It does not move the page. */
export function spiralPath(cx: number, cy: number, turns: number): string {
  const steps = 36
  const maxA = Math.max(0.15, turns) * Math.PI * 2
  let d = ''
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = t * maxA
    const radius = 0.8 + t * 7.4
    const x = cx + Math.cos(a) * radius
    const y = cy + Math.sin(a) * radius
    d += i === 0 ? `M ${n(x)} ${n(y)}` : ` L ${n(x)} ${n(y)}`
  }
  return d
}

/** One filled loop for every mouth, so a smile can open, frown, or yawn without swapping shapes. */
export function mouthPath(mouth: MouthSpec): string {
  const left = 50 - mouth.width / 2 + mouth.shift
  const right = 50 + mouth.width / 2 + mouth.shift
  const mid = 50 + mouth.shift
  const y = mouth.y
  const lower = y + mouth.curve + mouth.open * mouth.gape + 2.6
  const upper = y + mouth.curve * 0.22 - mouth.open * mouth.gape * 0.55
  return `M ${n(left)} ${n(y)} Q ${n(mid)} ${n(lower)} ${n(right)} ${n(y)} Q ${n(mid)} ${n(upper)} ${n(left)} ${n(y)} Z`
}

export class FaceBlend {
  private shown = featuresFor('curious', 'soft')
  private from = this.shown
  private to = this.shown
  private key = 'curious:soft'
  private elapsed = 0
  private duration = 0

  sample(pose: PoseId, style: FaceStyle, reduced: boolean, speed: boolean, dtMs: number, motion?: { key: string; features: FaceFeatures }): FaceFeatures {
    const key = motion ? `show:${motion.key}:${style}` : `${pose}:${style}`
    const target = motion ? structuredClone(motion.features) : featuresFor(pose, style)
    target.speed = speed && !reduced ? 1 : 0
    if (key !== this.key) {
      this.from = this.shown
      this.to = target
      this.key = key
      this.elapsed = 0
      this.duration = reduced ? 0 : REACTION_POSES.has(pose) ? REACTION_MS : POSE_MS
    } else {
      this.to = target
    }
    const dt = Math.max(0, Math.min(dtMs, 80))
    this.elapsed += dt
    const t = this.duration <= 0 ? 1 : Math.min(1, this.elapsed / this.duration)
    const speedNow = this.shown.speed
    this.shown = lerpFeatures(this.from, this.to, smoothstep(t))
    this.shown.speed = reduced ? target.speed : smoothToward(speedNow, target.speed, dt, 160)
    return this.shown
  }
}

function poseSpec(pose: PoseId): FaceFeatures {
  switch (pose) {
    case 'happy':
      return face(eye(32, 40, 20, 9, 13, 0), eye(68, 40, 20, 9, 13, 0), mouth(66, 20, 9, 0.15, 3, 0), 0, 0, 0)
    case 'laugh':
      return face(eye(32, 40, 18, 8, 11, 0), eye(68, 40, 18, 8, 11, 0), mouth(66, 22, 12, 0, 0, 0), 0, 0, 0)
    case 'shy':
      return face(eye(33, 42, 14, 22, 0, 0), eye(67, 42, 14, 22, 0, 0), mouth(70, 14, 6, 0, 0, 0), 0, 0, 0)
    case 'smug':
      return face(eye(32, 42, 16, 12, 4, 0), eye(68, 41, 16, 11, 2, 0), mouth(69, 14, 4, 0, 0, 3), 0, 0, 0)
    case 'grumpy':
      return face(eye(32, 42, 16, 15, 0, 0), eye(68, 42, 16, 15, 0, 0), mouth(72, 18, -9, 0, 0, 0), 0, 0, 1)
    case 'determined':
      return face(eye(32, 42, 16, 14, 0, 0), eye(68, 42, 16, 14, 0, 0), mouth(70, 16, 0, 0, 0, 0), 0, 0, 0)
    case 'worried':
      return face(eye(31, 38, 18, 34, 0, 0), eye(69, 38, 18, 34, 0, 0), mouth(72, 11, 1.5, 1, 7.5, 0), 0, 1, 0)
    case 'startled':
      return face(eye(30, 36, 22, 22, 0, 0), eye(70, 38, 18, 18, 0, 0), mouth(73, 12, 0, 1, 10, 0), 0, 0, 0)
    case 'sleepy':
      return face(eye(32, 46, 18, 5, 3, 0), eye(68, 46, 18, 5, 3, 0), mouth(72, 15, 4, 0.15, 3, 0), 0, 0, 0)
    case 'pant':
      return face(eye(31, 39, 18, 24, 0, 0), eye(69, 39, 18, 24, 0, 0), mouth(72, 14, 1, 1, 11, 0), 0, 1, 0)
    case 'dizzy':
      return face(eye(31, 40, 16, 24, 0, 0), eye(69, 36, 14, 16, 0, 0), mouth(73, 13, -4, 0.2, 3, 0), 0, 1, 0)
    case 'wink':
      return face(eye(32, 38, 16, 30, 0, 0), eye(68, 42, 16, 6, 8, 0), mouth(68, 18, 8, 0, 0, 0), 0.4, 0, 0)
    case 'content':
      return face(eye(32, 42, 17, 16, 2, 0), eye(68, 42, 17, 16, 2, 0), mouth(69, 16, 6, 0, 0, 0), 0, 0, 0)
    case 'yawn':
      return face(eye(32, 44, 18, 7, 4, 0), eye(68, 44, 18, 7, 4, 0), mouth(70, 12, 1, 1, 11, 0), 0, 0, 0)
    case 'curious':
    default:
      return face(eye(32, 38, 20, 28, 0, 0), eye(68, 38, 20, 28, 0, 0), mouth(67, 20, 10, 0, 0, 0), 0, 0, 0)
  }
}

export function eye(cx: number, cy: number, w: number, h: number, peak: number, rot: number): EyeSpec {
  return { cx, cy, w, h, peak, rot, radius: Math.min(w, h) / 2 }
}

export function mouth(y: number, width: number, curve: number, open: number, gape: number, shift: number): MouthSpec {
  return { y, width, curve, open, gape, shift }
}

export function face(left: EyeSpec, right: EyeSpec, lips: MouthSpec, blush: number, sweat: number, anger: number): FaceFeatures {
  return { left, right, mouth: lips, blush, sweat, anger, speed: 0 }
}

function corner(eye: EyeSpec, style: FaceStyle): number {
  if (style === 'soft') return Math.min(eye.w, eye.h) / 2
  return Math.min(2.6, eye.w / 2, eye.h / 2)
}

function lerpEye(a: EyeSpec, b: EyeSpec, t: number): EyeSpec {
  return {
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    peak: lerp(a.peak, b.peak, t),
    rot: lerp(a.rot, b.rot, t),
    radius: lerp(a.radius, b.radius, t),
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

function n(value: number): string {
  return value.toFixed(1)
}
