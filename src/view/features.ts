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

export function eyePath(eye: EyeSpec): string {
  const w = Math.max(2.2, eye.w)
  const h = Math.max(2.2, eye.h)
  const x = eye.cx - w / 2
  const y = eye.cy - h / 2
  const r = Math.max(0.8, Math.min(eye.radius, w / 2, h / 2))
  const peak = eye.peak
  const mid = eye.cx
  return [
    `M ${n(x + r)} ${n(y)}`,
    `Q ${n(mid)} ${n(y - peak)} ${n(x + w - r)} ${n(y)}`,
    `Q ${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)}`,
    `V ${n(y + h - r)}`,
    `Q ${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)}`,
    `H ${n(x + r)}`,
    `Q ${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)}`,
    `V ${n(y + r)}`,
    `Q ${n(x)} ${n(y)} ${n(x + r)} ${n(y)}`,
    'Z',
  ].join(' ')
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

  sample(pose: PoseId, style: FaceStyle, reduced: boolean, speed: boolean, dtMs: number): FaceFeatures {
    const key = `${pose}:${style}`
    const target = featuresFor(pose, style)
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
      return face(eye(32, 40, 18, 8, 12, 0), eye(68, 40, 18, 8, 12, 0), mouth(66, 22, 10, 0, 0, 0), 1, 0, 0)
    case 'laugh':
      return face(eye(32, 40, 18, 7, 14, 0), eye(68, 41, 17, 7, 13, 0), mouth(67, 26, 8, 0.45, 7, 0), 1, 0, 0)
    case 'shy':
      return face(eye(33, 43, 13, 20, 1, -4), eye(67, 44, 12, 18, 1, 3), mouth(70, 14, 6, 0, 0, 0), 1, 0, 0)
    case 'smug':
      return face(eye(32, 41, 16, 11, 9, -8), eye(69, 40, 15, 10, 7, 7), mouth(69, 15, 5, 0, 0, 5), 0.2, 0, 0)
    case 'grumpy':
      return face(eye(33, 42, 15, 16, 0, -12), eye(67, 42, 15, 16, 0, 12), mouth(72, 18, -9, 0, 0, 0), 0, 0, 1)
    case 'determined':
      return face(eye(32, 42, 16, 13, 0, 0), eye(68, 42, 16, 13, 0, 0), mouth(70, 16, 0, 0, 0, 0), 0, 0, 0)
    case 'worried':
      return face(eye(31, 38, 17, 34, 0, -6), eye(69, 38, 17, 34, 0, 6), mouth(72, 10, 1.5, 1, 7.5, 0), 0, 1, 0)
    case 'startled':
      return face(eye(30, 37, 20, 20, 0, -4), eye(70, 39, 16, 16, 0, 8), mouth(73, 13, 0, 1, 9, 0), 0, 0.3, 0)
    case 'sleepy':
      return face(eye(32, 46, 18, 5, 3, 0), eye(68, 46, 18, 5, 3, 0), mouth(72, 15, 4, 0.15, 3, 0), 0, 0, 0)
    case 'pant':
      return face(eye(31, 39, 18, 24, 0, -3), eye(69, 40, 17, 22, 0, 4), mouth(72, 14, 1, 1, 11, 0), 0.15, 1, 0)
    case 'dizzy':
      return face(eye(31, 42, 13, 26, 0, -18), eye(70, 36, 12, 18, 0, 16), mouth(73, 13, -6, 0.25, 4, 1), 0, 1, 0)
    case 'curious':
    default:
      return face(eye(32, 37, 16, 32, 0, -2), eye(68, 38, 15, 29, 0, 3), mouth(67, 24, 12, 0, 0, 0), 0, 0, 0)
  }
}

function eye(cx: number, cy: number, w: number, h: number, peak: number, rot: number): EyeSpec {
  return { cx, cy, w, h, peak, rot, radius: Math.min(w, h) / 2 }
}

function mouth(y: number, width: number, curve: number, open: number, gape: number, shift: number): MouthSpec {
  return { y, width, curve, open, gape, shift }
}

function face(left: EyeSpec, right: EyeSpec, lips: MouthSpec, blush: number, sweat: number, anger: number): FaceFeatures {
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
