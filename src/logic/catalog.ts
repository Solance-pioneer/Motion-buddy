import { face, featuresFor, eye, mouth, type FaceFeatures } from '../view/features.ts'
import type { FaceStyle } from '../view/features.ts'

export type CandidateKind = 'expression' | 'action'

export interface Candidate {
  id: string
  name: string
  kind: CandidateKind
  /** Plays a labelled left-then-right simulated movement while auditioning. */
  motion: boolean
  blush: boolean
}

export interface PlayFrame {
  features: FaceFeatures
  gazeX: number
  gazeY: number
  blink: number
}

const L = (w: number, h: number, peak = 0, cy = 40) => eye(32, cy, w, h, peak, 0)
const R = (w: number, h: number, peak = 0, cy = 40) => eye(68, cy, w, h, peak, 0)

function ex(
  id: string,
  name: string,
  features: FaceFeatures,
  motion = false,
): { meta: Candidate; features: FaceFeatures } {
  return { meta: { id, name, kind: 'expression', motion, blush: features.blush > 0.2 }, features }
}

const EXPRESSIONS = [
  ex('curious', 'Curious', featuresFor('curious', 'soft')),
  ex('beam', 'Beam', face(L(20, 8, 12, 42), R(20, 8, 12, 42), mouth(66, 22, 11, 0, 0, 0), 0, 0, 0)),
  ex('soft', 'Soft smile', face(L(18, 24, 0, 40), R(18, 24, 0, 40), mouth(68, 16, 7, 0, 0, 0), 0, 0, 0)),
  ex('giggle', 'Giggle', face(L(18, 7, 11, 42), R(18, 7, 11, 42), mouth(67, 18, 8, 0.2, 2, 0), 0, 0, 0)),
  ex('shy', 'Shy', featuresFor('shy', 'soft')),
  ex('sleepy', 'Sleepy', featuresFor('sleepy', 'soft')),
  ex('yawn', 'Yawn', featuresFor('yawn', 'soft')),
  ex('content', 'Content', featuresFor('content', 'soft')),
  ex('wink', 'Wink', featuresFor('wink', 'soft')),
  ex('smug', 'Smug', featuresFor('smug', 'soft')),
  ex('grumpy', 'Grumpy', featuresFor('grumpy', 'soft')),
  ex('determined', 'Determined', featuresFor('determined', 'soft')),
  ex('worried', 'Worried', featuresFor('worried', 'soft')),
  ex('startled', 'Startled', featuresFor('startled', 'soft')),
  ex('dizzy', 'Dizzy', featuresFor('dizzy', 'soft')),
  ex('pant', 'Pant', featuresFor('pant', 'soft')),
  ex('awe', 'Awe', face(L(22, 22, 0, 38), R(22, 22, 0, 38), mouth(72, 8, 0, 1, 6, 0), 0, 0, 0)),
  ex('relief', 'Relief', face(L(18, 8, 10, 43), R(18, 8, 10, 43), mouth(68, 14, 6, 0, 0, 0), 0, 0, 0)),
  ex('focus', 'Focus', face(L(18, 12, 0, 42), R(18, 12, 0, 42), mouth(70, 14, 0, 0, 0, 0), 0, 0, 0)),
  ex('think', 'Think', face(L(16, 22, 0, 36), R(16, 22, 0, 36), mouth(70, 8, 3, 0, 0, 0), 0, 0, 0)),
  ex('peek', 'Peek', face(L(16, 26, 0, 38), R(14, 18, 0, 42), mouth(69, 12, 6, 0, 0, 0), 0, 0, 0)),
  ex('doze', 'Doze', face(L(20, 6, 2, 46), R(20, 6, 2, 46), mouth(72, 12, 3, 0, 0, 0), 0, 0, 0)),
  ex('cheer', 'Cheer', face(L(20, 8, 13, 41), R(20, 8, 13, 41), mouth(66, 24, 12, 0, 0, 0), 0, 0, 0)),
  ex('nervous', 'Nervous', face(L(16, 30, 0, 38), R(16, 30, 0, 38), mouth(72, 8, 2, 1, 4, 0), 0, 1, 0)),
  ex('proud', 'Proud', face(L(18, 14, 3, 41), R(16, 11, 2, 42), mouth(69, 14, 5, 0, 0, 2), 0, 0, 0)),
  ex('calm', 'Calm', face(L(18, 16, 1, 42), R(18, 16, 1, 42), mouth(69, 15, 5, 0, 0, 0), 0, 0, 0)),
  ex('wonder', 'Wonder', face(L(20, 20, 0, 37), R(20, 20, 0, 37), mouth(71, 10, 1, 1, 5, 0), 0, 0, 0)),
  ex('snooze', 'Snooze', face(L(20, 4, 1, 47), R(20, 4, 1, 47), mouth(73, 10, 2, 0, 0, 0), 0, 0, 0)),
  ex('greet', 'Greet', face(L(21, 26, 0, 38), R(21, 26, 0, 38), mouth(66, 20, 10, 0, 0, 0), 0, 0, 0)),
  ex('glance', 'Side glance', face(eye(28, 40, 18, 24, 0, 0), eye(64, 40, 18, 24, 0, 0), mouth(64, 14, 6, 0, 0, -4), 0, 0, 0)),
  ex('laugh', 'Laugh', featuresFor('laugh', 'soft')),
  ex('tender', 'Tender', face(L(15, 18, 0, 42), R(15, 18, 0, 42), mouth(70, 12, 5, 0, 0, 0), 0, 0, 0)),
]

function act(id: string, name: string, motion = false): Candidate {
  return { id, name, kind: 'action', motion, blush: false }
}

const ACTIONS: Candidate[] = [
  act('blink', 'Blink'),
  act('double-blink', 'Double blink'),
  act('look-left', 'Look left', true),
  act('look-right', 'Look right', true),
  act('look-up', 'Look up'),
  act('scan', 'Scan', true),
  act('sway', 'Sway', true),
  act('take-left', 'Double-take left', true),
  act('take-right', 'Double-take right', true),
  act('yawn-stretch', 'Yawn stretch'),
  act('settle', 'Settle'),
  act('nod', 'Nod'),
  act('shock-left', 'Shock left', true),
  act('shock-right', 'Shock right', true),
  act('pant-recover', 'Pant then grin'),
  act('wink-play', 'Playful wink'),
]

const EXPRESSION_FEATURES = new Map(EXPRESSIONS.map((item) => [item.meta.id, item.features]))

export const CANDIDATES: Candidate[] = [...EXPRESSIONS.map((item) => item.meta), ...ACTIONS]

export const EXPRESSION_IDS = EXPRESSIONS.map((item) => item.meta.id)
export const ACTION_IDS = ACTIONS.map((item) => item.id)

export const NEUTRAL_ID = 'neutral'

export function neutralFeatures(): FaceFeatures {
  return face(L(16, 22, 0, 40), R(16, 22, 0, 40), mouth(68, 14, 6, 0, 0, 0), 0, 0, 0)
}

export function candidateById(id: string): Candidate | undefined {
  return CANDIDATES.find((item) => item.id === id)
}

export function isExpression(id: string): boolean {
  return EXPRESSION_FEATURES.has(id)
}

export function featuresOf(id: string, style: FaceStyle = 'soft'): FaceFeatures {
  if (id === NEUTRAL_ID) return neutralFeatures()
  const owned = EXPRESSION_FEATURES.get(id)
  if (owned) {
    const copy = structuredClone(owned)
    copy.left.radius = style === 'soft' ? Math.min(copy.left.w, copy.left.h) / 2 : Math.min(2.6, copy.left.w / 2)
    copy.right.radius = style === 'soft' ? Math.min(copy.right.w, copy.right.h) / 2 : Math.min(2.6, copy.right.w / 2)
    return copy
  }
  try {
    return featuresFor(id as 'curious', style)
  } catch {
    return neutralFeatures()
  }
}

function hold(features: FaceFeatures, gazeX = 0, gazeY = 0, blink = 0): PlayFrame {
  return { features, gazeX, gazeY, blink }
}

function lerpFrame(a: PlayFrame, b: PlayFrame, t: number): PlayFrame {
  const mix = (x: number, y: number) => x + (y - x) * t
  const eyeMix = (left: FaceFeatures['left'], right: FaceFeatures['left']) => ({
    cx: mix(left.cx, right.cx),
    cy: mix(left.cy, right.cy),
    w: mix(left.w, right.w),
    h: mix(left.h, right.h),
    peak: mix(left.peak, right.peak),
    rot: 0,
    radius: mix(left.radius, right.radius),
  })
  return {
    features: {
      left: eyeMix(a.features.left, b.features.left),
      right: eyeMix(a.features.right, b.features.right),
      mouth: {
        y: mix(a.features.mouth.y, b.features.mouth.y),
        width: mix(a.features.mouth.width, b.features.mouth.width),
        curve: mix(a.features.mouth.curve, b.features.mouth.curve),
        open: mix(a.features.mouth.open, b.features.mouth.open),
        gape: mix(a.features.mouth.gape, b.features.mouth.gape),
        shift: mix(a.features.mouth.shift, b.features.mouth.shift),
      },
      blush: mix(a.features.blush, b.features.blush),
      sweat: mix(a.features.sweat, b.features.sweat),
      anger: mix(a.features.anger, b.features.anger),
      speed: mix(a.features.speed, b.features.speed),
    },
    gazeX: mix(a.gazeX, b.gazeX),
    gazeY: mix(a.gazeY, b.gazeY),
    blink: mix(a.blink, b.blink),
  }
}

function between(elapsed: number, spans: Array<{ until: number; frame: PlayFrame }>): PlayFrame {
  let prev = 0
  let last = spans[0]?.frame ?? hold(neutralFeatures())
  for (const span of spans) {
    if (elapsed < span.until) {
      const t = span.until === prev ? 1 : Math.min(1, (elapsed - prev) / (span.until - prev))
      return lerpFrame(last, span.frame, t)
    }
    prev = span.until
    last = span.frame
  }
  return last
}

export function sampleCandidate(id: string, elapsed: number, reduced = false, style: FaceStyle = 'soft'): PlayFrame {
  const base = featuresOf(id, style)
  if (reduced && candidateById(id)?.kind === 'action') {
    return hold(isExpression(id) ? base : featuresOf('curious', style))
  }
  const time = Math.max(0, elapsed)
  const curious = featuresOf('curious', style)
  const startled = featuresOf('startled', style)
  const happy = featuresOf('beam', style)
  const yawn = featuresOf('yawn', style)
  const sleepy = featuresOf('sleepy', style)
  const pant = featuresOf('pant', style)
  const wink = featuresOf('wink', style)
  if (isExpression(id)) {
    const gaze = id === 'think' ? { x: 0, y: -0.55 } : id === 'glance' ? { x: -0.7, y: 0.1 } : { x: 0, y: 0 }
    return hold(base, gaze.x, gaze.y, 0)
  }
  switch (id) {
    case 'blink':
      return between(time % 900, [
        { until: 200, frame: hold(curious, 0, 0, 0) },
        { until: 420, frame: hold(curious, 0, 0, 1) },
        { until: 900, frame: hold(curious, 0, 0, 0) },
      ])
    case 'double-blink':
      return between(time % 1400, [
        { until: 180, frame: hold(curious, 0, 0, 0) },
        { until: 360, frame: hold(curious, 0, 0, 1) },
        { until: 560, frame: hold(curious, 0, 0, 0) },
        { until: 760, frame: hold(curious, 0, 0, 1) },
        { until: 1400, frame: hold(curious, 0, 0, 0) },
      ])
    case 'look-left':
      return between(time % 2200, [
        { until: 400, frame: hold(curious, 0, 0, 0) },
        { until: 1600, frame: hold(curious, -1, 0.05, 0) },
        { until: 2200, frame: hold(curious, 0, 0, 0) },
      ])
    case 'look-right':
      return between(time % 2200, [
        { until: 400, frame: hold(curious, 0, 0, 0) },
        { until: 1600, frame: hold(curious, 1, 0.05, 0) },
        { until: 2200, frame: hold(curious, 0, 0, 0) },
      ])
    case 'look-up':
      return between(time % 2000, [
        { until: 300, frame: hold(curious, 0, 0, 0) },
        { until: 1500, frame: hold(featuresOf('think', style), 0, -0.8, 0) },
        { until: 2000, frame: hold(curious, 0, 0, 0) },
      ])
    case 'scan':
      return between(time % 3200, [
        { until: 700, frame: hold(curious, -0.9, 0, 0) },
        { until: 1100, frame: hold(curious, -0.9, 0, 1) },
        { until: 2000, frame: hold(curious, 0.9, 0, 0) },
        { until: 3200, frame: hold(curious, 0, 0, 0) },
      ])
    case 'sway':
      return between(time % 2800, [
        { until: 900, frame: hold(curious, -0.65, 0, 0) },
        { until: 1800, frame: hold(curious, 0.65, 0, 0) },
        { until: 2800, frame: hold(curious, 0, 0, 0) },
      ])
    case 'take-left':
      return between(time % 2400, [
        { until: 500, frame: hold(curious, -0.35, 0, 0) },
        { until: 1200, frame: hold(startled, -1, -0.05, 0) },
        { until: 2400, frame: hold(curious, -0.2, 0, 0) },
      ])
    case 'take-right':
      return between(time % 2400, [
        { until: 500, frame: hold(curious, 0.35, 0, 0) },
        { until: 1200, frame: hold(startled, 1, -0.05, 0) },
        { until: 2400, frame: hold(curious, 0.2, 0, 0) },
      ])
    case 'yawn-stretch':
      return between(time % 3200, [
        { until: 700, frame: hold(sleepy, 0, 0.1, 0) },
        { until: 1900, frame: hold(yawn, 0, 0.05, 0) },
        { until: 3200, frame: hold(curious, 0, 0, 0) },
      ])
    case 'settle':
      return between(time % 2400, [
        { until: 700, frame: hold(startled, 0.2, 0, 0) },
        { until: 2400, frame: hold(featuresOf('calm', style), 0, 0, 0) },
      ])
    case 'nod':
      return between(time % 1800, [
        { until: 500, frame: hold(curious, 0, 0.45, 0) },
        { until: 1000, frame: hold(curious, 0, -0.35, 0) },
        { until: 1800, frame: hold(curious, 0, 0, 0) },
      ])
    case 'shock-left':
      return between(time % 2200, [
        { until: 300, frame: hold(curious, 0, 0, 0) },
        { until: 1200, frame: hold(startled, -1, 0, 0) },
        { until: 2200, frame: hold(curious, -0.3, 0, 0) },
      ])
    case 'shock-right':
      return between(time % 2200, [
        { until: 300, frame: hold(curious, 0, 0, 0) },
        { until: 1200, frame: hold(startled, 1, 0, 0) },
        { until: 2200, frame: hold(curious, 0.3, 0, 0) },
      ])
    case 'pant-recover':
      return between(time % 3200, [
        { until: 1400, frame: hold(pant, 0.2, 0.05, 0) },
        { until: 3200, frame: hold(happy, -0.1, -0.05, 0) },
      ])
    case 'wink-play':
      return between(time % 2000, [
        { until: 400, frame: hold(curious, 0.2, 0, 0) },
        { until: 1200, frame: hold(wink, 0.25, 0, 0) },
        { until: 2000, frame: hold(happy, 0, 0, 0) },
      ])
    default:
      return hold(base)
  }
}

export class FrameBlend {
  private shown = neutralFeatures()
  private from = this.shown
  private to = this.shown
  private key = ''
  private elapsed = 0
  private duration = 0

  sample(key: string, target: FaceFeatures, reduced: boolean, dtMs: number): FaceFeatures {
    if (key !== this.key) {
      this.from = this.shown
      this.to = target
      this.key = key
      this.elapsed = 0
      this.duration = reduced ? 0 : 360
    } else {
      this.to = target
    }
    const dt = Math.max(0, Math.min(dtMs, 80))
    this.elapsed += dt
    const t = this.duration <= 0 ? 1 : Math.min(1, this.elapsed / this.duration)
    const eased = t * t * (3 - 2 * t)
    this.shown = lerpFrame(hold(this.from), hold(this.to), eased).features
    return this.shown
  }
}

/** Audition playback. Movement candidates add a labelled left, then right, shove. */
export function sampleAudition(id: string, elapsed: number, reduced = false, style: FaceStyle = 'soft'): PlayFrame {
  const own = sampleCandidate(id, elapsed, reduced, style)
  const meta = candidateById(id)
  if (!meta?.motion || reduced) return own
  const cycle = elapsed % 3600
  if (cycle < 1200) return { ...own, gazeX: -1, gazeY: own.gazeY * 0.2 }
  if (cycle < 2400) return { ...own, gazeX: 1, gazeY: own.gazeY * 0.2 }
  return { ...own, gazeX: 0 }
}
