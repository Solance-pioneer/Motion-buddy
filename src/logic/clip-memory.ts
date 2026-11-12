import { ADMIN_KEY, adminFromStorage, adminToStorage } from './admin-flag.ts'
import { idlePrefsFromStorage, idlePrefsToStorage, IDLE_PREFS_KEY, type IdlePrefs } from './idle-prefs.ts'
import { themeFromStorage, type ThemeId } from './themes.ts'
import type { BeatFeel } from './beat.ts'
import { genreFromStorage, headbangFromStorage, type GenreId, type HeadbangSpeed } from './genres.ts'
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

export function readAdminEnabled(): boolean {
  try {
    return adminFromStorage(localStorage.getItem(ADMIN_KEY))
  } catch {
    return false
  }
}

export function writeAdminEnabled(on: boolean): void {
  try {
    localStorage.setItem(ADMIN_KEY, adminToStorage(on))
  } catch {
    // The flag still applies until the page closes.
  }
}

export function readIdlePrefs(): IdlePrefs {
  try {
    return idlePrefsFromStorage(localStorage.getItem(IDLE_PREFS_KEY))
  } catch {
    return { off: [] }
  }
}

export const THEME_KEY = 'motion-buddy-theme-v1'

export function readTheme(): ThemeId {
  try {
    return themeFromStorage(localStorage.getItem(THEME_KEY))
  } catch {
    return 'plain'
  }
}

export const BEAT_KEY = 'motion-buddy-beat-v1'
export const GENRE_KEY = 'motion-buddy-genre-v1'

export function readBeatFeel(): { on: boolean; feel: BeatFeel } {
  try {
    const raw = localStorage.getItem(BEAT_KEY)
    if (!raw) return { on: false, feel: 'steady' }
    const parsed = JSON.parse(raw) as { on?: unknown; feel?: unknown }
    return { on: parsed.on === true, feel: parsed.feel === 'party' ? 'party' : 'steady' }
  } catch {
    return { on: false, feel: 'steady' }
  }
}

export function writeBeatFeel(on: boolean, feel: BeatFeel): void {
  try {
    localStorage.setItem(BEAT_KEY, JSON.stringify({ on, feel }))
  } catch {
    // The switch still applies until the page closes.
  }
}

export function readGenre(): GenreId {
  try {
    return genreFromStorage(localStorage.getItem(GENRE_KEY))
  } catch {
    return 'none'
  }
}

export const HEADBANG_KEY = 'motion-buddy-headbang-v1'

export function readHeadbang(): HeadbangSpeed {
  try {
    return headbangFromStorage(localStorage.getItem(HEADBANG_KEY))
  } catch {
    return 'medium'
  }
}

export function writeHeadbang(speed: HeadbangSpeed): void {
  try {
    localStorage.setItem(HEADBANG_KEY, speed)
  } catch {
    // The choice still applies until the page closes.
  }
}

export function writeGenre(id: GenreId): void {
  try {
    localStorage.setItem(GENRE_KEY, id)
  } catch {
    // The choice still applies until the page closes.
  }
}

export function writeTheme(id: ThemeId): void {
  try {
    localStorage.setItem(THEME_KEY, id)
  } catch {
    // The choice still applies until the page closes.
  }
}

export function writeIdlePrefs(prefs: IdlePrefs): void {
  try {
    localStorage.setItem(IDLE_PREFS_KEY, idlePrefsToStorage(prefs))
  } catch {
    // The switches still apply until the page closes.
  }
}
