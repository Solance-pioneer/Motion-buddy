import { conditionsFromReading } from './conditions.ts'
import type { WeatherConditions, WeatherProvider } from './types.ts'

function numberAt(value: unknown, index = 0): number {
  if (!Array.isArray(value)) return 0
  const item = value[index]
  return typeof item === 'number' && Number.isFinite(item) ? item : 0
}

export function conditionsFromOpenMeteo(body: unknown): WeatherConditions | null {
  if (!body || typeof body !== 'object') return null
  const record = body as {
    current?: { weather_code?: unknown; temperature_2m?: unknown; wind_gusts_10m?: unknown; is_day?: unknown }
    hourly?: { precipitation?: unknown }
  }
  const current = record.current
  if (!current || typeof current.weather_code !== 'number' || typeof current.temperature_2m !== 'number') return null
  const gust = typeof current.wind_gusts_10m === 'number' ? current.wind_gusts_10m : 0
  return conditionsFromReading({
    code: current.weather_code,
    temperatureC: current.temperature_2m,
    gustKmh: gust,
    isDay: current.is_day !== 0,
    previousPrecipMm: numberAt(record.hourly?.precipitation, 0),
  })
}

/** Open-Meteo is the only provider in this build. */
export const openMeteoProvider: WeatherProvider = {
  id: 'open-meteo',
  async read(lat: number, lon: number): Promise<WeatherConditions | null> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'weather_code,temperature_2m,wind_gusts_10m,is_day',
      hourly: 'precipitation',
      past_hours: '1',
      forecast_hours: '1',
      timezone: 'auto',
    })
    // The weather provider is swappable.
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!response.ok) return null
    return conditionsFromOpenMeteo(await response.json())
  },
}
