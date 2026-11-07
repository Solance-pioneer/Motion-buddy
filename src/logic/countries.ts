/**
 * UK, France, USA and Egypt. These are portal scenes, not the ambient costume cycle.
 * Times are the supplied tracks. Two ambiguities are resolved here and nowhere else:
 * the USA grab uses the music marker 2.7938s, and the UK march stops at 6.6s.
 */
export const COUNTRY_ORDER = ['uk_guard', 'france_cafe', 'usa_eagle', 'egypt_pharaoh'] as const

export type CountryKey = (typeof COUNTRY_ORDER)[number]

export const COUNTRY_MS: Record<CountryKey, number> = {
  uk_guard: 8_000,
  france_cafe: 8_000,
  usa_eagle: 9_000,
  egypt_pharaoh: 9_500,
}

export const COUNTRY_MUSIC: Record<CountryKey, 'uk_guard_march' | 'france_cafe_waltz' | 'usa_anthem_eagle' | 'egypt_cinematic'> = {
  uk_guard: 'uk_guard_march',
  france_cafe: 'france_cafe_waltz',
  usa_eagle: 'usa_anthem_eagle',
  egypt_pharaoh: 'egypt_cinematic',
}

/** One lead-in, then the country clock starts at 0. No sound plays during the lead-in. */
export const TRANSITION_MS = { normal: 280, reduced: 420 } as const

/** Bar 2 of the supplied USA cue. The prose grab at 2.6s and the "~2.48s" note are not used. */
export const USA_GRAB_S = 2.7938

export const COUNTRY_GAIN = 0.68

export interface LayerPose {
  opacity: number
  tx: number
  ty: number
  sx: number
  sy: number
  scaleY: number
}

export interface CountryPose {
  done: boolean
  hold: boolean
  tx: number
  ty: number
  sx: number
  sy: number
  layers: Record<string, LayerPose>
}

const layer = (extra: Partial<LayerPose> = {}): LayerPose => ({
  opacity: 0,
  tx: 0,
  ty: 0,
  sx: 1,
  sy: 1,
  scaleY: 1,
  ...extra,
})

const ease = (value: number) => {
  const u = Math.max(0, Math.min(1, value))
  return u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2
}

interface Frame {
  t: number
  tx?: number
  ty?: number
  sx?: number
  sy?: number
  opacity?: number
  scaleY?: number
}

function mix(frames: Frame[], time: number, base: Frame): Frame {
  const keys = frames
  if (time <= keys[0].t) return { ...base, ...keys[0] }
  for (let index = 1; index < keys.length; index += 1) {
    const next = keys[index]
    const prev = keys[index - 1]
    if (time > next.t) continue
    const carried = { ...base, ...prev }
    if (next.t - prev.t <= 0.02) return time < next.t ? carried : { ...carried, ...next }
    const amount = ease((time - prev.t) / (next.t - prev.t))
    const between = (field: keyof Frame) => {
      const from = (prev[field] ?? carried[field] ?? 0) as number
      const to = (next[field] ?? prev[field] ?? carried[field] ?? 0) as number
      return from + (to - from) * amount
    }
    return {
      t: time,
      tx: between('tx'),
      ty: between('ty'),
      sx: between('sx'),
      sy: between('sy'),
      opacity: between('opacity'),
      scaleY: between('scaleY'),
    }
  }
  return { ...base, ...keys[keys.length - 1] }
}

function blank(): Record<string, LayerPose> {
  return {
    'overlay:uk_guard': layer(),
    'prop:uk_big_ben': layer(),
    'overlay:france_cafe': layer(),
    'prop:france_eiffel_tower': layer(),
    'prop:us_flag': layer({ tx: 104, ty: 258, sx: 0.8, sy: 0.8 }),
    'prop:us_eagle': layer(),
    'prop:usa_statue_of_liberty': layer(),
    'overlay:egypt_pharaoh': layer(),
    'prop:egypt_pyramids': layer({ scaleY: 0 }),
  }
}

export function pickCountry(random = Math.random()): CountryKey {
  const index = Math.min(COUNTRY_ORDER.length - 1, Math.floor(random * COUNTRY_ORDER.length))
  return COUNTRY_ORDER[index]
}

export function sampleCountry(key: CountryKey, ms: number, reduced = false): CountryPose {
  const limit = COUNTRY_MS[key]
  const layers = blank()
  if (ms >= limit) {
    return { done: true, hold: false, tx: 0, ty: 0, sx: 1, sy: 1, layers }
  }
  const time = ms / 1000
  if (key === 'uk_guard') return uk(time, reduced, layers)
  if (key === 'france_cafe') return france(time, reduced, layers)
  if (key === 'usa_eagle') return usa(time, reduced, layers)
  return egypt(time, reduced, layers)
}

function pose(face: Frame, layers: Record<string, LayerPose>, hold: boolean): CountryPose {
  return {
    done: false,
    hold,
    tx: face.tx ?? 0,
    ty: face.ty ?? 0,
    sx: face.sx ?? 1,
    sy: face.sy ?? 1,
    layers,
  }
}

function uk(time: number, reduced: boolean, layers: Record<string, LayerPose>): CountryPose {
  const face = reduced
    ? mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 0.3, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 0.7, tx: 0, ty: 12, sx: 0.82, sy: 0.82 },
          { t: 7.2, tx: 0, ty: 12, sx: 0.82, sy: 0.82 },
          { t: 7.6, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 8, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
    : mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 0.5, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 1, tx: 0, ty: 12, sx: 0.82, sy: 0.82 },
          { t: 6.6, tx: 0, ty: 12, sx: 0.82, sy: 0.82 },
          { t: 7.3, tx: 0, ty: 12, sx: 0.82, sy: 0.82 },
          { t: 8, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
  if (!reduced && time >= 1 && time < 6.6) {
    const fade = time > 6.45 ? (6.6 - time) / 0.15 : 1
    const phase = ((time - 0.5) / 1.1111) * Math.PI * 2
    face.tx = 26 * Math.sin(phase) * fade
    face.ty = 12 + 3 * Math.abs(Math.sin(phase)) * fade
  }
  const hat = reduced
    ? mix(
        [
          { t: 0, ty: 0, opacity: 0 },
          { t: 0.3, ty: 0, opacity: 0 },
          { t: 0.7, ty: 0, opacity: 1 },
          { t: 7.2, ty: 0, opacity: 1 },
          { t: 7.6, ty: 0, opacity: 0 },
        ],
        time,
        { t: 0, ty: 0, opacity: 0 },
      )
    : mix(
        [
          { t: 0, ty: -260, opacity: 1 },
          { t: 0.5, ty: -60, opacity: 1 },
          { t: 1, ty: 0, opacity: 1 },
          { t: 7.3, ty: 0, opacity: 1 },
          { t: 7.9, ty: -260, opacity: 0 },
        ],
        time,
        { t: 0, ty: 0, opacity: 0 },
      )
  layers['overlay:uk_guard'] = layer({ opacity: hat.opacity, ty: hat.ty })
  const tower = mix(
    [
      { t: 0, opacity: 0 },
      { t: 0.3, opacity: 0 },
      { t: 0.8, opacity: 0.72 },
      { t: 7.2, opacity: 0.72 },
      { t: 7.6, opacity: 0 },
      { t: 8, opacity: 0 },
    ],
    time,
    { t: 0, opacity: 0 },
  )
  layers['prop:uk_big_ben'] = layer({ opacity: tower.opacity })
  return pose(face, layers, time >= 1.2 && time <= 6.5)
}

function france(time: number, reduced: boolean, layers: Record<string, LayerPose>): CountryPose {
  const face = mix(
    [
      { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      { t: 8, tx: 0, ty: 0, sx: 1, sy: 1 },
    ],
    time,
    { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
  )
  if (!reduced && time >= 1 && time < 6.3) {
    const fade = time > 6.1 ? (6.3 - time) / 0.2 : time < 1.15 ? (time - 1) / 0.15 : 1
    face.tx = 14 * Math.sin(((time - 0.35) / 2.6087) * Math.PI * 2) * fade
    const since = (time - 0.35) % 1.30435
    if (since < 0.12) face.sy = 1 - 0.04 * (1 - since / 0.12)
  }
  const beret = reduced
    ? mix(
        [
          { t: 0, ty: 0, opacity: 0 },
          { t: 0.3, ty: 0, opacity: 0 },
          { t: 0.7, ty: 0, opacity: 1 },
          { t: 7, ty: 0, opacity: 1 },
          { t: 7.6, ty: 0, opacity: 0 },
        ],
        time,
        { t: 0, ty: 0, opacity: 0 },
      )
    : mix(
        [
          { t: 0, ty: -200, opacity: 0 },
          { t: 0.35, ty: -200, opacity: 1 },
          { t: 0.8, ty: 6, opacity: 1 },
          { t: 1, ty: 0, opacity: 1 },
          { t: 7, ty: 0, opacity: 1 },
          { t: 7.8, ty: 0, opacity: 0 },
        ],
        time,
        { t: 0, ty: 0, opacity: 0 },
      )
  layers['overlay:france_cafe'] = layer({ opacity: beret.opacity, ty: beret.ty })
  const tower = mix(
    [
      { t: 0, opacity: 0 },
      { t: 0.35, opacity: 0 },
      { t: 0.85, opacity: 0.72 },
      { t: 7, opacity: 0.72 },
      { t: 7.6, opacity: 0 },
      { t: 8, opacity: 0 },
    ],
    time,
    { t: 0, opacity: 0 },
  )
  layers['prop:france_eiffel_tower'] = layer({ opacity: tower.opacity })
  return pose(face, layers, time >= 1.2 && time <= 6.2)
}

function usa(time: number, reduced: boolean, layers: Record<string, LayerPose>): CountryPose {
  const grab = USA_GRAB_S
  const face = reduced
    ? mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 9, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
    : mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: grab, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: grab + 0.2, tx: 0, ty: -14, sx: 0.82, sy: 0.82 },
          { t: 4.4, tx: -420, ty: -260, sx: 0.82, sy: 0.82 },
          { t: 4.41, tx: 420, ty: -200, sx: 0.82, sy: 0.82 },
          { t: 6.6, tx: 0, ty: -14, sx: 0.82, sy: 0.82 },
          { t: 7, tx: 0, ty: 4, sx: 1.04, sy: 0.94 },
          { t: 7.4, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
  const flag = reduced
    ? mix(
        [
          { t: 0, opacity: 0, ty: 0 },
          { t: 0.5, opacity: 0, ty: 0 },
          { t: 1, opacity: 0.85, ty: 0 },
          { t: 7.4, opacity: 0.85, ty: 0 },
          { t: 8.2, opacity: 0, ty: 0 },
        ],
        time,
        { t: 0, opacity: 0, ty: 0 },
      )
    : mix(
        [
          { t: 0, opacity: 0, ty: 40 },
          { t: 1.6, opacity: 0.85, ty: 0 },
          { t: 7.4, opacity: 0.85, ty: 0 },
          { t: 8.6, opacity: 0, ty: 0 },
        ],
        time,
        { t: 0, opacity: 0, ty: 0 },
      )
  layers['prop:us_flag'] = layer({ opacity: flag.opacity, tx: 104, ty: 258 + (flag.ty ?? 0), sx: 0.8, sy: 0.8 })
  const eagle = reduced
    ? mix(
        [
          { t: 0, opacity: 0, tx: 0, ty: -110 },
          { t: 0.5, opacity: 0, tx: 0, ty: -110 },
          { t: 1, opacity: 1, tx: 0, ty: -110 },
          { t: 7.4, opacity: 1, tx: 0, ty: -110 },
          { t: 8.2, opacity: 0, tx: 0, ty: -110 },
        ],
        time,
        { t: 0, opacity: 0, tx: 0, ty: -110 },
      )
    : mix(
        [
          { t: 0, opacity: 0, tx: 420, ty: -260 },
          { t: 1.6, opacity: 1, tx: 420, ty: -260 },
          { t: grab, opacity: 1, tx: 0, ty: -110 },
          { t: 4.4, opacity: 1, tx: -420, ty: -360 },
          { t: 4.41, opacity: 1, tx: 420, ty: -300 },
          { t: 6.6, opacity: 1, tx: 0, ty: -110 },
          { t: 7.4, opacity: 1, tx: 120, ty: -400 },
          { t: 7.6, opacity: 0, tx: 160, ty: -460 },
        ],
        time,
        { t: 0, opacity: 0, tx: 0, ty: 0 },
      )
  layers['prop:us_eagle'] = layer({ opacity: eagle.opacity, tx: eagle.tx, ty: eagle.ty })
  const liberty = mix(
    [
      { t: 0, opacity: 0 },
      { t: 0.45, opacity: 0 },
      { t: 0.95, opacity: 0.72 },
      { t: 7.4, opacity: 0.72 },
      { t: 8.6, opacity: 0 },
      { t: 9, opacity: 0 },
    ],
    time,
    { t: 0, opacity: 0 },
  )
  layers['prop:usa_statue_of_liberty'] = layer({ opacity: liberty.opacity })
  return pose(face, layers, time >= 1.7 && time <= 2.5)
}

function egypt(time: number, reduced: boolean, layers: Record<string, LayerPose>): CountryPose {
  const face = reduced
    ? mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 9.5, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
    : mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 2.85, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 3.3, tx: -30, ty: 0, sx: 0.86, sy: 1.07 },
          { t: 4.65, tx: -40, ty: 0, sx: 0.84, sy: 1.06 },
          { t: 7.1, tx: -40, ty: 0, sx: 0.84, sy: 1.06 },
          { t: 8.4, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 9.5, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
  const crown = reduced
    ? mix(
        [
          { t: 0, opacity: 0, ty: 0 },
          { t: 0.6, opacity: 0, ty: 0 },
          { t: 1.2, opacity: 1, ty: 0 },
          { t: 8.4, opacity: 1, ty: 0 },
          { t: 9, opacity: 0, ty: 0 },
        ],
        time,
        { t: 0, opacity: 0, ty: 0 },
      )
    : mix(
        [
          { t: 0, opacity: 0, ty: -30 },
          { t: 0.6, opacity: 0, ty: -30 },
          { t: 1.2, opacity: 1, ty: 0 },
          { t: 8.6, opacity: 1, ty: 0 },
          { t: 9.3, opacity: 0, ty: 0 },
        ],
        time,
        { t: 0, opacity: 0, ty: 0 },
      )
  layers['overlay:egypt_pharaoh'] = layer({ opacity: crown.opacity, ty: crown.ty })
  const pyramids = reduced
    ? mix(
        [
          { t: 0, opacity: 0, scaleY: 1 },
          { t: 0.6, opacity: 0, scaleY: 1 },
          { t: 1.2, opacity: 1, scaleY: 1 },
          { t: 8.4, opacity: 1, scaleY: 1 },
          { t: 9, opacity: 0, scaleY: 1 },
        ],
        time,
        { t: 0, opacity: 0, scaleY: 1 },
      )
    : mix(
        [
          { t: 0, opacity: 0, scaleY: 0 },
          { t: 1.2, opacity: 1, scaleY: 0 },
          { t: 5.05, opacity: 1, scaleY: 1 },
          { t: 7.1, opacity: 1, scaleY: 1 },
          { t: 8.6, opacity: 0, scaleY: 0 },
        ],
        time,
        { t: 0, opacity: 0, scaleY: 0 },
      )
  layers['prop:egypt_pyramids'] = layer({ opacity: pyramids.opacity, scaleY: pyramids.scaleY })
  return pose(face, layers, time >= 5.1 && time <= 7)
}
