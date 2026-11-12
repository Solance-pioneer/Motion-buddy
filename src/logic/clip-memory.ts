import { idleGapSecondsFromStorage, idleGapToStorage, IDLE_GAP_DEFAULT_S } from './clip-table.ts'
import { speechEnabledFromStorage, speechToStorage } from './speech.ts'

const MORNING_KEY = 'mb-morning-day'
const WEATHER_KEY = 'mb-weather-moods'

/** JSON `{ seconds }` , same pattern as the remembered mute record. */
export const IDLE_GAP_KEY = 'motion-buddy-idle-gap-v1'

/** JSON `{ enabled }`. Missing storage means bubbles are on. */
export const SPEECH_KEY = 'motion-buddy-speech-v1'

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

export function readIdleGapSeconds(): number {
  try {
    return idleGapSecondsFromStorage(localStorage.getItem(IDLE_GAP_KEY))
  } catch {
    return IDLE_GAP_DEFAULT_S
  }
}

export function writeIdleGapSeconds(seconds: number): void {
  try {
    localStorage.setItem(IDLE_GAP_KEY, idleGapToStorage(seconds))
  } catch {
    // The slider still applies until the page closes.
  }
}

export function readSpeechEnabled(): boolean {
  try {
    return speechEnabledFromStorage(localStorage.getItem(SPEECH_KEY))
  } catch {
    return true
  }
}

export function writeSpeechEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SPEECH_KEY, speechToStorage(enabled))
  } catch {
    // The switch still applies until the page closes.
  }
}
