import { ACTION_IDS, EXPRESSION_IDS, isExpression } from './catalog.ts'
import type { Profile } from './library.ts'

export interface PlayBeat {
  id: string
  until: number
  gazeX: number
  gazeY: number
  blink: boolean
}

const PREFERRED: Record<Profile, string[]> = {
  desk: ['curious', 'shy', 'beam', 'sleepy', 'yawn', 'wink', 'content', 'startled', 'grumpy', 'soft', 'giggle'],
  car: ['determined', 'smug', 'curious', 'startled', 'focus', 'proud'],
  wrist: ['pant', 'beam', 'curious', 'cheer', 'content', 'pant-recover'],
}

const GAZES = [
  { gazeX: -0.85, gazeY: 0.05 },
  { gazeX: 0.85, gazeY: 0.08 },
  { gazeX: 0, gazeY: -0.1 },
  { gazeX: -0.4, gazeY: 0.35 },
  { gazeX: 0.2, gazeY: 0 },
]

export function companionBeats(kept: readonly string[], profile: Profile): PlayBeat[] {
  const allowed = new Set(kept)
  const expressions = [
    ...PREFERRED[profile].filter((id) => allowed.has(id) && isExpression(id)),
    ...EXPRESSION_IDS.filter((id) => allowed.has(id) && !PREFERRED[profile].includes(id)),
  ]
  const actions = ACTION_IDS.filter((id) => allowed.has(id))
  if (expressions.length === 0) return []
  const beats: PlayBeat[] = []
  let cursor = 0
  let actionAt = 0
  expressions.forEach((id, index) => {
    const gaze = GAZES[index % GAZES.length] ?? GAZES[0]
    const hold = id === 'startled' ? 900 : id === 'wink' ? 1400 : 2200
    cursor += hold
    beats.push({ id, until: cursor, gazeX: gaze.gazeX, gazeY: gaze.gazeY, blink: index === 0 })
    if (actions.length > 0 && index % 3 === 2) {
      const action = actions[actionAt % actions.length] ?? actions[0]
      actionAt += 1
      cursor += 1700
      beats.push({ id: action, until: cursor, gazeX: 0, gazeY: 0, blink: false })
    }
  })
  return beats
}

export function sampleBeats(beats: readonly PlayBeat[], elapsed: number): PlayBeat | null {
  if (beats.length === 0) return null
  const loop = beats[beats.length - 1]?.until ?? 1
  const time = ((elapsed % loop) + loop) % loop
  return beats.find((beat) => time < beat.until) ?? beats[0] ?? null
}
