import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDLE_GAP_KEY, readIdleGapSeconds, writeIdleGapSeconds } from './clip-memory.ts'

describe('idle gap memory', () => {
  const store = new Map<string, string>()

  afterEach(() => {
    store.clear()
    vi.unstubAllGlobals()
  })

  it('round-trips a valid gap and falls back to 5s', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    expect(readIdleGapSeconds()).toBe(5)
    writeIdleGapSeconds(12)
    expect(store.get(IDLE_GAP_KEY)).toBe('{"seconds":12}')
    expect(readIdleGapSeconds()).toBe(12)
    writeIdleGapSeconds(100)
    expect(readIdleGapSeconds()).toBe(5)
    store.set(IDLE_GAP_KEY, 'nope')
    expect(readIdleGapSeconds()).toBe(5)
  })
})
