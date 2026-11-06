import type { FacePose } from '../logic/expressions.ts'

export type FaceStyle = 'soft' | 'tile'

export interface FaceHandles {
  glance: SVGGElement
  eyeL: SVGGElement
  eyeR: SVGGElement
  softL: SVGRectElement
  softR: SVGRectElement
  tileL: SVGRectElement
  tileR: SVGRectElement
  mouthCurve: SVGPathElement
  mouthOpen: SVGEllipseElement
}

const LEFT = { cx: 34, cy: 43 }
const RIGHT = { cx: 66, cy: 43 }

export function applyPose(
  handles: FaceHandles,
  pose: FacePose,
  blink: number,
  face: string,
  style: FaceStyle,
): void {
  const openness = Math.max(0.08, pose.eyeOpen * (1 - blink * 0.92))
  placeEye(handles.eyeL, LEFT, pose.eyeWide, openness, -pose.eyeTilt + pose.asym, pose.skew, face)
  placeEye(handles.eyeR, RIGHT, pose.eyeWide, openness, pose.eyeTilt, -pose.skew, face)
  const lean = pose.lookX * 3.2
  handles.glance.setAttribute(
    'transform',
    `translate(${(pose.lookX * 1.6).toFixed(2)} ${(pose.lookY * 1.1).toFixed(2)}) rotate(${lean.toFixed(2)} 50 50)`,
  )
  showStyle(handles.softL, handles.tileL, style, face)
  showStyle(handles.softR, handles.tileR, style, face)

  const control = pose.mouthCurve * 2.6
  handles.mouthCurve.setAttribute('d', `M -3.2 0 Q 0 ${control.toFixed(2)} 3.2 0`)
  handles.mouthCurve.setAttribute('stroke', face)
  handles.mouthCurve.setAttribute('transform', `rotate(${(pose.asym * 0.45).toFixed(2)})`)
  handles.mouthCurve.style.opacity = Math.max(0, 1 - pose.mouthOpen * 1.35).toFixed(3)
  const open = Math.min(1, Math.max(0, pose.mouthOpen))
  handles.mouthOpen.setAttribute('rx', (1.15 + open * 0.7).toFixed(2))
  handles.mouthOpen.setAttribute('ry', (1.45 + open * 0.85).toFixed(2))
  handles.mouthOpen.setAttribute('fill', face)
  handles.mouthOpen.style.opacity = open.toFixed(3)
}

function placeEye(
  eye: SVGGElement,
  center: { cx: number; cy: number },
  wide: number,
  openness: number,
  tilt: number,
  skew: number,
  face: string,
): void {
  const { cx, cy } = center
  eye.setAttribute('fill', face)
  eye.setAttribute('stroke', 'none')
  eye.setAttribute(
    'transform',
    `translate(${cx} ${cy}) rotate(${tilt.toFixed(2)}) skewY(${skew.toFixed(2)}) scale(${wide.toFixed(3)} ${openness.toFixed(4)}) translate(${-cx} ${-cy})`,
  )
}

function showStyle(soft: SVGRectElement, tile: SVGRectElement, style: FaceStyle, face: string): void {
  soft.setAttribute('fill', face)
  tile.setAttribute('fill', face)
  soft.setAttribute('stroke', 'none')
  tile.setAttribute('stroke', 'none')
  soft.setAttribute('visibility', style === 'soft' ? 'visible' : 'hidden')
  tile.setAttribute('visibility', style === 'tile' ? 'visible' : 'hidden')
}
