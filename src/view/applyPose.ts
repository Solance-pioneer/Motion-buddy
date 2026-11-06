import type { FacePose } from '../logic/expressions.ts'

export interface FaceHandles {
  glance: SVGGElement
  eyeL: SVGRectElement
  eyeR: SVGRectElement
  mouthCurve: SVGPathElement
  mouthOpen: SVGEllipseElement
}

const LEFT = { cx: 86, cy: 78 }
const RIGHT = { cx: 234, cy: 78 }

export function applyPose(handles: FaceHandles, pose: FacePose, blink: number, face: string): void {
  const openness = Math.max(0.08, pose.eyeOpen * (1 - blink * 0.92))
  placeEye(handles.eyeL, LEFT, pose.eyeWide, openness, -pose.eyeTilt, face)
  placeEye(handles.eyeR, RIGHT, pose.eyeWide, openness, pose.eyeTilt, face)
  handles.glance.setAttribute(
    'transform',
    `translate(${(pose.lookX * 14).toFixed(2)} ${(pose.lookY * 10).toFixed(2)})`,
  )

  const control = pose.mouthCurve * 14
  handles.mouthCurve.setAttribute('d', `M -22 0 Q 0 ${control.toFixed(2)} 22 0`)
  handles.mouthCurve.setAttribute('stroke', face)
  handles.mouthCurve.style.opacity = Math.max(0, 1 - pose.mouthOpen * 1.4).toFixed(3)
  handles.mouthOpen.setAttribute('fill', face)
  handles.mouthOpen.style.opacity = pose.mouthOpen.toFixed(3)
}

function placeEye(
  eye: SVGRectElement,
  center: { cx: number; cy: number },
  wide: number,
  openness: number,
  tilt: number,
  face: string,
): void {
  const { cx, cy } = center
  eye.setAttribute('fill', face)
  eye.setAttribute('stroke', 'none')
  eye.setAttribute(
    'transform',
    `translate(${cx} ${cy}) rotate(${tilt.toFixed(2)}) scale(${wide.toFixed(3)} ${openness.toFixed(4)}) translate(${-cx} ${-cy})`,
  )
}
