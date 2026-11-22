import { clipById, portalPlan, type CountryClip } from './clip-table.ts'
import { COUNTRY_ORDER, type CountryKey } from './countries.ts'

/**
 * Measured before this sequence. The teleport film played to the end, faded,
 * and only then could a country start. The bolt, when the coded path ran at
 * all, peaked at 30% of a 280ms lead. Coming home was instant.
 */
export const PORTAL_BEFORE = {
  teleportFilmMs: 6_042,
  clipFadeMs: 150,
  codedLeadMs: 280,
  codedLeadReducedMs: 420,
  boltPeakMs: 84,
  returnMs: 0,
} as const

/** Shrink and flash. The country starts when this ends. */
export const PORTAL_OUT_MS = 220
/** Grow back from a point after the country. */
export const PORTAL_BACK_MS = 220
/** Reduced motion is a crossfade and does not shrink. */
export const PORTAL_REDUCED_MS = 120

export interface PortalPose {
  scale: number
  bolt: number
  arrived: boolean
  done: boolean
}

export interface PortalSchedule {
  effectStart: number
  peak: number
  countryStart: number
  returnStartAfterScene: number
  returnMs: number
}

export function portalOutMs(reduced: boolean): number {
  return reduced ? PORTAL_REDUCED_MS : PORTAL_OUT_MS
}

export function portalBackMs(reduced: boolean): number {
  return reduced ? PORTAL_REDUCED_MS : PORTAL_BACK_MS
}

/** Press is 0. The country frame is the same instant as the outward peak. */
export function portalSchedule(reduced: boolean): PortalSchedule {
  const peak = portalOutMs(reduced)
  return {
    effectStart: 0,
    peak,
    countryStart: peak,
    returnStartAfterScene: 0,
    returnMs: portalBackMs(reduced),
  }
}

export function samplePortalOut(elapsed: number, reduced: boolean): PortalPose {
  const limit = portalOutMs(reduced)
  const u = Math.max(0, Math.min(1, elapsed / limit))
  if (reduced) return { scale: 1, bolt: 1 - u, arrived: elapsed >= limit, done: false }
  const bolt = u < 0.25 ? 0.35 + 0.65 * (u / 0.25) : Math.max(0, 1 - (u - 0.25) / 0.75)
  return { scale: Math.max(0, 1 - u), bolt, arrived: elapsed >= limit, done: false }
}

export function samplePortalBack(elapsed: number, reduced: boolean): PortalPose {
  const limit = portalBackMs(reduced)
  const u = Math.max(0, Math.min(1, elapsed / limit))
  if (reduced) return { scale: 1, bolt: 1 - u, arrived: false, done: elapsed >= limit }
  return { scale: u, bolt: 1 - u, arrived: false, done: elapsed >= limit }
}

export function peekCountry(cursor: number): CountryKey {
  const index = ((cursor % COUNTRY_ORDER.length) + COUNTRY_ORDER.length) % COUNTRY_ORDER.length
  return COUNTRY_ORDER[index]
}

export function preloadTarget(cursor: number): { key: CountryKey; id: string | null; file: string | null } {
  const key = peekCountry(cursor)
  const plan = portalPlan(key as CountryClip, false)
  const row = plan.countryClip ? clipById(plan.countryClip) : undefined
  return { key, id: plan.countryClip, file: row?.file ?? null }
}

/** A warm country film plays. Anything else, including reduced motion, is the coded scene at the peak. */
export function portalArrival(reduced: boolean, clipReady: boolean, clipId: string | null): { countryClip: string | null; coded: boolean } {
  if (!reduced && clipReady && clipId) return { countryClip: clipId, coded: false }
  return { countryClip: null, coded: true }
}

export function portalBusy(input: { scene: boolean; waiting: boolean; contact: boolean; asking: boolean; guard: boolean; portaling: boolean }): boolean {
  return input.scene || input.waiting || input.contact || input.asking || input.guard || input.portaling
}

export function portalSoundAllowed(input: { muted: boolean; unlocked: boolean; soundOn: boolean }): boolean {
  return input.soundOn && !input.muted && input.unlocked
}
