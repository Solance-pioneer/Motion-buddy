import type { WeatherConditions } from './types.ts'

export const HOT_C = 28
export const GUST_KMH = 40

export interface WeatherReading {
  code: number
  temperatureC: number
  gustKmh: number
  isDay: boolean
  previousPrecipMm: number
}

function snowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86
}

function rainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95
}

/** Map a provider reading onto the flags the clip table understands. */
export function conditionsFromReading(reading: WeatherReading): WeatherConditions {
  const snow = snowCode(reading.code)
  const rain = !snow && rainCode(reading.code)
  return {
    rain,
    snow,
    clearing: reading.previousPrecipMm > 0 && !rain && !snow && reading.isDay,
    hot: reading.temperatureC >= HOT_C,
    windy: reading.gustKmh >= GUST_KMH,
    isDay: reading.isDay,
    raw: {
      code: reading.code,
      temperatureC: reading.temperatureC,
      gustKmh: reading.gustKmh,
      previousPrecipMm: reading.previousPrecipMm,
    },
  }
}

export type WeatherOverride = 'none' | 'rain' | 'snow' | 'rainbow' | 'hot' | 'windy'

/** Gallery preview. This is the same normalised shape a provider returns. */
export function conditionsFromOverride(override: WeatherOverride): WeatherConditions | null {
  if (override === 'none') return null
  const blank: WeatherConditions = { rain: false, snow: false, clearing: false, hot: false, windy: false, isDay: true }
  if (override === 'rain') return { ...blank, rain: true }
  if (override === 'snow') return { ...blank, snow: true }
  if (override === 'rainbow') return { ...blank, clearing: true }
  if (override === 'hot') return { ...blank, hot: true }
  return { ...blank, windy: true }
}
