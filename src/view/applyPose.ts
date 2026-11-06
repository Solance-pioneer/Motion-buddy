import type { FacePose } from '../logic/expressions.ts'

export interface FaceHandles {
  eyeL: SVGGElement
  eyeR: SVGGElement
  scleraL: SVGEllipseElement
  scleraR: SVGEllipseElement
  irisL: SVGEllipseElement
  irisR: SVGEllipseElement
  pupilL: SVGCircleElement
  pupilR: SVGCircleElement
  sparkL: SVGCircleElement
  sparkR: SVGCircleElement
  lookL: SVGGElement
  lookR: SVGGElement
  mouthCurve: SVGPathElement
  mouthOpen: SVGEllipseElement
}

const LEFT = { cx: 88, cy: 98 }
const RIGHT = { cx: 192, cy: 98 }
const EYE_RX = 46
const EYE_RY = 58

export function applyPose(handles: FaceHandles, pose: FacePose, blink: number, iris: string): void {
  const openness = Math.max(0.07, pose.eyeOpen * (1 - pose.lid * 0.7) * (1 - blink * 0.9))
  placeEye(handles, 'L', LEFT, openness, -pose.eyeTilt, pose, iris)
  placeEye(handles, 'R', RIGHT, openness, pose.eyeTilt, pose, iris)

  const control = pose.mouthCurve * 30
  handles.mouthCurve.setAttribute('d', `M -60 0 Q 0 ${control.toFixed(1)} 60 0`)
  handles.mouthCurve.style.opacity = Math.max(0, 1 - pose.mouthOpen * 1.35).toFixed(3)
  handles.mouthOpen.setAttribute('rx', (10 + pose.mouthOpen * 6).toFixed(2))
  handles.mouthOpen.setAttribute('ry', (11 + pose.mouthOpen * 5).toFixed(2))
  handles.mouthOpen.style.opacity = pose.mouthOpen.toFixed(3)
}

function placeEye(
  handles: FaceHandles,
  side: 'L' | 'R',
  center: { cx: number; cy: number },
  openness: number,
  tilt: number,
  pose: FacePose,
  iris: string,
): void {
  const eye = side === 'L' ? handles.eyeL : handles.eyeR
  const sclera = side === 'L' ? handles.scleraL : handles.scleraR
  const irisNode = side === 'L' ? handles.irisL : handles.irisR
  const pupil = side === 'L' ? handles.pupilL : handles.pupilR
  const spark = side === 'L' ? handles.sparkL : handles.sparkR
  const look = side === 'L' ? handles.lookL : handles.lookR
  const { cx, cy } = center

  eye.setAttribute(
    'transform',
    `translate(${cx} ${cy}) rotate(${tilt.toFixed(2)}) scale(1 ${openness.toFixed(4)}) translate(${-cx} ${-cy})`,
  )
  sclera.setAttribute('cx', String(cx))
  sclera.setAttribute('cy', String(cy))
  sclera.setAttribute('rx', String(EYE_RX))
  sclera.setAttribute('ry', String(EYE_RY))

  const lookX = pose.lookX * 9
  const lookY = pose.lookY * 8
  look.setAttribute('transform', `translate(${lookX.toFixed(2)} ${lookY.toFixed(2)})`)

  const pupilScale = Math.max(0.55, pose.pupil)
  irisNode.setAttribute('cx', String(cx))
  irisNode.setAttribute('cy', String(cy + 2))
  irisNode.setAttribute('rx', (15 * pupilScale).toFixed(2))
  irisNode.setAttribute('ry', (18 * pupilScale).toFixed(2))
  irisNode.setAttribute('fill', iris)
  pupil.setAttribute('cx', String(cx))
  pupil.setAttribute('cy', String(cy + 2))
  pupil.setAttribute('r', (7.4 * pupilScale).toFixed(2))
  spark.setAttribute('cx', String(cx - 6))
  spark.setAttribute('cy', String(cy - 8))
  spark.setAttribute('r', '3.1')
}
