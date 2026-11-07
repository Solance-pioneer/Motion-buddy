/**
 * UK, France, USA and Egypt. These are portal scenes, not the ambient costume cycle.
 * Times are the supplied tracks. Two ambiguities are resolved here and nowhere else:
 * the USA grab uses the music marker 2.7938s, and the UK march steps the soft-march beats through 6.75s.
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

/** Soft-march footfalls. Playback of uk_soft_march_once starts with the scene clock. */
export const UK_MARCH_BEATS_S = [1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25, 4.75, 5.25, 5.75, 6.25, 6.75] as const

/** Egypt wonder cue, once, as Buddy arrives above the pyramids. */
export const EGYPT_WONDER_S = 3

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
    'prop:us_flag': layer({ tx: 104, ty: 316, sx: 0.8, sy: 0.8 }),
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

/** Next accepted Teleport. A refused press keeps the cursor, so a locked scene does not skip a country. */
export function takeCountryTurn(cursor: number, accepted: boolean): { cursor: number; key: CountryKey | null } {
  const index = ((cursor % COUNTRY_ORDER.length) + COUNTRY_ORDER.length) % COUNTRY_ORDER.length
  if (!accepted) return { cursor: index, key: null }
  return { cursor: (index + 1) % COUNTRY_ORDER.length, key: COUNTRY_ORDER[index] }
}

const UK_MARCH_X = 72

function ukMarchX(time: number): number {
  const beats = UK_MARCH_BEATS_S
  if (time < beats[0] || time >= 7) return 0
  const side = (index: number) => (index % 2 === 0 ? -1 : 1) * UK_MARCH_X
  const last = beats.length - 1
  if (time >= beats[last]) {
    const u = Math.min(1, (time - beats[last]) / (7 - beats[last]))
    return side(last) * (1 - u)
  }
  let index = 0
  while (index < last && time >= beats[index + 1]) index += 1
  const span = beats[index + 1] - beats[index]
  const u = span <= 0 ? 1 : (time - beats[index]) / span
  return side(index) + (side(index + 1) - side(index)) * u
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
  if (!reduced) {
    face.tx = ukMarchX(time)
    if (time >= 1 && time < 7) face.ty = 12 + 3 * Math.abs(Math.sin(time * Math.PI * 4))
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

function usaCarry(time: number): { tx: number; ty: number; sx: number; sy: number; ex: number; ey: number; opacity: number } {
  const grab = USA_GRAB_S
  const liftEnd = grab + 0.4
  const tourEnd = 6.5
  const homeEnd = 7.3
  if (time < 1.6) {
    const u = Math.max(0, time / 1.6)
    return { tx: 0, ty: 0, sx: 1, sy: 1, ex: 220 * (1 - u), ey: -40 - 56 * u, opacity: u }
  }
  if (time < grab) return { tx: 0, ty: 0, sx: 1, sy: 1, ex: 0, ey: -96, opacity: 1 }
  if (time < liftEnd) {
    const u = (time - grab) / (liftEnd - grab)
    return { tx: 0, ty: -46 * u, sx: 1 - 0.54 * u, sy: 1 - 0.54 * u, ex: 0, ey: -96, opacity: 1 }
  }
  if (time < tourEnd) {
    const u = (time - liftEnd) / (tourEnd - liftEnd)
    const angle = u * Math.PI * 2
    const ex = Math.sin(angle) * 120
    const ey = -96 + Math.sin(angle * 2) * 24
    return { tx: ex, ty: ey + 50, sx: 0.46, sy: 0.46, ex, ey, opacity: 1 }
  }
  if (time < homeEnd) {
    const u = (time - tourEnd) / (homeEnd - tourEnd)
    const ey = -96 * (1 - u)
    return { tx: 0, ty: (ey + 50) * (1 - u), sx: 0.46 + 0.54 * u, sy: 0.46 + 0.54 * u, ex: 0, ey, opacity: 1 }
  }
  if (time < 8.3) {
    const u = (time - homeEnd) / (8.3 - homeEnd)
    return { tx: 0, ty: 0, sx: 1, sy: 1, ex: 180 * u, ey: -40 - 200 * u, opacity: 1 - u }
  }
  return { tx: 0, ty: 0, sx: 1, sy: 1, ex: 200, ey: -260, opacity: 0 }
}

function usa(time: number, reduced: boolean, layers: Record<string, LayerPose>): CountryPose {
  const carried = reduced ? null : usaCarry(time)
  const face = reduced
    ? mix(
        [
          { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 9, tx: 0, ty: 0, sx: 1, sy: 1 },
        ],
        time,
        { t: 0, tx: 0, ty: 0, sx: 1, sy: 1 },
      )
    : { t: time, tx: carried!.tx, ty: carried!.ty, sx: carried!.sx, sy: carried!.sy }
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
  layers['prop:us_flag'] = layer({ opacity: flag.opacity, tx: 104, ty: 316 + (flag.ty ?? 0), sx: 0.8, sy: 0.8 })
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
    : { t: time, opacity: carried!.opacity, tx: carried!.ex, ty: carried!.ey }
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
          { t: 1.2, tx: 0, ty: 0, sx: 1, sy: 1 },
          { t: 3, tx: 0, ty: -78, sx: 0.42, sy: 0.42 },
          { t: 7.2, tx: 0, ty: -78, sx: 0.42, sy: 0.42 },
          { t: 8.5, tx: 0, ty: 0, sx: 1, sy: 1 },
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
          { t: 0.8, opacity: 1, scaleY: 0 },
          { t: 2.6, opacity: 1, scaleY: 1 },
          { t: 7.4, opacity: 1, scaleY: 1 },
          { t: 8.6, opacity: 0, scaleY: 1 },
        ],
        time,
        { t: 0, opacity: 0, scaleY: 0 },
      )
  layers['prop:egypt_pyramids'] = layer({ opacity: pyramids.opacity, scaleY: pyramids.scaleY })
  return pose(face, layers, time >= 5.1 && time <= 7)
}
