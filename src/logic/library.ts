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
  'wink',
  'content',
  'yawn',
] as const

export type PoseId = (typeof POSE_IDS)[number]
export type Profile = 'desk' | 'car' | 'wrist'

/** Laugh is the wide parted mouth. It stays out of Auto until Use Laugh is turned on. */
export const DEFAULT_AUTO: PoseId[] = POSE_IDS.filter((pose) => pose !== 'laugh')

export const IDLE_POSES: PoseId[] = ['curious', 'happy', 'laugh', 'shy', 'smug', 'grumpy', 'determined', 'sleepy', 'pant']

const PROFILE_POOL: Record<Profile, PoseId[]> = {
  desk: ['curious', 'happy', 'sleepy', 'wink', 'shy'],
  car: ['determined', 'smug', 'curious', 'startled'],
  wrist: ['pant', 'happy', 'curious', 'content'],
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
  { until: 1800, pose: 'curious', gazeX: -0.9, gazeY: 0.05 },
  { until: 1960, pose: 'curious', gazeX: -0.9, gazeY: 0.05, blink: true },
  { until: 3800, pose: 'curious', gazeX: 0.9, gazeY: 0.08 },
  { until: 5600, pose: 'shy', gazeX: -0.55, gazeY: 0.4 },
  { until: 7600, pose: 'happy', gazeX: 0.1, gazeY: -0.12 },
  { until: 9200, pose: 'curious', gazeX: 0, gazeY: 0 },
  { until: 10000, pose: 'startled', gazeX: 0.75, gazeY: -0.08 },
  { until: 11800, pose: 'grumpy', gazeX: 0, gazeY: 0.08 },
  { until: 13600, pose: 'sleepy', gazeX: 0, gazeY: 0.12 },
  { until: 15400, pose: 'yawn', gazeX: 0, gazeY: 0.05 },
  { until: 17000, pose: 'wink', gazeX: 0.3, gazeY: 0 },
  { until: 19000, pose: 'content', gazeX: 0, gazeY: -0.05 },
  { until: 21400, pose: 'curious', gazeX: -0.25, gazeY: 0 },
  { until: 23200, pose: 'laugh', gazeX: 0, gazeY: 0 },
]

const CAR: Beat[] = [
  { until: 2600, pose: 'determined', gazeX: 0.35, gazeY: 0, speed: true },
  { until: 2760, pose: 'determined', gazeX: 0.35, gazeY: 0, blink: true, speed: true },
  { until: 5200, pose: 'smug', gazeX: 0.7, gazeY: -0.08, speed: true },
  { until: 7400, pose: 'curious', gazeX: -0.75, gazeY: 0.05 },
  { until: 8400, pose: 'startled', gazeX: 0.85, gazeY: -0.1 },
  { until: 11200, pose: 'determined', gazeX: 0.15, gazeY: 0, speed: true },
  { until: 14000, pose: 'smug', gazeX: -0.2, gazeY: -0.05 },
]

const WRIST: Beat[] = [
  { until: 3200, pose: 'pant', gazeX: 0.4, gazeY: 0.05 },
  { until: 3360, pose: 'pant', gazeX: 0.4, gazeY: 0.05, blink: true },
  { until: 6200, pose: 'happy', gazeX: -0.4, gazeY: -0.1 },
  { until: 9000, pose: 'curious', gazeX: 0.75, gazeY: 0.1 },
  { until: 11600, pose: 'pant', gazeX: -0.2, gazeY: 0.15 },
  { until: 14000, pose: 'content', gazeX: 0, gazeY: -0.05 },
  { until: 16800, pose: 'curious', gazeX: 0.2, gazeY: 0 },
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
