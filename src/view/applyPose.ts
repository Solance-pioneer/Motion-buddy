import type { FaceFeatures, FaceStyle } from './features.ts'
import { eyePath, mouthPath } from './features.ts'
import { glanceTransform } from './glance.ts'

export type { FaceStyle }

export interface FaceHandles {
  glance: SVGGElement
  eyeL: SVGGElement
  eyeR: SVGGElement
  eyePathL: SVGPathElement
  eyePathR: SVGPathElement
  browL: SVGPathElement
  browR: SVGPathElement
  mouth: SVGPathElement
  blushL: SVGEllipseElement
  blushR: SVGEllipseElement
  sweat: SVGPathElement
  anger: SVGPathElement
  speed: SVGGElement
}

export function applyPose(
  handles: FaceHandles,
  features: FaceFeatures,
  blink: number,
  face: string,
  gazeX: number,
  gazeY: number,
): void {
  const squash = Math.max(0.08, 1 - blink * 0.92)
  handles.eyePathL.setAttribute('d', eyePath(features.left))
  handles.eyePathR.setAttribute('d', eyePath(features.right))
  handles.mouth.setAttribute('d', mouthPath(features.mouth))
  strokeEye(handles.eyePathL, features.left.spiral, face)
  strokeEye(handles.eyePathR, features.right.spiral, face)
  handles.mouth.setAttribute('fill', face)
  handles.anger.setAttribute('stroke', face)
  handles.speed.querySelector('path')?.setAttribute('stroke', face)
  handles.eyeL.setAttribute('transform', eyeTransform(features.left, squash))
  handles.eyeR.setAttribute('transform', eyeTransform(features.right, squash))
  handles.glance.setAttribute('transform', glanceTransform(gazeX, gazeY))
  const brow = features.brow ?? 0
  handles.browL?.setAttribute('opacity', brow.toFixed(3))
  handles.browR?.setAttribute('opacity', brow.toFixed(3))
  handles.blushL.setAttribute('opacity', features.blush.toFixed(3))
  handles.blushR.setAttribute('opacity', features.blush.toFixed(3))
  handles.sweat.setAttribute('fill', face)
  handles.sweat.setAttribute('opacity', features.sweat.toFixed(3))
  handles.anger.setAttribute('opacity', features.anger.toFixed(3))
  handles.speed.setAttribute('opacity', features.speed.toFixed(3))
}

function strokeEye(path: SVGPathElement, spiral: number | undefined, face: string): void {
  if (spiral && spiral > 0) {
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', face)
    path.setAttribute('stroke-width', '2.4')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    return
  }
  path.setAttribute('fill', face)
  path.setAttribute('stroke', 'none')
}

function eyeTransform(eye: FaceFeatures['left'], squash: number): string {
  return `translate(${eye.cx.toFixed(2)} ${eye.cy.toFixed(2)}) rotate(${eye.rot.toFixed(2)}) scale(1 ${squash.toFixed(3)}) translate(${(-eye.cx).toFixed(2)} ${(-eye.cy).toFixed(2)})`
}
