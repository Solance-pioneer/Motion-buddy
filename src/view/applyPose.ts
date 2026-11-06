import type { PoseId } from '../logic/library.ts'
import { silhouette } from './silhouettes.ts'

export type FaceStyle = 'soft' | 'tile'

export interface FaceHandles {
  glance: SVGGElement
  eyeL: SVGGElement
  eyeR: SVGGElement
  eyePathL: SVGPathElement
  eyePathR: SVGPathElement
  mouth: SVGPathElement
  blushL: SVGEllipseElement
  blushR: SVGEllipseElement
  sweat: SVGPathElement
  anger: SVGPathElement
  speed: SVGGElement
}

export function applyPose(
  handles: FaceHandles,
  pose: PoseId,
  blink: number,
  face: string,
  style: FaceStyle,
  gazeX: number,
  gazeY: number,
  speed: boolean,
): void {
  const art = silhouette(pose, style)
  const squash = Math.max(0.08, 1 - blink * 0.92)
  handles.eyePathL.setAttribute('d', art.left)
  handles.eyePathR.setAttribute('d', art.right)
  handles.mouth.setAttribute('d', art.mouth)
  for (const node of [handles.eyePathL, handles.eyePathR, handles.mouth, handles.sweat, handles.anger]) {
    if (node.tagName === 'path' && node.getAttribute('fill') === 'none') node.setAttribute('stroke', face)
    else node.setAttribute('fill', face)
  }
  handles.anger.setAttribute('stroke', face)
  handles.speed.querySelector('path')?.setAttribute('stroke', face)
  handles.eyeL.setAttribute('transform', `translate(33 40) scale(1 ${squash.toFixed(3)}) translate(-33 -40)`)
  const dizzy = pose === 'dizzy' ? 18 : 0
  handles.eyeR.setAttribute('transform', `translate(67 40) rotate(${dizzy}) scale(1 ${squash.toFixed(3)}) translate(-67 -40)`)
  handles.glance.setAttribute(
    'transform',
    `translate(${(gazeX * 10).toFixed(2)} ${(gazeY * 7).toFixed(2)}) rotate(${(gazeX * 4).toFixed(2)} 50 48)`,
  )
  handles.blushL.setAttribute('opacity', art.blush ? '0.9' : '0')
  handles.blushR.setAttribute('opacity', art.blush ? '0.9' : '0')
  handles.sweat.setAttribute('opacity', art.sweat ? '0.95' : '0')
  handles.anger.setAttribute('opacity', art.anger ? '1' : '0')
  handles.speed.setAttribute('opacity', speed ? '1' : '0')
}
