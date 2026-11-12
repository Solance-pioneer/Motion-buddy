import { idleBlocked, type ClipGuard } from './clip-table.ts'

/** Clip 33. A native battery provider can replace the web one later. */
export const LOW_BATTERY_CLIP_ID = 'low-battery-recharge'

/** Armed and below this, while unplugged, requests the clip once. */
export const LOW_BATTERY_LEVEL = 0.2

/** Above this, or any time charging is true, the request may arm again. */
export const LOW_BATTERY_REARM_LEVEL = 0.25

export interface BatterySample {
  level: number
  charging: boolean
}

/**
 * Same shape of seam as WeatherProvider. The web build uses the Battery Status
 * API. An iOS or Android shell can pass its own provider. No UI lives here.
 */
export interface BatteryProvider {
  isSupported(): boolean
  subscribe(cb: (sample: BatterySample) => void): () => void
}

export interface BatteryClock {
  armed: boolean
  /** Requested, and still waiting for a free idle slot. */
  pending: boolean
}

export function initialBatteryClock(): BatteryClock {
  return { armed: true, pending: false }
}

function usableSample(sample: BatterySample): boolean {
  return Number.isFinite(sample.level) && sample.level >= 0 && sample.level <= 1 && typeof sample.charging === 'boolean'
}

/**
 * Armed at the start of a session, including when the first reading is already low.
 * One request while low and unplugged, then disarmed until charging or a recovery above 25%.
 */
export function stepBattery(clock: BatteryClock, sample: BatterySample): BatteryClock {
  if (!usableSample(sample)) return clock
  let next = clock
  const low = sample.level < LOW_BATTERY_LEVEL && !sample.charging
  if (low && next.armed && !next.pending) next = { armed: false, pending: true }
  const rearm = sample.charging || sample.level > LOW_BATTERY_REARM_LEVEL
  if (rearm) next = { ...next, armed: true }
  return next
}

export interface BatterySlot {
  reduced: boolean
  guard: ClipGuard
  touching: boolean
  suppressUntil: number
  now: number
  unlocked: boolean
}

/**
 * Interaction, the 4s touch cooldown, and a clip already playing hold the request.
 * Reduced motion drops it. A locked tier does not play it. Mute is not a reason
 * to skip: the shared clip start stays silent when sound is off.
 */
export function takeLowBatteryClip(clock: BatteryClock, slot: BatterySlot): { clock: BatteryClock; id: string | null } {
  if (!clock.pending) return { clock, id: null }
  if (slot.reduced) return { clock: { ...clock, pending: false }, id: null }
  if (!slot.unlocked) return { clock, id: null }
  if (slot.touching || slot.guard != null || idleBlocked(slot.suppressUntil, slot.now)) return { clock, id: null }
  return { clock: { ...clock, pending: false }, id: LOW_BATTERY_CLIP_ID }
}

/** Unsupported providers, and a throw from a provider, subscribe to nothing. */
export function watchBattery(provider: BatteryProvider, onSample: (sample: BatterySample) => void): () => void {
  try {
    if (!provider.isSupported()) return () => {}
    return provider.subscribe(onSample)
  } catch {
    return () => {}
  }
}

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

function batteryGetter(): (() => Promise<BatteryManager>) | null {
  if (typeof navigator === 'undefined') return null
  const getter = (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }).getBattery
  return typeof getter === 'function' ? getter.bind(navigator) : null
}

/** Feature-detected Battery Status API. Missing or rejected APIs stay silent. */
export const webBatteryProvider: BatteryProvider = {
  isSupported() {
    return batteryGetter() != null
  },
  subscribe(cb) {
    const getter = batteryGetter()
    if (!getter) return () => {}
    let stopped = false
    let manager: BatteryManager | null = null
    const emit = () => {
      if (!manager || stopped) return
      cb({ level: manager.level, charging: manager.charging })
    }
    void getter().then((battery) => {
      if (stopped) return
      manager = battery
      battery.addEventListener('levelchange', emit)
      battery.addEventListener('chargingchange', emit)
      emit()
    }).catch(() => {
      // iOS Safari and desktop Firefox have no Battery Status API.
    })
    return () => {
      stopped = true
      if (!manager) return
      manager.removeEventListener('levelchange', emit)
      manager.removeEventListener('chargingchange', emit)
    }
  },
}
