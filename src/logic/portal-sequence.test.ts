import { describe, expect, it } from 'vitest'
import { portalPlan } from './clip-table.ts'
import {
  PORTAL_BACK_MS,
  PORTAL_BEFORE,
  PORTAL_OUT_MS,
  PORTAL_REDUCED_MS,
  peekCountry,
  portalArrival,
  portalBackMs,
  portalBusy,
  portalOutMs,
  portalSchedule,
  portalSoundAllowed,
  preloadTarget,
  samplePortalBack,
  samplePortalOut,
} from './portal-sequence.ts'

describe('portal sequence', () => {
  it('starts the country at the outward peak and comes home the same way', () => {
    const full = portalSchedule(false)
    const quiet = portalSchedule(true)
    expect(full.effectStart).toBe(0)
    expect(full.countryStart).toBe(full.peak)
    expect(full.peak).toBe(PORTAL_OUT_MS)
    expect(full.returnStartAfterScene).toBe(0)
    expect(full.returnMs).toBe(PORTAL_BACK_MS)
    expect(quiet.peak).toBe(PORTAL_REDUCED_MS)
    expect(quiet.returnMs).toBe(PORTAL_REDUCED_MS)
    expect(full.countryStart).toBeLessThan(PORTAL_BEFORE.teleportFilmMs)
    expect(PORTAL_BEFORE.returnMs).toBe(0)

    const flash = samplePortalOut(PORTAL_OUT_MS * 0.25, false)
    const gone = samplePortalOut(PORTAL_OUT_MS, false)
    expect(samplePortalOut(0, false).scale).toBe(1)
    expect(flash.bolt).toBeGreaterThan(gone.bolt)
    expect(flash.scale).toBeGreaterThan(0)
    expect(gone.scale).toBe(0)
    expect(gone.arrived).toBe(true)
    expect(samplePortalOut(PORTAL_OUT_MS - 1, false).arrived).toBe(false)

    expect(samplePortalBack(0, false).scale).toBe(0)
    expect(samplePortalBack(PORTAL_BACK_MS / 2, false).scale).toBeCloseTo(0.5)
    expect(samplePortalBack(PORTAL_BACK_MS, false)).toMatchObject({ scale: 1, done: true, bolt: 0 })
    expect(portalOutMs(false)).toBe(PORTAL_OUT_MS)
    expect(portalBackMs(true)).toBe(PORTAL_REDUCED_MS)
  })

  it('crossfades under reduced motion and does not shrink', () => {
    expect(samplePortalOut(0, true).scale).toBe(1)
    expect(samplePortalOut(PORTAL_REDUCED_MS, true)).toMatchObject({ scale: 1, arrived: true, bolt: 0 })
    expect(samplePortalOut(0, true).bolt).toBeGreaterThan(samplePortalOut(PORTAL_REDUCED_MS / 2, true).bolt)
    expect(samplePortalBack(0, true).scale).toBe(1)
    expect(samplePortalBack(PORTAL_REDUCED_MS, true).done).toBe(true)
    expect(portalPlan('japan_bow', true)).toEqual({ effect: null, countryClip: null, coded: true })
    expect(portalArrival(true, true, 'uk-guard')).toEqual({ countryClip: null, coded: true })
  })

  it('preloads the next country and uses a warm film only when it is ready', () => {
    expect(preloadTarget(0)).toEqual({ key: 'uk_guard', id: 'uk-guard', file: 'uk-guard-v1.mp4' })
    expect(preloadTarget(1)).toMatchObject({ key: 'france_cafe', file: 'france-eiffel-v1.mp4' })
    expect(preloadTarget(5).key).toBe('australia_hop')
    expect(peekCountry(6)).toBe('uk_guard')
    expect(portalPlan('uk_guard', false)).toEqual({ effect: 'teleport', countryClip: 'uk-guard', coded: false })
    expect(portalArrival(false, true, 'uk-guard')).toEqual({ countryClip: 'uk-guard', coded: false })
    expect(portalArrival(false, false, 'uk-guard')).toEqual({ countryClip: null, coded: true })
    expect(portalArrival(false, true, null)).toEqual({ countryClip: null, coded: true })
  })

  it('stays locked while a scene, a clip, or the portal itself is busy, and obeys mute', () => {
    const open = { scene: false, waiting: false, contact: false, asking: false, guard: false, portaling: false }
    expect(portalBusy(open)).toBe(false)
    expect(portalBusy({ ...open, scene: true })).toBe(true)
    expect(portalBusy({ ...open, waiting: true })).toBe(true)
    expect(portalBusy({ ...open, contact: true })).toBe(true)
    expect(portalBusy({ ...open, asking: true })).toBe(true)
    expect(portalBusy({ ...open, guard: true })).toBe(true)
    expect(portalBusy({ ...open, portaling: true })).toBe(true)
    expect(portalSoundAllowed({ muted: false, unlocked: true, soundOn: true })).toBe(true)
    expect(portalSoundAllowed({ muted: true, unlocked: true, soundOn: true })).toBe(false)
    expect(portalSoundAllowed({ muted: false, unlocked: false, soundOn: true })).toBe(false)
    expect(portalSoundAllowed({ muted: false, unlocked: true, soundOn: false })).toBe(false)
  })
})
