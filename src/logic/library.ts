export const POSE_IDS = [
  'curious',
  'happy',
  'laugh',
  'shy',
  'smug',
  'grumpy',
  'determined',
  'worried',
  'startled',
  'sleepy',
  'pant',
  'dizzy',
] as const

export type PoseId = (typeof POSE_IDS)[number]
export type Profile = 'desk' | 'car' | 'wrist'

export const IDLE_POSES: PoseId[] = ['curious', 'happy', 'laugh', 'shy', 'smug', 'grumpy', 'determined', 'sleepy', 'pant']

const PROFILE_POOL: Record<Profile, PoseId[]> = {
  desk: ['curious', 'shy', 'happy', 'sleepy', 'laugh'],
  car: ['determined', 'smug', 'curious', 'startled'],
  wrist: ['pant', 'happy', 'curious', 'laugh'],
}

export interface IdleFrame {
  pose: PoseId
  gazeX: number
  gazeY: number
  blink: number
  speed: boolean
}

interface Beat {
  until: number
  pose: PoseId
  gazeX: number
  gazeY: number
  blink?: boolean
  speed?: boolean
}

const DESK: Beat[] = [
  { until: 2200, pose: 'curious', gazeX: -0.9, gazeY: 0.05 },
  { until: 2360, pose: 'curious', gazeX: -0.9, gazeY: 0.05, blink: true },
  { until: 5000, pose: 'shy', gazeX: 0.88, gazeY: 0.2 },
  { until: 7600, pose: 'happy', gazeX: 0, gazeY: -0.15 },
  { until: 10200, pose: 'curious', gazeX: 0.15, gazeY: 0.72 },
  { until: 12800, pose: 'sleepy', gazeX: 0, gazeY: 0.12 },
  { until: 16000, pose: 'laugh', gazeX: -0.35, gazeY: 0 },
]

const CAR: Beat[] = [
  { until: 2800, pose: 'determined', gazeX: 0.25, gazeY: 0, speed: true },
  { until: 2960, pose: 'determined', gazeX: 0.25, gazeY: 0, blink: true, speed: true },
  { until: 6200, pose: 'smug', gazeX: 0.7, gazeY: -0.1, speed: true },
  { until: 9400, pose: 'curious', gazeX: -0.75, gazeY: 0.05 },
  { until: 12000, pose: 'determined', gazeX: 0.1, gazeY: 0.1, speed: true },
  { until: 15000, pose: 'smug', gazeX: -0.2, gazeY: -0.05 },
]

const WRIST: Beat[] = [
  { until: 2600, pose: 'pant', gazeX: 0.35, gazeY: 0.05 },
  { until: 2740, pose: 'pant', gazeX: 0.35, gazeY: 0.05, blink: true },
  { until: 5600, pose: 'happy', gazeX: -0.55, gazeY: -0.12 },
  { until: 8200, pose: 'curious', gazeX: 0.8, gazeY: 0.15 },
  { until: 11000, pose: 'pant', gazeX: 0, gazeY: 0.2 },
  { until: 14000, pose: 'laugh', gazeX: -0.25, gazeY: -0.05 },
]

const LOOPS: Record<Profile, Beat[]> = { desk: DESK, car: CAR, wrist: WRIST }

export function profilePool(profile: Profile): PoseId[] {
  return PROFILE_POOL[profile]
}

export function fallbackPose(allowed: ReadonlySet<PoseId>, profile: Profile): PoseId {
  const pool = profilePool(profile).filter((pose) => allowed.has(pose))
  if (pool[0]) return pool[0]
  const any = POSE_IDS.find((pose) => allowed.has(pose))
  return any ?? 'curious'
}

export function resolvePose(pose: PoseId, allowed: ReadonlySet<PoseId>, profile: Profile): PoseId {
  return allowed.has(pose) ? pose : fallbackPose(allowed, profile)
}

export function sampleIdle(
  elapsedMs: number,
  profile: Profile,
  allowed: ReadonlySet<PoseId>,
  reduced = false,
): IdleFrame {
  const beats = LOOPS[profile]
  const loop = beats[beats.length - 1]?.until ?? 1
  const time = ((elapsedMs % loop) + loop) % loop
  const beat = beats.find((item) => time < item.until) ?? beats[0]
  const pose = resolvePose(beat.pose, allowed, profile)
  const blink = !reduced && beat.blink ? 1 : 0
  return {
    pose,
    gazeX: reduced ? 0 : beat.gazeX,
    gazeY: reduced ? 0 : beat.gazeY,
    blink,
    speed: profile === 'car' && !reduced && Boolean(beat.speed) && allowed.has('determined') && pose === 'determined',
  }
}

export function gazeCount(frames: IdleFrame[]): number {
  const seen = new Set(frames.map((frame) => `${Math.round(frame.gazeX * 10)}:${Math.round(frame.gazeY * 10)}`))
  return seen.size
}
