import { describe, expect, it } from 'vitest'
import { conditionsFromOverride, conditionsFromReading } from './weather/conditions.ts'
import {
  CAR_BUMP_MAG,
  CAR_DRIVE_MIN_MS,
  CAR_JAM_MS,
  CAR_TURN_LATERAL,
  CLIP_ROWS,
  TOUCH_SUPPRESS_MS,
  carClipFor,
  chooseScheduledClip,
  classifyCarMotion,
  driveWasReal,
  goodnightDue,
  idleBlocked,
  inDateWindow,
  jamDue,
  morningDue,
  nextIdleClip,
  noteInteraction,
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
  it('lists all 38 films', () => {
    expect(CLIP_ROWS).toHaveLength(38)
    expect(new Set(CLIP_ROWS.map((row) => row.number)).size).toBe(38)
    expect(CLIP_ROWS.find((row) => row.id === 'birthday-cake')?.trigger).toBe('none')
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
})
