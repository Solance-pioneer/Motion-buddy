export const SCENE_ORDER = ['ninja', 'cord_hero', 'racer', 'sheet_ghost'] as const

export type SceneKey = (typeof SCENE_ORDER)[number]

export const SCENE_MS: Record<SceneKey, number> = {
  ninja: 6_000,
  cord_hero: 7_000,
  racer: 7_000,
  sheet_ghost: 7_500,
}

export const SCENE_CUE: Record<SceneKey, { key: 'ninja_soft_swish' | 'hero_original_flourish' | 'racer_soft_wind' | 'ghost_cute_boo'; at: number }> = {
  ninja: { key: 'ninja_soft_swish', at: 650 },
  cord_hero: { key: 'hero_original_flourish', at: 2_800 },
  racer: { key: 'racer_soft_wind', at: 2_000 },
  sheet_ghost: { key: 'ghost_cute_boo', at: 2_200 },
}

/** Ordinary Buddy time between ambient scenes. A scene never follows another immediately. */
export const SCENE_GAP_MS = 70_000

export interface ScenePose {
  opacity: number
  face: number
  x: number
  y: number
  rotate: number
  sx: number
  sy: number
  cord: number
  wind: number
  hold: boolean
  done: boolean
}

const rest = (extra: Partial<ScenePose> = {}): ScenePose => ({
  opacity: 0,
  face: 1,
  x: 0,
  y: 0,
  rotate: 0,
  sx: 1,
  sy: 1,
  cord: 0,
  wind: 0,
  hold: false,
  done: false,
  ...extra,
})

const span = (value: number, from: number, to: number) => Math.max(0, Math.min(1, (value - from) / (to - from)))

export function sampleScene(key: SceneKey, ms: number, reduced = false): ScenePose {
  const limit = SCENE_MS[key]
  if (ms >= limit) return rest({ done: true })
  if (key === 'ninja') return ninja(ms, reduced)
  if (key === 'cord_hero') return hero(ms, reduced)
  if (key === 'racer') return racer(ms, reduced)
  return ghost(ms, reduced)
}

function ninja(ms: number, reduced: boolean): ScenePose {
  const pose = rest()
  if (ms < 550) pose.sy = reduced ? 1 : 1 - 0.04 * span(ms, 0, 550)
  else if (ms < 1_050) pose.face = 1 - span(ms, 550, 1_050)
  else if (ms < 1_600) {
    pose.opacity = span(ms, 1_050, 1_600)
    pose.face = 1
  } else if (ms < 3_700) {
    pose.opacity = 1
    const u = span(ms, 1_600, 3_700)
    pose.x = reduced ? 0 : -18 * Math.cos(Math.PI * u)
    pose.hold = pose.opacity > 0.9
  } else if (ms < 4_700) {
    pose.opacity = 1
    pose.sy = reduced ? 1 : 0.92
    pose.hold = true
  } else if (ms < 5_500) pose.opacity = 1 - span(ms, 4_700, 5_500)
  return pose
}

function hero(ms: number, reduced: boolean): ScenePose {
  const pose = rest()
  if (ms < 600) pose.face = 1 - 0.35 * span(ms, 0, 600)
  else if (ms < 1_800) {
    const u = span(ms, 600, 1_800)
    pose.opacity = u
    pose.rotate = reduced ? 0 : 180
    pose.y = reduced ? 0 : -150 * (1 - u)
    pose.cord = 1
  } else if (ms < 2_700) {
    const u = span(ms, 1_800, 2_700)
    pose.opacity = 1
    pose.rotate = reduced ? 0 : 180
    pose.y = reduced ? 0 : -36 * (1 - u) + 10 * Math.sin(Math.PI * u)
    pose.cord = 1
    pose.hold = u > 0.72
  } else if (ms < 4_400) {
    pose.opacity = 1
    pose.rotate = reduced ? 0 : 180
    pose.cord = 1
    pose.hold = true
  } else if (ms < 5_500) {
    const u = span(ms, 4_400, 5_500)
    pose.opacity = 1
    pose.rotate = reduced ? 0 : 180 * (1 - u)
    pose.cord = 1
    pose.hold = true
  } else if (ms < 6_400) {
    const u = span(ms, 5_500, 6_400)
    pose.opacity = 1 - u
    pose.cord = 1 - u
  }
  return pose
}

function racer(ms: number, reduced: boolean): ScenePose {
  const pose = rest()
  if (ms < 900) {
    pose.opacity = span(ms, 0, 900)
    pose.y = reduced ? 0 : -28 * (1 - pose.opacity)
  } else if (ms < 1_700) {
    pose.opacity = 1
    pose.sy = reduced ? 1 : 0.92
    pose.hold = true
  } else if (ms < 4_200) {
    pose.opacity = 1
    pose.wind = reduced ? 0 : 0.85
    pose.x = reduced ? 0 : Math.sin((ms - 1_700) / 180) * 12
    pose.hold = true
  } else if (ms < 5_200) {
    pose.opacity = 1
    pose.sy = reduced ? 1 : 0.9
    pose.hold = true
  } else if (ms < 6_200) {
    const u = span(ms, 5_200, 6_200)
    pose.opacity = 1 - u
    pose.y = reduced ? 0 : -18 * u
  }
  return pose
}

function ghost(ms: number, reduced: boolean): ScenePose {
  const pose = rest()
  if (ms < 700) pose.sy = reduced ? 1 : 1 - 0.03 * span(ms, 0, 700)
  else if (ms < 1_200) pose.face = 1 - span(ms, 700, 1_200)
  else if (ms < 1_900) {
    pose.opacity = span(ms, 1_200, 1_900)
    pose.face = 1
  } else if (ms < 4_700) {
    pose.opacity = 1
    const u = span(ms, 1_900, 4_700)
    pose.y = reduced ? 0 : Math.sin(u * Math.PI * 2) * 16
    pose.hold = true
  } else if (ms < 5_700) {
    pose.opacity = 1
    pose.x = reduced ? 0 : Math.sin((ms - 4_700) / 140) * 8
    pose.hold = true
  } else if (ms < 6_700) pose.opacity = 1 - span(ms, 5_700, 6_700)
  return pose
}

export function nextAmbientScene(previous: SceneKey | null): SceneKey {
  if (!previous) return SCENE_ORDER[0]
  const index = SCENE_ORDER.indexOf(previous)
  return SCENE_ORDER[(index + 1) % SCENE_ORDER.length]
}
