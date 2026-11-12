/** Short synthesized cues. One place for the gaps and the mix with WAV/bleep cues. */
export const SYNTH_CUES = ['blink', 'curious', 'happy', 'movement'] as const
export type SynthCue = (typeof SYNTH_CUES)[number]

export const SYNTH_COOLDOWN_MS: Record<SynthCue, number> = {
  blink: 8_000,
  curious: 10_000,
  happy: 10_000,
  movement: 6_000,
}

/** When a WAV or bleep already owns the trigger, the synth takes about one turn in three. */
export const SYNTH_EVERY = 3

/** Nothing else starts while this cue is still the one sounding. */
export const SYNTH_GUARD_MS = 350

export interface SynthClock {
  seen: Record<SynthCue, number>
  last: Record<SynthCue, number>
  busyUntil: number
}

export function initialSynthClock(): SynthClock {
  return {
    seen: { blink: 0, curious: 0, happy: 0, movement: 0 },
    last: { blink: -1_000_000, curious: -1_000_000, happy: -1_000_000, movement: -1_000_000 },
    busyUntil: 0,
  }
}

export function isSynthCue(kind: string): kind is SynthCue {
  return (SYNTH_CUES as readonly string[]).includes(kind)
}

/**
 * One sound for a trigger. A shared trigger alternates toward the existing cue:
 * the synth plays on every third one, and only after its own cooldown.
 * Reduced motion keeps the existing cue and does not add a synth.
 * Mute, a locked gate, a busy guard, or a blocked moment (a clip, or a touch) plays nothing new.
 */
export function chooseSynthCue(
  clock: SynthClock,
  input: {
    cue: SynthCue
    now: number
    hasExisting: boolean
    reduced: boolean
    muted: boolean
    unlocked: boolean
    blocked: boolean
  },
): { clock: SynthClock; choice: 'synth' | 'existing' | 'none' } {
  if (input.muted || !input.unlocked) return { clock, choice: 'none' }
  if (input.reduced || input.blocked) return { clock, choice: input.hasExisting ? 'existing' : 'none' }
  if (input.now < clock.busyUntil) return { clock, choice: 'none' }
  const cooled = input.now - clock.last[input.cue] >= SYNTH_COOLDOWN_MS[input.cue]
  if (input.hasExisting) {
    const seen = clock.seen[input.cue] + 1
    const next = { ...clock, seen: { ...clock.seen, [input.cue]: seen }, busyUntil: input.now + SYNTH_GUARD_MS }
    if (seen % SYNTH_EVERY === 0 && cooled) {
      return { clock: { ...next, last: { ...clock.last, [input.cue]: input.now } }, choice: 'synth' }
    }
    return { clock: next, choice: 'existing' }
  }
  if (!cooled) return { clock, choice: 'none' }
  return {
    clock: {
      ...clock,
      last: { ...clock.last, [input.cue]: input.now },
      busyUntil: input.now + SYNTH_GUARD_MS,
    },
    choice: 'synth',
  }
}
