import type { CompanionState } from '../logic/engine.ts'
import {
  browPath,
  EYE_LEFT_X,
  EYE_RIGHT_X,
  EYE_Y,
  FACE_CENTER_X,
  facePose,
  MOUTH_Y,
} from '../logic/face.ts'
import { smoothstep } from '../logic/math.ts'
import { MAX_VISUAL_LEAN_DEG } from '../logic/motion.ts'

export interface PoseHandles {
  rig: HTMLDivElement
  shadow: HTMLDivElement
  browL: SVGPathElement
  browR: SVGPathElement
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
  lashL: SVGLineElement
  lashR: SVGLineElement
  mouthOpen: SVGEllipseElement
  mouthFrown: SVGPathElement
  cheekL: SVGEllipseElement
  cheekR: SVGEllipseElement
}

export function applyPose(handles: PoseHandles, state: CompanionState): void {
  const face = facePose(state.blend)
  const leanDeg = state.lean * MAX_VISUAL_LEAN_DEG
  const ty = -state.bounce - state.pitch * 4
  handles.rig.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) rotate(${leanDeg.toFixed(2)}deg) scale(${state.breath.toFixed(4)})`

  const lift = state.bounce / 8
  handles.shadow.style.transform = `scaleX(${(1 - lift * 0.18).toFixed(3)})`
  handles.shadow.style.opacity = (0.95 - lift * 0.35).toFixed(3)

  handles.browL.setAttribute('d', browPath(face.browLeft))
  handles.browR.setAttribute('d', browPath(face.browRight))

  placeEye(handles, 'L', EYE_LEFT_X - face.eyeSpread, face, state)
  placeEye(handles, 'R', EYE_RIGHT_X + face.eyeSpread, face, state)

  handles.mouthOpen.setAttribute('cx', String(FACE_CENTER_X))
  handles.mouthOpen.setAttribute('cy', String(MOUTH_Y))
  handles.mouthOpen.setAttribute('rx', face.mouthOpenRx.toFixed(2))
  handles.mouthOpen.setAttribute('ry', face.mouthOpenRy.toFixed(2))
  handles.mouthOpen.style.opacity = face.mouthOpenOpacity.toFixed(3)
  handles.mouthFrown.setAttribute('d', face.mouthFrown)
  handles.mouthFrown.style.opacity = face.mouthFrownOpacity.toFixed(3)
  handles.cheekL.style.opacity = face.cheek.toFixed(3)
  handles.cheekR.style.opacity = face.cheek.toFixed(3)
}

function placeEye(
  handles: PoseHandles,
  side: 'L' | 'R',
  x: number,
  face: ReturnType<typeof facePose>,
  state: CompanionState,
): void {
  const eye = side === 'L' ? handles.eyeL : handles.eyeR
  const sclera = side === 'L' ? handles.scleraL : handles.scleraR
  const iris = side === 'L' ? handles.irisL : handles.irisR
  const pupil = side === 'L' ? handles.pupilL : handles.pupilR
  const spark = side === 'L' ? handles.sparkL : handles.sparkR
  const look = side === 'L' ? handles.lookL : handles.lookR
  const lash = side === 'L' ? handles.lashL : handles.lashR

  const sy = (1 - 0.9 * state.blink).toFixed(4)
  eye.setAttribute('transform', `translate(${x} ${EYE_Y}) scale(1 ${sy}) translate(${-x} ${-EYE_Y})`)

  setEllipse(sclera, x, EYE_Y, face.eyeRx, face.eyeRy)
  setEllipse(iris, x, EYE_Y + 1, face.eyeRx * 0.46, face.eyeRy * 0.5)
  iris.setAttribute('fill', face.iris)
  pupil.setAttribute('cx', String(x))
  pupil.setAttribute('cy', String(EYE_Y + 1))
  pupil.setAttribute('r', face.pupilR.toFixed(2))

  const sparkR = Math.max(1.8, face.pupilR * 0.34)
  spark.setAttribute('cx', String(x - face.pupilR * 0.35))
  spark.setAttribute('cy', String(EYE_Y - face.pupilR * 0.42))
  spark.setAttribute('r', sparkR.toFixed(2))

  const roomX = Math.max(1.5, face.eyeRx - face.pupilR - 4.5)
  const roomY = Math.max(1, face.eyeRy * 0.34)
  look.setAttribute(
    'transform',
    `translate(${(state.lookX * roomX).toFixed(2)} ${(state.lookY * roomY).toFixed(2)})`,
  )

  const lashHalf = face.eyeRx * 0.7
  lash.setAttribute('x1', String(x - lashHalf))
  lash.setAttribute('x2', String(x + lashHalf))
  lash.setAttribute('y1', String(EYE_Y))
  lash.setAttribute('y2', String(EYE_Y + 0.5))
  lash.style.opacity = smoothstep((state.blink - 0.45) / 0.5).toFixed(3)
}

function setEllipse(node: SVGEllipseElement, cx: number, cy: number, rx: number, ry: number): void {
  node.setAttribute('cx', cx.toFixed(2))
  node.setAttribute('cy', cy.toFixed(2))
  node.setAttribute('rx', rx.toFixed(2))
  node.setAttribute('ry', ry.toFixed(2))
}
