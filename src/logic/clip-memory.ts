const MORNING_KEY = 'mb-morning-day'
const WEATHER_KEY = 'mb-weather-moods'

/** The only stored value is the local date, such as 2026-11-12. */
export function readMorningDay(): string | null {
  try {
    const value = localStorage.getItem(MORNING_KEY)
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
  } catch {
    return null
  }
}

export function writeMorningDay(ymd: string): void {
  try {
    localStorage.setItem(MORNING_KEY, ymd)
  } catch {
    // The greeting can play again next launch if storage is blocked.
  }
}

export function readWeatherMoods(): boolean {
  try {
    return localStorage.getItem(WEATHER_KEY) === '1'
  } catch {
    return false
  }
}

export function writeWeatherMoods(on: boolean): void {
  try {
    localStorage.setItem(WEATHER_KEY, on ? '1' : '0')
  } catch {
    // The switch still applies until the page closes.
  }
}
