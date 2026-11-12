import { describe, expect, it, vi } from 'vitest'

vi.mock('./entitlements.ts', () => ({
  isUnlocked: (id: string) => id !== 'sleepy-doze',
}))

import { chooseScheduledClip } from './clip-table.ts'

describe('entitlements gate', () => {
  it('drops a film when isUnlocked returns false', () => {
    const pick = chooseScheduledClip({
      now: 10_000,
      date: new Date(2026, 10, 12, 23, 30),
      reduced: false,
      guard: null,
      suppressUntil: 0,
      playedSeason: ['christmas-hat', 'halloween-pumpkin-boo'],
      goodnightPlayed: true,
      morningStored: '2026-11-12',
      readyAt: {},
      weather: null,
      weatherEnabled: false,
    })
    expect(pick).toBeNull()
  })
})
