import type { PoseId } from '../logic/library.ts'
import type { FaceStyle } from './applyPose.ts'

export interface Silhouette {
  left: string
  right: string
  mouth: string
  blush: boolean
  sweat: boolean
  anger: boolean
}

const L = { x: 33, y: 40 }
const R = { x: 67, y: 40 }

function capsule(cx: number, cy: number, w: number, h: number, style: FaceStyle): string {
  const x = cx - w / 2
  const y = cy - h / 2
  const r = Math.min(style === 'soft' ? w / 2 : 2.4, w / 2, h / 2)
  return `M ${n(x + r)} ${n(y)} H ${n(x + w - r)} Q ${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)} V ${n(y + h - r)} Q ${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} H ${n(x + r)} Q ${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)} V ${n(y + r)} Q ${n(x)} ${n(y)} ${n(x + r)} ${n(y)} Z`
}

function caret(cx: number, cy: number, w: number, rise: number): string {
  return `M ${n(cx - w)} ${n(cy + 4)} Q ${n(cx)} ${n(cy - rise)} ${n(cx + w)} ${n(cy + 4)} Q ${n(cx)} ${n(cy + 1)} ${n(cx - w)} ${n(cy + 4)} Z`
}

function squeeze(cx: number, cy: number): string {
  return `M ${n(cx - 7)} ${n(cy)} Q ${n(cx)} ${n(cy - 7)} ${n(cx + 7)} ${n(cy)} Q ${n(cx)} ${n(cy + 2)} ${n(cx - 7)} ${n(cy)} Z`
}

function moon(cx: number, cy: number, tilt: number): string {
  return `M ${n(cx - 8)} ${n(cy + tilt)} Q ${n(cx)} ${n(cy - 9)} ${n(cx + 8)} ${n(cy - tilt)} L ${n(cx + 6)} ${n(cy + 2)} Q ${n(cx)} ${n(cy - 3)} ${n(cx - 6)} ${n(cy + 2)} Z`
}

function circle(cx: number, cy: number, r: number): string {
  return `M ${n(cx - r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 1 ${n(cx - r)} ${n(cy)} Z`
}

function smile(width: number, depth: number, y = 70): string {
  const x0 = 50 - width / 2
  const x1 = 50 + width / 2
  return `M ${n(x0)} ${n(y)} Q 50 ${n(y + depth)} ${n(x1)} ${n(y)} Q 50 ${n(y + depth * 0.28)} ${n(x0)} ${n(y)} Z`
}

function frown(width: number, depth: number): string {
  const x0 = 50 - width / 2
  const x1 = 50 + width / 2
  return `M ${n(x0)} 72 Q 50 ${n(72 - depth)} ${n(x1)} 72 Q 50 ${n(72 - depth * 0.25)} ${n(x0)} 72 Z`
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${n(cx - rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx + rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx - rx)} ${n(cy)} Z`
}

function flat(cx: number, cy: number, w: number): string {
  return capsule(cx, cy, w, 3.4, 'soft')
}

export function silhouette(pose: PoseId, style: FaceStyle): Silhouette {
  switch (pose) {
    case 'happy':
      return { left: caret(L.x, L.y, 9, 12), right: caret(R.x, R.y, 9, 12), mouth: smile(16, 7), blush: true, sweat: false, anger: false }
    case 'laugh':
      return { left: squeeze(L.x, L.y), right: squeeze(R.x, R.y), mouth: `M 38 70 Q 44 62 50 70 Q 56 62 62 70 Q 50 78 38 70 Z`, blush: true, sweat: false, anger: false }
    case 'shy':
      return { left: capsule(L.x - 1, L.y + 2, 11, 18, style), right: capsule(R.x + 1, R.y + 3, 10, 16, style), mouth: smile(10, 4, 72), blush: true, sweat: false, anger: false }
    case 'smug':
      return { left: moon(L.x, L.y, 2), right: moon(R.x + 1, R.y - 1, -3), mouth: `M 46 71 Q 55 66 60 73 Q 52 70 46 71 Z`, blush: false, sweat: false, anger: false }
    case 'grumpy':
      return {
        left: `M ${n(L.x - 8)} ${n(L.y + 2)} Q ${n(L.x - 8)} ${n(L.y - 6)} ${n(L.x)} ${n(L.y - 4)} Q ${n(L.x + 8)} ${n(L.y - 10)} ${n(L.x + 8)} ${n(L.y + 2)} Z`,
        right: `M ${n(R.x - 8)} ${n(R.y + 2)} Q ${n(R.x - 8)} ${n(R.y - 10)} ${n(R.x)} ${n(R.y - 4)} Q ${n(R.x + 8)} ${n(R.y - 6)} ${n(R.x + 8)} ${n(R.y + 2)} Z`,
        mouth: frown(16, 7),
        blush: false,
        sweat: false,
        anger: true,
      }
    case 'determined':
      return { left: capsule(L.x, L.y, 12, 14, style), right: capsule(R.x, R.y, 12, 14, style), mouth: capsule(50, 71, 14, 2.8, 'tile'), blush: false, sweat: false, anger: false }
    case 'worried':
      return { left: capsule(L.x, L.y + 1, 15, 28, style), right: capsule(R.x, R.y + 1, 15, 28, style), mouth: ellipse(50, 72, 3.4, 4.6), blush: false, sweat: true, anger: false }
    case 'startled':
      return { left: circle(L.x - 1, L.y - 1, 11), right: circle(R.x + 1, R.y + 1, 8), mouth: circle(50, 73, 5.2), blush: false, sweat: false, anger: false }
    case 'sleepy':
      return { left: flat(L.x, L.y, 16), right: flat(R.x, R.y, 16), mouth: smile(12, 3, 72), blush: false, sweat: false, anger: false }
    case 'pant':
      return { left: capsule(L.x, L.y, 16, 22, style), right: capsule(R.x, R.y + 1, 15, 20, style), mouth: ellipse(50, 73, 5.6, 7.6), blush: false, sweat: true, anger: false }
    case 'dizzy':
      return {
        left: capsule(L.x - 1, L.y + 2, 12, 24, style),
        right: capsule(R.x + 2, R.y - 2, 10, 18, style),
        mouth: `M 45 73 Q 50 68 56 74 Q 50 71 45 73 Z`,
        blush: false,
        sweat: true,
        anger: false,
      }
    case 'curious':
    default:
      return {
        left: capsule(L.x, L.y, 14, 28, style),
        right: capsule(R.x, R.y + 1, 13, 25, style),
        mouth: smile(18, 8),
        blush: false,
        sweat: false,
        anger: false,
      }
  }
}

function n(value: number): string {
  return value.toFixed(1)
}
