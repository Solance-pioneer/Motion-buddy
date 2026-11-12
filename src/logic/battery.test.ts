import { describe, expect, it } from 'vitest'
import { clipMayUnmute, clipShouldStartMuted } from './clip-playback.ts'
import { clipById } from './clip-table.ts'
import {
  LOW_BATTERY_CLIP_ID,
  initialBatteryClock,
  stepBattery,
  takeLowBatteryClip,
  watchBattery,
  webBatteryProvider,
  type BatteryProvider,
  type BatterySlot,
} from './battery.ts'

const open: BatterySlot = {
  reduced: false,
  guard: null,
  touching: false,
  suppressUntil: 0,
  now: 10_000,
  unlocked: true,
}

describe('low battery clip', () => {
  it('fires once when the level crosses under 20% and not again while it stays low', () => {
    expect(clipById(LOW_BATTERY_CLIP_ID)?.number).toBe(33)
    let clock = stepBattery(initialBatteryClock(), { level: 0.5, charging: false })
    expect(clock).toEqual({ armed: true, pending: false })
    expect(stepBattery(clock, { level: 0.2, charging: false }).pending).toBe(false)
    clock = stepBattery(clock, { level: 0.19, charging: false })
    expect(clock).toEqual({ armed: false, pending: true })
    clock = stepBattery(clock, { level: 0.05, charging: false })
    expect(clock).toEqual({ armed: false, pending: true })
    const played = takeLowBatteryClip(clock, open)
    expect(played.id).toBe(LOW_BATTERY_CLIP_ID)
    expect(played.clock.pending).toBe(false)
    expect(takeLowBatteryClip(played.clock, open).id).toBeNull()
    expect(stepBattery(played.clock, { level: 0.05, charging: false }).pending).toBe(false)
  })

  it('does not fire while charging', () => {
    expect(stepBattery(initialBatteryClock(), { level: 0.05, charging: true })).toEqual({ armed: true, pending: false })
  })

  it('re-arms on charge and on a level above 25%', () => {
    const low = stepBattery(initialBatteryClock(), { level: 0.1, charging: false })
    const charged = stepBattery(low, { level: 0.1, charging: true })
    expect(charged.armed).toBe(true)
    const played = takeLowBatteryClip(charged, open)
    expect(played.id).toBe(LOW_BATTERY_CLIP_ID)
    expect(stepBattery(played.clock, { level: 0.1, charging: false }).pending).toBe(true)

    const again = takeLowBatteryClip(stepBattery(initialBatteryClock(), { level: 0.1, charging: false }), open).clock
    expect(stepBattery(again, { level: 0.25, charging: false }).armed).toBe(false)
    const recovered = stepBattery(again, { level: 0.26, charging: false })
    expect(recovered).toEqual({ armed: true, pending: false })
    expect(stepBattery(recovered, { level: 0.19, charging: false })).toEqual({ armed: false, pending: true })
  })

  it('plays once per session when the first reading is already low', () => {
    const loaded = stepBattery(initialBatteryClock(), { level: 0.1, charging: false })
    expect(loaded).toEqual({ armed: false, pending: true })
    const played = takeLowBatteryClip(loaded, open)
    expect(played.id).toBe(LOW_BATTERY_CLIP_ID)
    expect(stepBattery(played.clock, { level: 0.1, charging: false }).pending).toBe(false)
    expect(takeLowBatteryClip(played.clock, open).id).toBeNull()
  })

  it('does nothing when the provider is unsupported', () => {
    const unsupported: BatteryProvider = {
      isSupported: () => false,
      subscribe: () => {
        throw new Error('subscribe')
      },
    }
    let samples = 0
    const stop = watchBattery(unsupported, () => {
      samples += 1
    })
    stop()
    expect(samples).toBe(0)
    expect(webBatteryProvider.isSupported()).toBe(false)
    const webStop = watchBattery(webBatteryProvider, () => {
      samples += 1
    })
    webStop()
    expect(samples).toBe(0)
  })

  it('defers while a touch, the 4s cooldown, or another clip is in the way', () => {
    const low = stepBattery(initialBatteryClock(), { level: 0.1, charging: false })
    const touching = takeLowBatteryClip(low, { ...open, touching: true })
    const cooling = takeLowBatteryClip(low, { ...open, suppressUntil: 12_000, now: 10_000 })
    const busy = takeLowBatteryClip(low, { ...open, guard: 'batch' })
    expect(touching.id).toBeNull()
    expect(cooling.id).toBeNull()
    expect(busy.id).toBeNull()
    expect(touching.clock.pending).toBe(true)
    expect(cooling.clock.pending).toBe(true)
    expect(busy.clock.pending).toBe(true)
    expect(takeLowBatteryClip(low, { ...open, now: 12_000, suppressUntil: 12_000 }).id).toBe(LOW_BATTERY_CLIP_ID)
  })

  it('skips reduced motion, stays locked when the tier is closed, and stays silent when muted', () => {
    const low = stepBattery(initialBatteryClock(), { level: 0.1, charging: false })
    const reduced = takeLowBatteryClip(low, { ...open, reduced: true })
    expect(reduced.id).toBeNull()
    expect(reduced.clock.pending).toBe(false)
    const locked = takeLowBatteryClip(low, { ...open, unlocked: false })
    expect(locked.id).toBeNull()
    expect(locked.clock.pending).toBe(true)
    expect(takeLowBatteryClip(low, open).id).toBe(LOW_BATTERY_CLIP_ID)
    expect(clipShouldStartMuted({ fromGallery: false, soundOn: false, gestureUnlocked: true })).toBe(true)
    expect(clipMayUnmute({ soundOn: false, userMuted: false, primed: true })).toBe(false)
    expect(clipMayUnmute({ soundOn: true, userMuted: true, primed: true })).toBe(false)
  })
})
