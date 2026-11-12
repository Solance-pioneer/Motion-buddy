import { isUnlocked } from './entitlements.ts'
import { conditionsFromOverride, type WeatherOverride } from './weather/conditions.ts'
import type { WeatherConditions } from './weather/types.ts'

/** After a touch, idle and random clips wait this long. Touch reactions stay in code. */
export const TOUCH_SUPPRESS_MS = 4_000

export const CAR_CLIP_GAP_MS = 45_000
export const CAR_BUMP_MAG = 12
export const CAR_TURN_LATERAL = 0.9
export const CAR_JAM_MS = 60_000
export const CAR_DRIVE_MIN_MS = 30_000

export type ClipTier = 'free' | 'premium'
export type DateMode = 'normal' | 'festive' | 'new-year'

export type ClipTrigger =
  | 'none'
  | 'season'
  | 'morning'
  | 'goodnight'
  | 'sleepy'
  | 'weather'
  | 'car-bump'
  | 'car-turn'
  | 'car-jam'
  | 'car-arrived'
  | 'car-tunnel'
  | 'car-accel'
  | 'idle'
  | 'teleport'
  | 'race'
  | 'costume'
  | 'country'

export type CostumeClipScene = 'ninja' | 'cord_hero' | 'racer' | 'sheet_ghost'
export type CountryClip = 'uk_guard' | 'france_cafe' | 'usa_eagle' | 'egypt_pharaoh' | 'japan_bow' | 'australia_hop'

export interface ClipRow {
  id: string
  number: number
  file: string
  trigger: ClipTrigger
  cooldownMs: number
  tier: ClipTier
  from?: string
  to?: string
  wrap?: boolean
  weather?: 'rain' | 'snow' | 'clearing' | 'hot' | 'windy'
  scene?: CostumeClipScene
  country?: CountryClip
  label?: string
}

export interface FeatureRow {
  id: string
  tier: ClipTier
}

/**
 * Weather moods and the five weather films are the premium candidates.
 * They need a location reading. The entitlements stub still unlocks them.
 */
export const FEATURE_ROWS: readonly FeatureRow[] = [
  { id: 'weather-moods', tier: 'premium' },
  { id: 'clip-gallery', tier: 'free' },
  { id: 'theme-race-kerb', tier: 'free' },
  { id: 'theme-night-drive', tier: 'premium' },
  { id: 'theme-neon-city', tier: 'premium' },
  { id: 'genre-looks', tier: 'premium' },
  { id: 'genre-pop', tier: 'premium' },
  { id: 'genre-rock', tier: 'premium' },
  { id: 'genre-hip-hop', tier: 'premium' },
  { id: 'genre-electronic', tier: 'premium' },
  { id: 'genre-k-pop', tier: 'premium' },
  { id: 'genre-classical', tier: 'premium' },
  { id: 'genre-rave', tier: 'premium' },
  { id: 'genre-reggae', tier: 'premium' },
  { id: 'genre-soul', tier: 'premium' },
  { id: 'genre-country', tier: 'premium' },
  { id: 'genre-jazz', tier: 'premium' },
  { id: 'genre-blues', tier: 'premium' },
  { id: 'genre-metal', tier: 'premium' },
  { id: 'genre-latin', tier: 'premium' },
  { id: 'genre-punk', tier: 'premium' },
  { id: 'genre-indie', tier: 'premium' },
]

const free = (row: Omit<ClipRow, 'tier' | 'file'> & { file?: string }): ClipRow => ({
  ...row,
  tier: 'free',
  file: row.file ?? `${row.id}-v1.mp4`,
})
const premium = (row: Omit<ClipRow, 'tier' | 'file'> & { file?: string }): ClipRow => ({
  ...row,
  tier: 'premium',
  file: row.file ?? `${row.id}-v1.mp4`,
})

export const CLIP_ROWS: readonly ClipRow[] = [
  free({ id: 'sleepy-doze', number: 1, trigger: 'sleepy', cooldownMs: 480_000 }),
  free({ id: 'sneeze', number: 2, trigger: 'idle', cooldownMs: 0, file: 'sneeze-v2-app.mp4' }),
  free({ id: 'hiccups', number: 3, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'giggle-fit', number: 4, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'love-hearts', number: 5, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'sulky-pout', number: 6, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'proud-sparkle', number: 7, trigger: 'idle', cooldownMs: 0, file: 'proud-sparkle-v2.mp4' }),
  free({ id: 'shy-peek', number: 8, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'wink-kiss', number: 9, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'bright-idea', number: 10, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'mind-blown', number: 11, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'speed-bump-bounce', number: 12, trigger: 'car-bump', cooldownMs: 45_000 }),
  free({ id: 'sharp-turn-wobble', number: 13, trigger: 'car-turn', cooldownMs: 45_000 }),
  free({ id: 'traffic-jam-bored', number: 14, trigger: 'car-jam', cooldownMs: 60_000 }),
  free({ id: 'arrived-celebration', number: 15, trigger: 'car-arrived', cooldownMs: 45_000 }),
  free({ id: 'tunnel-peek', number: 16, trigger: 'car-tunnel', cooldownMs: 60_000 }),
  premium({ id: 'rain-umbrella', number: 17, trigger: 'weather', cooldownMs: 1_200_000, weather: 'rain' }),
  premium({ id: 'snow-day', number: 18, trigger: 'weather', cooldownMs: 1_200_000, weather: 'snow' }),
  premium({ id: 'rainbow', number: 19, trigger: 'weather', cooldownMs: 1_200_000, weather: 'clearing' }),
  premium({ id: 'hot-day-melt', number: 20, trigger: 'weather', cooldownMs: 1_200_000, weather: 'hot' }),
  premium({ id: 'windy-gust', number: 21, trigger: 'weather', cooldownMs: 1_200_000, weather: 'windy' }),
  free({ id: 'good-morning', number: 22, trigger: 'morning', cooldownMs: 0 }),
  free({ id: 'goodnight', number: 23, trigger: 'goodnight', cooldownMs: 0 }),
  free({ id: 'noodles', number: 24, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'bubble-gum-pop', number: 25, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'juggling', number: 26, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'dance-groove', number: 27, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'headphones-jam', number: 28, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'karate-chop', number: 29, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'superhero-landing', number: 30, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'cool-shades', number: 31, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'soap-bubbles', number: 32, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'low-battery-recharge', number: 33, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'brain-freeze', number: 34, trigger: 'idle', cooldownMs: 0 }),
  free({ id: 'birthday-cake', number: 35, trigger: 'none', cooldownMs: 0 }),
  free({ id: 'christmas-hat', number: 36, trigger: 'season', cooldownMs: 0, from: '2026-11-12', to: '2026-12-25' }),
  free({ id: 'new-year-fireworks', number: 37, trigger: 'season', cooldownMs: 0, from: '12-26', to: '01-07', wrap: true }),
  free({ id: 'halloween-pumpkin-boo', number: 38, trigger: 'season', cooldownMs: 0, from: '2026-11-12', to: '2026-12-25' }),
  free({ id: 'teleport', number: 39, trigger: 'teleport', cooldownMs: 0 }),
  free({ id: 'car-accelerate', number: 40, trigger: 'car-accel', cooldownMs: 45_000 }),
  free({ id: 'race-start', number: 41, trigger: 'race', cooldownMs: 0 }),
  free({ id: 'ninja-idle', number: 42, trigger: 'none', cooldownMs: 0, file: '' }),
  free({ id: 'superhero-idle', number: 43, trigger: 'costume', cooldownMs: 0, scene: 'cord_hero' }),
  free({ id: 'racer-idle', number: 44, trigger: 'costume', cooldownMs: 0, scene: 'racer', file: 'racer-idle-v2.mp4' }),
  free({ id: 'ghost-idle', number: 45, trigger: 'none', cooldownMs: 0, file: '' }),
  free({ id: 'uk-guard', number: 46, trigger: 'country', cooldownMs: 0, country: 'uk_guard' }),
  free({ id: 'usa-eagle', number: 47, trigger: 'country', cooldownMs: 0, country: 'usa_eagle' }),
  free({ id: 'france-eiffel', number: 48, trigger: 'country', cooldownMs: 0, country: 'france_cafe' }),
  free({ id: 'egypt-pyramids', number: 49, trigger: 'country', cooldownMs: 0, country: 'egypt_pharaoh' }),
  free({ id: 'japan-fuji', number: 50, trigger: 'country', cooldownMs: 0, country: 'japan_bow', file: 'japan-fuji-v2.mp4' }),
  free({ id: 'australia-kangaroo', number: 51, trigger: 'country', cooldownMs: 0, country: 'australia_hop' }),
  free({ id: 'leaf-catch-hd', number: 52, trigger: 'idle', cooldownMs: 0, file: 'leaf-catch-hd-v1.mp4', label: 'leaf-catch (HD test)' }),
]

export type ClipGuard = 'rush' | 'brake' | 'batch' | null

export interface ClipHold {
  guard: ClipGuard
  suppressUntil: number
}

export function clipById(id: string): ClipRow | undefined {
  return CLIP_ROWS.find((row) => row.id === id)
}

export function localYmd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Inclusive. wrap uses month-day and crosses 1 January. */
export function inDateWindow(date: Date, from: string, to: string, wrap = false): boolean {
  if (!wrap) {
    const key = localYmd(date)
    return key >= from && key <= to
  }
  const key = localYmd(date).slice(5)
  if (from <= to) return key >= from && key <= to
  return key >= from || key <= to
}

export function previewDate(real: Date, mode: DateMode): Date {
  if (mode === 'festive') return new Date(2026, 11, 1, 12, 0, 0)
  if (mode === 'new-year') return new Date(2026, 11, 28, 12, 0, 0)
  return real
}

export function noteInteraction(hold: ClipHold, now: number, fromGallery: boolean): { hold: ClipHold; cancel: boolean } {
  if (fromGallery) return { hold, cancel: false }
  return {
    hold: { guard: null, suppressUntil: now + TOUCH_SUPPRESS_MS },
    cancel: hold.guard != null,
  }
}

export function idleBlocked(suppressUntil: number, now: number): boolean {
  return now < suppressUntil
}

export function rowOpen(row: ClipRow): boolean {
  return isUnlocked(row.id)
}

function ready(readyAt: Readonly<Record<string, number>>, id: string, now: number): boolean {
  const at = readyAt[id]
  return at == null || now >= at
}

export function seasonDue(date: Date, played: readonly string[]): string | null {
  const rows = CLIP_ROWS.filter((row) => row.trigger === 'season' && row.from && row.to && rowOpen(row) && !played.includes(row.id))
  const hit = rows.find((row) => inDateWindow(date, row.from!, row.to!, row.wrap))
  return hit?.id ?? null
}

export function morningDue(date: Date, storedYmd: string | null): boolean {
  const row = clipById('good-morning')
  if (!row || !rowOpen(row)) return false
  const minutes = minutesOf(date)
  if (minutes < 5 * 60 || minutes >= 11 * 60) return false
  return storedYmd !== localYmd(date)
}

export function goodnightDue(date: Date, played: boolean): boolean {
  const row = clipById('goodnight')
  if (!row || !rowOpen(row) || played) return false
  return minutesOf(date) >= 21 * 60
}

export function sleepyDue(date: Date, readyAt: Readonly<Record<string, number>>, now: number, suppressUntil: number): boolean {
  if (idleBlocked(suppressUntil, now)) return false
  const row = clipById('sleepy-doze')
  if (!row || !rowOpen(row) || !ready(readyAt, row.id, now)) return false
  const minutes = minutesOf(date)
  return minutes >= 23 * 60 || minutes < 5 * 60
}

const WEATHER_ORDER = ['snow', 'rain', 'clearing', 'hot', 'windy'] as const

export function weatherClipId(
  conditions: WeatherConditions,
  readyAt: Readonly<Record<string, number>>,
  now: number,
): string | null {
  if (!isUnlocked('weather-moods')) return null
  for (const flag of WEATHER_ORDER) {
    if (!conditions[flag]) continue
    const row = CLIP_ROWS.find((item) => item.trigger === 'weather' && item.weather === flag)
    if (!row || !rowOpen(row) || !ready(readyAt, row.id, now)) continue
    return row.id
  }
  return null
}

export interface ScheduleInput {
  now: number
  date: Date
  reduced: boolean
  guard: ClipGuard
  suppressUntil: number
  playedSeason: readonly string[]
  goodnightPlayed: boolean
  morningStored: string | null
  readyAt: Readonly<Record<string, number>>
  weather: WeatherConditions | null
  weatherEnabled: boolean
}

/** One automatic film. Rush, brake, and any current film block it. Reduced motion skips it. */
export function chooseScheduledClip(input: ScheduleInput): string | null {
  if (input.reduced || input.guard) return null
  if (morningDue(input.date, input.morningStored)) return 'good-morning'
  if (goodnightDue(input.date, input.goodnightPlayed)) return 'goodnight'
  const season = seasonDue(input.date, input.playedSeason)
  if (season) return season
  if (input.weatherEnabled && input.weather) {
    const weather = weatherClipId(input.weather, input.readyAt, input.now)
    if (weather) return weather
  }
  if (sleepyDue(input.date, input.readyAt, input.now, input.suppressUntil)) return 'sleepy-doze'
  return null
}

/** Share of idle turns that play a clip. The rest are coded costumes. */
export const IDLE_CLIP_WEIGHT = 0.8

/** Seconds between successive idle animations. Invalid stored values fall back to this. */
export const IDLE_GAP_DEFAULT_S = 5
export const IDLE_GAP_MIN_S = 3
export const IDLE_GAP_MAX_S = 60

/**
 * Cap on the wait before the first idle after load, and before the first idle
 * after TOUCH_SUPPRESS_MS ends. The old wait was SCENE_GAP_MS (7000) for every
 * gap, including the first. The wait used is min(the user's gap, this), so a
 * 60s setting still shows an idle within 4s of load or of the cooldown ending.
 */
export const IDLE_FIRST_DELAY_MS = 4_000

export type IdleAction = { kind: 'clip'; id: string } | { kind: 'coded' }

export interface IdleWaitClock {
  elapsed: number
  first: boolean
}

/** Emotion and activity films, plus superhero-idle and racer-idle. Both costumes still play on their coded turns. */
function idleClipRows(allowed?: ReadonlySet<string> | null): ClipRow[] {
  return CLIP_ROWS.filter((row) => row.file && rowOpen(row) && (row.trigger === 'idle' || row.id === 'superhero-idle' || row.id === 'racer-idle') && (!allowed || allowed.has(row.id)))
}

export function nextIdleClip(previous: string | null, random = 0, allowed?: ReadonlySet<string> | null): string | null {
  const pool = idleClipRows(allowed)
  if (pool.length === 0) return null
  const start = Math.abs(Math.floor(random * pool.length)) % pool.length
  for (let step = 0; step < pool.length; step += 1) {
    const row = pool[(start + step) % pool.length]
    if (row.id !== previous) return row.id
  }
  return null
}

/** Reduced motion is always a coded idle, so the weight cannot leave a blank gap. */
export function chooseIdleAction(weightRandom: number, reduced: boolean, previous: string | null, clipRandom = 0, allowed?: ReadonlySet<string> | null): IdleAction {
  if (!reduced && weightRandom < IDLE_CLIP_WEIGHT) {
    const id = nextIdleClip(previous, clipRandom, allowed)
    if (id) return { kind: 'clip', id }
  }
  return { kind: 'coded' }
}

export function clampIdleGapSeconds(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN
  if (!Number.isFinite(n)) return IDLE_GAP_DEFAULT_S
  const rounded = Math.round(n)
  if (rounded < IDLE_GAP_MIN_S || rounded > IDLE_GAP_MAX_S) return IDLE_GAP_DEFAULT_S
  return rounded
}

/** Same shape as the remembered mute record: one JSON object. */
export function idleGapToStorage(seconds: number): string {
  return JSON.stringify({ seconds: clampIdleGapSeconds(seconds) })
}

export function idleGapSecondsFromStorage(raw: string | null): number {
  if (!raw) return IDLE_GAP_DEFAULT_S
  try {
    const parsed = JSON.parse(raw) as { seconds?: unknown }
    if (!parsed || typeof parsed !== 'object') return IDLE_GAP_DEFAULT_S
    return clampIdleGapSeconds(parsed.seconds)
  } catch {
    return IDLE_GAP_DEFAULT_S
  }
}

export function idleGapMs(seconds: number): number {
  return clampIdleGapSeconds(seconds) * 1_000
}

/** Later idles use the full gap. The first one after load or a touch cooldown stays short. */
export function idleWaitMs(gapMs: number, first: boolean): number {
  const gap = idleGapMs(gapMs / 1_000)
  if (!first) return gap
  return Math.min(gap, IDLE_FIRST_DELAY_MS)
}

/**
 * One clock for clip idles and coded idles. While a touch suppress is active the
 * elapsed time stays at 0 and the next idle is treated as a first idle.
 */
export function advanceIdleWait(
  clock: IdleWaitClock,
  dt: number,
  gapMs: number,
  suppressUntil: number,
  now: number,
): { clock: IdleWaitClock; due: boolean } {
  if (now < suppressUntil) return { clock: { elapsed: 0, first: true }, due: false }
  const elapsed = clock.elapsed + dt
  const wait = idleWaitMs(gapMs, clock.first)
  if (elapsed >= wait) return { clock: { elapsed: 0, first: false }, due: true }
  return { clock: { elapsed, first: clock.first }, due: false }
}

export function classifyCarMotion(magnitude: number, lateral: number): 'bump' | 'turn' | null {
  if (Math.abs(lateral) >= CAR_TURN_LATERAL) return 'turn'
  if (magnitude >= CAR_BUMP_MAG && Math.abs(lateral) < 0.5) return 'bump'
  return null
}

export function jamDue(stillMs: number): boolean {
  return stillMs >= CAR_JAM_MS
}

export function driveWasReal(onMs: number, sawMotion: boolean): boolean {
  return sawMotion && onMs >= CAR_DRIVE_MIN_MS
}

export function carGapOpen(lastAt: number, now: number): boolean {
  return now - lastAt >= CAR_CLIP_GAP_MS
}

export function carClipFor(
  kind: 'bump' | 'turn' | 'jam' | 'arrived' | 'tunnel' | 'accel',
  readyAt: Readonly<Record<string, number>>,
  now: number,
  lastCarAt: number,
  suppressUntil: number,
): string | null {
  if ((kind === 'tunnel') && idleBlocked(suppressUntil, now)) return null
  if (!carGapOpen(lastCarAt, now)) return null
  const trigger = kind === 'bump' ? 'car-bump' : kind === 'turn' ? 'car-turn' : kind === 'jam' ? 'car-jam' : kind === 'arrived' ? 'car-arrived' : kind === 'accel' ? 'car-accel' : 'car-tunnel'
  const row = CLIP_ROWS.find((item) => item.trigger === trigger && item.file)
  if (!row || !rowOpen(row) || !ready(readyAt, row.id, now)) return null
  return row.id
}

/** Even turns keep the existing rush film. Odd turns use the race-start film. */
export function nextRaceFilm(turn: number): 'rush' | 'race-start' {
  return turn % 2 === 0 ? 'rush' : 'race-start'
}

/** Costume-cycle film for this scene. Ninja and ghost stay on the coded costume. */
export function costumeClipId(scene: CostumeClipScene): string | null {
  const row = CLIP_ROWS.find((item) => item.trigger === 'costume' && item.scene === scene && item.file && rowOpen(item))
  return row?.id ?? null
}

/**
 * One Teleport press. The teleport film plays first, then the country film.
 * Reduced motion skips both. A missing country film leaves the coded scene to follow.
 */
export function portalPlan(country: CountryClip, reduced: boolean): { clips: string[]; sceneAfter: boolean } {
  if (reduced) return { clips: [], sceneAfter: true }
  const intro = CLIP_ROWS.find((item) => item.trigger === 'teleport' && item.file && rowOpen(item))
  const landed = CLIP_ROWS.find((item) => item.trigger === 'country' && item.country === country && item.file && rowOpen(item))
  const clips = [intro?.id, landed?.id].filter((id): id is string => Boolean(id))
  return { clips, sceneAfter: !landed }
}

export function tunnelRoll(random: number, stillMs: number): boolean {
  return stillMs >= 12_000 && random < 0.35
}

export function activeWeather(override: WeatherOverride, live: WeatherConditions | null, enabled: boolean): { weather: WeatherConditions | null; enabled: boolean } {
  const preview = conditionsFromOverride(override)
  if (preview) return { weather: preview, enabled: true }
  return { weather: live, enabled }
}
