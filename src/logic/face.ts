import { lerp, smoothstep } from './math.ts'

export interface BrowSpec {
  x0: number
  y0: number
  xc: number
  yc: number
  x1: number
  y1: number
}

export interface FacePose {
  browLeft: BrowSpec
  browRight: BrowSpec
  eyeRx: number
  eyeRy: number
  pupilR: number
  iris: string
  /** Positive moves the eyes slightly apart. */
  eyeSpread: number
  mouthOpenOpacity: number
  mouthOpenRx: number
  mouthOpenRy: number
  mouthFrownOpacity: number
  mouthFrown: string
  cheek: number
}

export const FACE_CENTER_X = 130
export const EYE_Y = 168
export const EYE_LEFT_X = 104
export const EYE_RIGHT_X = 156
export const MOUTH_Y = 210

const CURIOUS_BROW: BrowSpec = { x0: 82, y0: 142, xc: 102, yc: 128, x1: 124, y1: 140 }
const GRUMPY_BROW: BrowSpec = { x0: 84, y0: 150, xc: 104, yc: 153, x1: 124, y1: 156 }

export function facePose(blend: number): FacePose {
  const t = smoothstep(clamp01(blend))
  const browLeft = lerpBrow(CURIOUS_BROW, GRUMPY_BROW, t)
  return {
    browLeft,
    browRight: mirrorBrow(browLeft),
    eyeRx: lerp(21, 19.5, t),
    eyeRy: lerp(24, 18, t),
    pupilR: lerp(6.4, 5.4, t),
    iris: mixHex('#4a645c', '#2a312e', t),
    eyeSpread: lerp(2, -2.5, t),
    mouthOpenOpacity: fadeRange(blend, 0.12, 0.5, 'out'),
    mouthOpenRx: lerp(10, 4, closeAmount(blend)),
    mouthOpenRy: lerp(6.2, 1.5, closeAmount(blend)),
    mouthFrownOpacity: fadeRange(blend, 0.42, 0.86, 'in'),
    mouthFrown: frownPath(blend),
    cheek: lerp(0.55, 0.14, t),
  }
}

export function browPath(brow: BrowSpec): string {
  return `M ${n(brow.x0)} ${n(brow.y0)} Q ${n(brow.xc)} ${n(brow.yc)} ${n(brow.x1)} ${n(brow.y1)}`
}

function frownPath(blend: number): string {
  const t = clamp01(blend)
  const half = lerp(15, 22, t)
  const midY = lerp(MOUTH_Y, MOUTH_Y - 9, t)
  return `M ${n(FACE_CENTER_X - half)} ${MOUTH_Y} Q ${FACE_CENTER_X} ${n(midY)} ${n(FACE_CENTER_X + half)} ${MOUTH_Y}`
}

function closeAmount(blend: number): number {
  return smoothstep(clamp01(blend / 0.5))
}

function fadeRange(blend: number, start: number, end: number, direction: 'in' | 'out'): number {
  const u = smoothstep((blend - start) / (end - start))
  return direction === 'in' ? u : 1 - u
}

function lerpBrow(a: BrowSpec, b: BrowSpec, t: number): BrowSpec {
  return {
    x0: lerp(a.x0, b.x0, t),
    y0: lerp(a.y0, b.y0, t),
    xc: lerp(a.xc, b.xc, t),
    yc: lerp(a.yc, b.yc, t),
    x1: lerp(a.x1, b.x1, t),
    y1: lerp(a.y1, b.y1, t),
  }
}

function mirrorBrow(brow: BrowSpec): BrowSpec {
  const mirror = (x: number) => FACE_CENTER_X * 2 - x
  return {
    x0: mirror(brow.x0),
    y0: brow.y0,
    xc: mirror(brow.xc),
    yc: brow.yc,
    x1: mirror(brow.x1),
    y1: brow.y1,
  }
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const channels = pa.map((channel, index) => Math.round(lerp(channel, pb[index], t)))
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function n(value: number): string {
  return value.toFixed(1)
}
