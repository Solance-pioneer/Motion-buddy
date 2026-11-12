export const SPEECH_COOLDOWN_MS = 8_000
export const SPEECH_VISIBLE_MS = 2_000

export const SHAKE_LINES = ["What's shaking?", 'Stop waving me around!'] as const
export const PET_LINES = ['Head scritches!', 'I love being petted!'] as const

export type SpeechKind = 'shake' | 'pet'

export interface SpeechClock {
  readyAt: number
  showingUntil: number
  lastShake: string | null
  lastPet: string | null
}

export function initialSpeechClock(): SpeechClock {
  return { readyAt: 0, showingUntil: 0, lastShake: null, lastPet: null }
}

/** Missing or unreadable storage means bubbles are on. */
export function speechEnabledFromStorage(raw: string | null): boolean {
  if (!raw) return true
  try {
    const parsed = JSON.parse(raw) as { enabled?: unknown }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.enabled !== 'boolean') return true
    return parsed.enabled
  } catch {
    return true
  }
}

export function speechToStorage(enabled: boolean): string {
  return JSON.stringify({ enabled })
}

export function pickSpeechLine(lines: readonly string[], previous: string | null, random: number): string {
  const start = Math.abs(Math.floor(random * lines.length)) % lines.length
  for (let step = 0; step < lines.length; step += 1) {
    const line = lines[(start + step) % lines.length]
    if (line !== previous) return line ?? lines[0] ?? ''
  }
  return lines[0] ?? ''
}

/**
 * One bubble at a time, then a cooldown. A line that is still up blocks the next,
 * and so does the cooldown after it has faded. Off leaves the clock untouched.
 */
export function offerSpeech(
  clock: SpeechClock,
  kind: SpeechKind,
  now: number,
  enabled: boolean,
  random: number,
): { clock: SpeechClock; line: string | null } {
  if (!enabled) return { clock, line: null }
  if (now < clock.showingUntil || now < clock.readyAt) return { clock, line: null }
  const lines = kind === 'shake' ? SHAKE_LINES : PET_LINES
  const previous = kind === 'shake' ? clock.lastShake : clock.lastPet
  const line = pickSpeechLine(lines, previous, random)
  return {
    line,
    clock: {
      readyAt: now + SPEECH_COOLDOWN_MS,
      showingUntil: now + SPEECH_VISIBLE_MS,
      lastShake: kind === 'shake' ? line : clock.lastShake,
      lastPet: kind === 'pet' ? line : clock.lastPet,
    },
  }
}
