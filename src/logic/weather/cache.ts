import { openMeteoProvider } from './open-meteo.ts'
import type { WeatherConditions, WeatherProvider } from './types.ts'

const HOUR_MS = 3_600_000
const CACHE_KEY = 'mb-weather-hour'

interface CacheEntry {
  at: number
  lat: number
  lon: number
  conditions: WeatherConditions
}

let memory: CacheEntry | null = null

function readSession(lat: number, lon: number, now: number): WeatherConditions | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as CacheEntry
    if (saved.lat !== lat || saved.lon !== lon || now - saved.at >= HOUR_MS) return null
    memory = saved
    return saved.conditions
  } catch {
    return null
  }
}

/** One hour in memory and session storage. A failure returns null and shows nothing. */
export async function loadConditions(
  lat: number,
  lon: number,
  provider: WeatherProvider = openMeteoProvider,
  now = Date.now(),
): Promise<WeatherConditions | null> {
  if (memory && memory.lat === lat && memory.lon === lon && now - memory.at < HOUR_MS) return memory.conditions
  const cached = readSession(lat, lon, now)
  if (cached) return cached
  try {
    const conditions = await provider.read(lat, lon)
    if (!conditions) return null
    memory = { at: now, lat, lon, conditions }
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(memory))
    } catch {
      // Session storage can be blocked. The memory cache still holds this hour.
    }
    return conditions
  } catch {
    return null
  }
}
