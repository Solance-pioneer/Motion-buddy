import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { conditionsFromOverride, conditionsFromReading } from './weather/conditions.ts'
import {
  CAR_BUMP_MAG,
  CAR_DRIVE_MIN_MS,
  CAR_JAM_MS,
  CAR_TURN_LATERAL,
  CLIP_ROWS,
  TOUCH_SUPPRESS_MS,
  IDLE_CLIP_WEIGHT,
  IDLE_FIRST_DELAY_MS,
  IDLE_GAP_DEFAULT_S,
  advanceIdleWait,
  carClipFor,
  chooseIdleAction,
  chooseScheduledClip,
  clampIdleGapSeconds,
  classifyCarMotion,
  clipById,
  costumeClipId,
  driveWasReal,
  goodnightDue,
  idleBlocked,
  idleGapMs,
  idleGapSecondsFromStorage,
  idleGapToStorage,
  idleWaitMs,
  inDateWindow,
  jamDue,
  morningDue,
  nextIdleClip,
  nextRaceFilm,
  noteInteraction,
  portalPlan,
  previewDate,
  seasonDue,
  weatherClipId,
} from './clip-table.ts'

const base = {
  now: 10_000,
  reduced: false,
  guard: null,
  suppressUntil: 0,
  playedSeason: [] as string[],
  goodnightPlayed: false,
  morningStored: '2026-11-12',
  readyAt: {},
  weather: null,
  weatherEnabled: false,
}

describe('batch clip table', () => {
  it('lists clips 1 to 52', () => {
    expect(CLIP_ROWS).toHaveLength(52)
    expect(CLIP_ROWS.map((row) => row.number)).toEqual(Array.from({ length: 52 }, (_, index) => index + 1))
    expect(CLIP_ROWS.every((row) => row.tier === 'free' || row.tier === 'premium')).toBe(true)
    expect(CLIP_ROWS.find((row) => row.id === 'birthday-cake')?.trigger).toBe('none')
    expect(clipById('sneeze')?.file).toBe('sneeze-v1.mp4')
    expect(clipById('giggle-fit')?.file).toBe('giggle-fit-v1.mp4')
    expect(clipById('wink-kiss')?.file).toBe('wink-kiss-v1.mp4')
    expect(clipById('proud-sparkle')?.file).toBe('proud-sparkle-v2.mp4')
    expect(clipById('ninja-idle')).toMatchObject({ number: 42, trigger: 'none', file: '' })
    expect(clipById('ghost-idle')).toMatchObject({ number: 45, trigger: 'none', file: '' })
    expect(clipById('leaf-catch-hd')).toMatchObject({ number: 52, trigger: 'idle', tier: 'free', file: 'leaf-catch-hd-v1.mp4', label: 'leaf-catch (HD test)' })
  })

  it('plays the new films on the matching event and keeps a coded fallback', () => {
    expect(nextRaceFilm(0)).toBe('rush')
    expect(nextRaceFilm(1)).toBe('race-start')
    expect(nextRaceFilm(2)).toBe('rush')
    expect(costumeClipId('ninja')).toBeNull()
    expect(costumeClipId('sheet_ghost')).toBeNull()
    expect(costumeClipId('cord_hero')).toBe('superhero-idle')
    expect(costumeClipId('racer')).toBe('racer-idle')
    expect(carClipFor('accel', {}, 50_000, 0, 0)).toBe('car-accelerate')
    expect(carClipFor('accel', {}, 50_000, 40_000, 0)).toBeNull()
    expect(carClipFor('accel', { 'car-accelerate': 80_000 }, 50_000, 0, 0)).toBeNull()
    const uk = portalPlan('uk_guard', false)
    expect(uk.clips).toEqual(['teleport', 'uk-guard'])
    expect(uk.sceneAfter).toBe(false)
    expect(portalPlan('japan_bow', true)).toEqual({ clips: [], sceneAfter: true })
    const seen = new Set<string>()
    for (let i = 0; i < 400; i += 1) seen.add(nextIdleClip(null, i / 400) ?? '')
    expect(seen.has('superhero-idle')).toBe(true)
    expect(seen.has('racer-idle')).toBe(true)
    expect(seen.has('leaf-catch-hd')).toBe(true)
    expect(seen.has('sneeze')).toBe(true)
    expect(seen.has('ninja-idle')).toBe(false)
    expect(seen.has('ghost-idle')).toBe(false)
  })

  it('ships the approved mp4 bytes and leaves the held-back names out', () => {
    const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')
    expect(hash('src/assets/scene-clips-batch1-v1/proud-sparkle-v2.mp4')).toBe('7cd914fdbb5d79f811313a3a5cd53733eaf25a011fa8783819f585319490be47')
    expect(hash('src/assets/hd-test/leaf-catch-hd-v1.mp4')).toBe('957aef5b2b536b73e0b4303deffe53ddbf678e87ccd33e213877664cb9736426')
    expect(hash('src/assets/scene-clips-batch1-v1/sneeze-v1.mp4')).toBe('1d2cc9b7327e3fb734c61c6d958485ee3b7028c9aa6b91a3949e4a644787de18')
    expect(existsSync('src/assets/scene-clips-batch1-v1/proud-sparkle-v1.mp4')).toBe(false)
    const shipped: Record<string, string> = {
      'teleport-v1.mp4': 'f6807f32f8ee03de584379266db05943d8ca222cb8c63e9798011b746db1424e',
      'car-accelerate-v1.mp4': '73c3d1a2580d787dbabb189a58083a5b471229e90bf890f2c7a50e9c99ebc997',
      'race-start-v1.mp4': '6aba3c10adcec3c553629a53bfce622f1130da642419e88759cf5f25d6336205',
      'superhero-idle-v1.mp4': '909e5edd51bff67ee750a64d2caf6f51c901678c50e053c55d4c37e23517da43',
      'racer-idle-v2.mp4': '56599b7b346ce4510b5ce22d0dc9421a7d508d4944ddf733b792c1eabd005717',
      'uk-guard-v1.mp4': 'a6d7af205f7efb26738560ae60c18404e70c4ae3996770c25c1869323c3dadd2',
      'usa-eagle-v1.mp4': 'fea0d4c26aa09cc7a31cd8a902a9649b45b6d0664152cc2f3944556c99be3305',
      'france-eiffel-v1.mp4': '315b32843e5ce5f75a2fd07701a3b331838ed3085d835b8e34d5bc00379fe016',
      'egypt-pyramids-v1.mp4': '08b0e7172e5c3c0a6b8a2fddd6c3b2906b728ab7018d8a63e262b57d7998c21c',
      'japan-fuji-v2.mp4': 'e327d21f14acc52f310e5090961fb53cf94989e30b5ee71e4b649134b25b48d0',
      'australia-kangaroo-v1.mp4': 'b09752891b3d7972bf580565129c32ba67579785c6c97a0669d8a29acc235dd7',
    }
    for (const [name, sum] of Object.entries(shipped)) {
      expect(hash(`src/assets/scene-clips-batch2-v1/${name}`)).toBe(sum)
    }
    for (const name of ['sneeze-v2.mp4', 'giggle-fit-v2.mp4', 'wink-kiss-v2.mp4', 'ninja-idle-v2.mp4', 'ghost-idle-v2.mp4']) {
      expect(existsSync(`src/assets/scene-clips-batch1-v1/${name}`)).toBe(false)
      expect(existsSync(`src/assets/scene-clips-batch2-v1/${name}`)).toBe(false)
    }
  })

  it('keeps the festive window and the new-year wrap', () => {
    expect(inDateWindow(new Date(2026, 10, 11, 12), '2026-11-12', '2026-12-25')).toBe(false)
    expect(inDateWindow(new Date(2026, 10, 12, 0, 30), '2026-11-12', '2026-12-25')).toBe(true)
    expect(inDateWindow(new Date(2026, 11, 25, 23), '2026-11-12', '2026-12-25')).toBe(true)
    expect(inDateWindow(new Date(2026, 11, 26, 0, 10), '2026-11-12', '2026-12-25')).toBe(false)
    expect(inDateWindow(new Date(2026, 11, 26, 1), '12-26', '01-07', true)).toBe(true)
    expect(inDateWindow(new Date(2027, 0, 7, 18), '12-26', '01-07', true)).toBe(true)
    expect(inDateWindow(new Date(2027, 0, 8, 0), '12-26', '01-07', true)).toBe(false)
    expect(inDateWindow(new Date(2026, 6, 1), '12-26', '01-07', true)).toBe(false)
    const festive = previewDate(new Date(2026, 6, 1), 'festive')
    expect(seasonDue(festive, [])).toBe('christmas-hat')
    expect(seasonDue(festive, ['christmas-hat'])).toBe('halloween-pumpkin-boo')
    expect(seasonDue(festive, ['christmas-hat', 'halloween-pumpkin-boo'])).toBeNull()
    expect(seasonDue(previewDate(new Date(), 'new-year'), [])).toBe('new-year-fireworks')
  })

  it('plays morning once a day, goodnight once a session, and sleepy at night', () => {
    expect(morningDue(new Date(2026, 10, 12, 4, 59), null)).toBe(false)
    expect(morningDue(new Date(2026, 10, 12, 5, 0), null)).toBe(true)
    expect(morningDue(new Date(2026, 10, 12, 10, 59), '2026-11-11')).toBe(true)
    expect(morningDue(new Date(2026, 10, 12, 8, 0), '2026-11-12')).toBe(false)
    expect(morningDue(new Date(2026, 10, 12, 11, 0), null)).toBe(false)
    expect(goodnightDue(new Date(2026, 10, 12, 20, 59), false)).toBe(false)
    expect(goodnightDue(new Date(2026, 10, 12, 21, 0), false)).toBe(true)
    expect(goodnightDue(new Date(2026, 10, 12, 23, 0), true)).toBe(false)
    const night = chooseScheduledClip({
      ...base,
      date: new Date(2026, 10, 12, 23, 30),
      playedSeason: ['christmas-hat', 'halloween-pumpkin-boo'],
      goodnightPlayed: true,
    })
    expect(night).toBe('sleepy-doze')
    const cooled = chooseScheduledClip({
      ...base,
      date: new Date(2026, 10, 12, 23, 30),
      playedSeason: ['christmas-hat', 'halloween-pumpkin-boo'],
      goodnightPlayed: true,
      readyAt: { 'sleepy-doze': 20_000 },
    })
    expect(cooled).toBeNull()
  })

  it('does not repeat the same idle film immediately', () => {
    const first = nextIdleClip(null, 0)
    const second = nextIdleClip(first, 0)
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(second).not.toBe(first)
  })

  it('maps weather flags and car thresholds', () => {
    const rain = conditionsFromReading({ code: 61, temperatureC: 12, gustKmh: 10, isDay: true, previousPrecipMm: 0 })
    expect(weatherClipId(rain, {}, 0)).toBe('rain-umbrella')
    const snow = conditionsFromReading({ code: 73, temperatureC: -1, gustKmh: 50, isDay: false, previousPrecipMm: 1 })
    expect(snow.snow).toBe(true)
    expect(snow.windy).toBe(true)
    expect(weatherClipId(snow, {}, 0)).toBe('snow-day')
    const clear = conditionsFromReading({ code: 1, temperatureC: 18, gustKmh: 5, isDay: true, previousPrecipMm: 0.4 })
    expect(clear.clearing).toBe(true)
    expect(weatherClipId(clear, {}, 0)).toBe('rainbow')
    const hot = conditionsFromReading({ code: 0, temperatureC: 28, gustKmh: 10, isDay: true, previousPrecipMm: 0 })
    expect(weatherClipId(hot, {}, 0)).toBe('hot-day-melt')
    const wind = conditionsFromOverride('windy')
    expect(wind && weatherClipId(wind, {}, 0)).toBe('windy-gust')
    expect(weatherClipId(rain, { 'rain-umbrella': 50_000 }, 1_000)).toBeNull()
    expect(classifyCarMotion(CAR_BUMP_MAG, 0)).toBe('bump')
    expect(classifyCarMotion(CAR_BUMP_MAG, 0.2)).toBe('bump')
    expect(classifyCarMotion(4, CAR_TURN_LATERAL)).toBe('turn')
    expect(classifyCarMotion(4, 0.2)).toBeNull()
    expect(jamDue(CAR_JAM_MS - 1)).toBe(false)
    expect(jamDue(CAR_JAM_MS)).toBe(true)
    expect(driveWasReal(CAR_DRIVE_MIN_MS, true)).toBe(true)
    expect(driveWasReal(CAR_DRIVE_MIN_MS, false)).toBe(false)
    expect(carClipFor('bump', {}, 50_000, 0, 0)).toBe('speed-bump-bounce')
    expect(carClipFor('bump', {}, 50_000, 40_000, 0)).toBeNull()
    expect(carClipFor('tunnel', {}, 10_000, 0, 10_001)).toBeNull()
  })

  it('cancels on interaction and waits 4s before idle or random films', () => {
    expect(TOUCH_SUPPRESS_MS).toBe(4_000)
    const playing = { guard: 'batch' as const, suppressUntil: 0 }
    const touched = noteInteraction(playing, 1_000, false)
    expect(touched.cancel).toBe(true)
    expect(touched.hold.guard).toBeNull()
    expect(touched.hold.suppressUntil).toBe(5_000)
    expect(idleBlocked(touched.hold.suppressUntil, 4_999)).toBe(true)
    expect(idleBlocked(touched.hold.suppressUntil, 5_000)).toBe(false)
    const gallery = noteInteraction(playing, 1_000, true)
    expect(gallery.cancel).toBe(false)
    expect(gallery.hold.guard).toBe('batch')
    expect(carClipFor('tunnel', {}, 10_000, 0, 10_000)).toBeNull()
    expect(carClipFor('bump', {}, 50_000, 0, 50_000)).toBe('speed-bump-bounce')
  })

  it('does not schedule a film over rush or when motion is reduced', () => {
    const date = new Date(2026, 10, 12, 8, 0)
    expect(chooseScheduledClip({ ...base, date, morningStored: null, guard: 'rush' })).toBeNull()
    expect(chooseScheduledClip({ ...base, date, morningStored: null, reduced: true })).toBeNull()
    expect(chooseScheduledClip({ ...base, date, morningStored: null })).toBe('good-morning')
  })

  it('weights idle picks toward clips and keeps reduced motion coded', () => {
    expect(IDLE_CLIP_WEIGHT).toBe(0.8)
    let clips = 0
    const picks = 1_000
    let previous: string | null = null
    for (let i = 0; i < picks; i += 1) {
      const action = chooseIdleAction(i / picks, false, previous, (i * 17) % 100 / 100)
      if (action.kind === 'clip') {
        clips += 1
        expect(action.id).not.toBe(previous)
        previous = action.id
      } else previous = null
    }
    expect(clips).toBe(800)
    for (let i = 0; i < 40; i += 1) {
      expect(chooseIdleAction(i / 40, true, null, 0.2)).toEqual({ kind: 'coded' })
    }
    const first = chooseIdleAction(0, false, null, 0)
    const second = chooseIdleAction(0, false, first.kind === 'clip' ? first.id : null, 0)
    expect(first.kind).toBe('clip')
    expect(second.kind).toBe('clip')
    if (first.kind === 'clip' && second.kind === 'clip') expect(second.id).not.toBe(first.id)
  })

  it('defaults the idle gap to 5s, rejects bad values, and waits that long for both kinds', () => {
    expect(IDLE_GAP_DEFAULT_S).toBe(5)
    expect(clampIdleGapSeconds(undefined)).toBe(5)
    expect(clampIdleGapSeconds('nope')).toBe(5)
    expect(clampIdleGapSeconds(2)).toBe(5)
    expect(clampIdleGapSeconds(61)).toBe(5)
    expect(clampIdleGapSeconds(8)).toBe(8)
    expect(idleGapSecondsFromStorage(null)).toBe(5)
    expect(idleGapSecondsFromStorage('')).toBe(5)
    expect(idleGapSecondsFromStorage('not-json')).toBe(5)
    expect(idleGapSecondsFromStorage('{"seconds":2}')).toBe(5)
    expect(idleGapSecondsFromStorage(idleGapToStorage(12))).toBe(12)
    expect(idleGapSecondsFromStorage(idleGapToStorage(100))).toBe(5)
    expect(idleGapMs(5)).toBe(5_000)
    expect(idleWaitMs(5_000, false)).toBe(5_000)
    expect(idleWaitMs(60_000, false)).toBe(60_000)
    expect(idleWaitMs(60_000, true)).toBe(IDLE_FIRST_DELAY_MS)
    expect(idleWaitMs(3_000, true)).toBe(3_000)
    const gap = 12_000
    expect(advanceIdleWait({ elapsed: 11_000, first: false }, 999, gap, 0, 20_000).due).toBe(false)
    const clipWait = advanceIdleWait({ elapsed: 11_000, first: false }, 1_000, gap, 0, 20_000)
    const codedWait = advanceIdleWait({ elapsed: 11_000, first: false }, 1_000, gap, 0, 20_000)
    expect(clipWait.due).toBe(true)
    expect(codedWait.due).toBe(true)
    expect(chooseIdleAction(0.1, false, null, 0.3).kind).toBe('clip')
    expect(chooseIdleAction(0.9, false, null, 0.3).kind).toBe('coded')
    const cooled = advanceIdleWait({ elapsed: 9_000, first: false }, 1_000, gap, 20_000, 10_000)
    expect(cooled).toEqual({ clock: { elapsed: 0, first: true }, due: false })
    expect(advanceIdleWait(cooled.clock, IDLE_FIRST_DELAY_MS, 60_000, 0, 30_000).due).toBe(true)
    expect(advanceIdleWait(cooled.clock, IDLE_FIRST_DELAY_MS - 1, 60_000, 0, 30_000).due).toBe(false)
  })
})
