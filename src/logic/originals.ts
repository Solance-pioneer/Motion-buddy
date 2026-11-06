import sneezePose from '../assets/originals-v1/poses/original_sneeze.json'
import peekPose from '../assets/originals-v1/poses/original_peekaboo.json'
import poutPose from '../assets/originals-v1/poses/original_pout_melt.json'
import { eye, face, mouth, type FaceFeatures } from '../view/features.ts'
import type { PlayFrame } from './catalog.ts'

interface PoseSample {
  t: number
  eye_mode: string
  eye_w: number
  eye_h: number
  eye_dx: number
  eye_dy: number
  l_scale: number
  r_scale: number
  mouth: string
  mouth_w: number
  mouth_h: number
  mouth_dy: number
  group_dx: number
  group_dy: number
}

interface PoseFile {
  id: string
  samples_24fps: PoseSample[]
}

const POSES: Record<string, PoseFile> = {
  original_sneeze: sneezePose as PoseFile,
  original_peekaboo: peekPose as PoseFile,
  original_pout_melt: poutPose as PoseFile,
}

export const ORIGINAL_SHOWS: { id: string; at: number; ms: number; cue: string; cueAt: number }[] = [
  { id: 'original_sneeze', at: 46_000, ms: 4_000, cue: 'sneeze_zip', cueAt: 1_100 },
  { id: 'original_peekaboo', at: 51_000, ms: 4_000, cue: 'peek_pop', cueAt: 1_200 },
  { id: 'original_pout_melt', at: 56_000, ms: 4_000, cue: 'pout_boop', cueAt: 800 },
]

const REDUCED: Record<string, (sample: PoseSample) => boolean> = {
  original_sneeze: (sample) => sample.eye_mode === 'closed_arc' && sample.mouth === 'o',
  original_peekaboo: (sample) => sample.eye_mode === 'open' && sample.mouth === 'smile' && sample.l_scale > 0.9 && sample.r_scale > 0.9,
  original_pout_melt: (sample) => sample.eye_mode === 'happy_arc' && sample.mouth === 'smile',
}

function mixSample(a: PoseSample, b: PoseSample, frac: number): PoseSample {
  const snap = frac >= 0.45 ? b : a
  const lerp = (left: number, right: number) => left + (right - left) * frac
  return {
    ...snap,
    eye_w: lerp(a.eye_w, b.eye_w),
    eye_h: lerp(a.eye_h, b.eye_h),
    eye_dx: lerp(a.eye_dx, b.eye_dx),
    eye_dy: lerp(a.eye_dy, b.eye_dy),
    l_scale: lerp(a.l_scale, b.l_scale),
    r_scale: lerp(a.r_scale, b.r_scale),
    mouth_w: lerp(a.mouth_w, b.mouth_w),
    mouth_h: lerp(a.mouth_h, b.mouth_h),
    mouth_dy: lerp(a.mouth_dy, b.mouth_dy),
    group_dx: lerp(a.group_dx, b.group_dx),
    group_dy: lerp(a.group_dy, b.group_dy),
  }
}

function sampleAt(pose: PoseFile, elapsedMs: number): PoseSample {
  const frames = pose.samples_24fps
  const index = Math.max(0, Math.min(frames.length - 1, (elapsedMs / 1000) * 24))
  const left = Math.min(frames.length - 1, Math.floor(index))
  const right = Math.min(frames.length - 1, left + 1)
  return mixSample(frames[left], frames[right], index - left)
}

function peakFor(mode: string): number {
  if (mode === 'closed_arc' || mode === 'happy_arc') return 8
  return 0
}

export function featuresFromPose(sample: PoseSample): FaceFeatures {
  const dx = sample.group_dx + sample.eye_dx
  const dy = sample.group_dy + sample.eye_dy
  const left = eye(34 + dx, 44 + dy, Math.max(2.2, sample.eye_w * sample.l_scale), Math.max(1.6, sample.eye_h * sample.l_scale), peakFor(sample.eye_mode), 0)
  const right = eye(66 + dx, 44 + dy, Math.max(2.2, sample.eye_w * sample.r_scale), Math.max(1.6, sample.eye_h * sample.r_scale), peakFor(sample.eye_mode), 0)
  const curve = sample.mouth === 'smile' ? 6 : sample.mouth === 'frown' ? -6 : 0
  const open = sample.mouth === 'o' ? 1 : 0
  const lips = mouth(65 + sample.mouth_dy + sample.group_dy, sample.mouth_w, curve, open, sample.mouth === 'o' ? sample.mouth_h : 2, 0)
  return face(left, right, lips, 0, 0, 0)
}

export function sampleOriginal(id: string, elapsedMs: number, reduced = false): PlayFrame | null {
  const pose = POSES[id]
  if (!pose) return null
  const frames = pose.samples_24fps
  const sample = reduced ? frames.find(REDUCED[id]) ?? frames[0] : sampleAt(pose, elapsedMs)
  return { features: featuresFromPose(sample), gazeX: 0, gazeY: 0, blink: 0 }
}

export interface CueArm {
  id: string
  fired: boolean
}

/** Play the paired beep once at its cue time. Mute or a new face cancels it. */
export function stepOriginalCue(
  arm: CueArm | null,
  id: string | null,
  elapsedMs: number,
  allow: boolean,
): { arm: CueArm | null; play: string | null } {
  const spec = ORIGINAL_SHOWS.find((item) => item.id === id)
  if (!spec) return { arm: null, play: null }
  const current = arm?.id === spec.id ? arm : { id: spec.id, fired: false }
  if (current.fired || elapsedMs < spec.cueAt) return { arm: current, play: null }
  return { arm: { id: spec.id, fired: true }, play: allow ? spec.cue : null }
}
