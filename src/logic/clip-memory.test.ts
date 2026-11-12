import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDLE_GAP_KEY, readIdleGapSeconds, readSpeechEnabled, SPEECH_KEY, writeIdleGapSeconds, writeSpeechEnabled } from './clip-memory.ts'

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

  it('remembers speech bubbles and defaults to on', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    expect(readSpeechEnabled()).toBe(true)
    writeSpeechEnabled(false)
    expect(store.get(SPEECH_KEY)).toBe('{"enabled":false}')
    expect(readSpeechEnabled()).toBe(false)
    writeSpeechEnabled(true)
    expect(readSpeechEnabled()).toBe(true)
    store.set(SPEECH_KEY, 'nope')
    expect(readSpeechEnabled()).toBe(true)
  })
})
