/** CoMiGo gentle one-shots. Cooldowns are the supplied suggestions. */
export const BLEEP_COOLDOWN_MS = {
  tap: 300,
  blink: 1_000,
  idle: 8_000,
  ack: 600,
} as const

export type BleepRole = keyof typeof BLEEP_COOLDOWN_MS

export interface BleepClock {
  last: Partial<Record<BleepRole, number>>
}

export function initialBleepClock(): BleepClock {
  return { last: {} }
}

/** A muted, locked, or busy moment does not spend the cooldown. */
export function allowBleep(
  clock: BleepClock,
  role: BleepRole,
  now: number,
  access: { muted: boolean; unlocked: boolean; busy: boolean },
): { clock: BleepClock; ok: boolean } {
  if (access.muted || !access.unlocked || access.busy) return { clock, ok: false }
  const last = clock.last[role]
  if (last != null && now - last < BLEEP_COOLDOWN_MS[role]) return { clock, ok: false }
  return { clock: { last: { ...clock.last, [role]: now } }, ok: true }
}
