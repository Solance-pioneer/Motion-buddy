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

  const control = pose.mouthCurve * 2.4
  handles.mouthCurve.setAttribute('d', `M -3 0 Q 0 ${control.toFixed(2)} 3 0`)
  handles.mouthCurve.setAttribute('stroke', face)
  handles.mouthCurve.style.opacity = Math.max(0, 1 - pose.mouthOpen * 1.35).toFixed(3)
  handles.mouthOpen.setAttribute('fill', face)
  handles.mouthOpen.style.opacity = Math.min(1, pose.mouthOpen).toFixed(3)
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
