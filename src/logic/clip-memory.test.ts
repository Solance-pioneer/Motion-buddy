import { afterEach, describe, expect, it, vi } from 'vitest'
import { BEAT_KEY, beatFeelFromStored, IDLE_GAP_KEY, readBeatFeel, readIdleGapSeconds, readSpeechEnabled, SPEECH_KEY, writeBeatFeel, writeIdleGapSeconds, writeSpeechEnabled } from './clip-memory.ts'

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

  it('keeps chill and hype when an older steady or party value is stored', () => {
    expect(beatFeelFromStored('steady')).toBe('steady')
    expect(beatFeelFromStored('chill')).toBe('steady')
    expect(beatFeelFromStored('party')).toBe('party')
    expect(beatFeelFromStored('hype')).toBe('party')
    expect(beatFeelFromStored('nope')).toBe('steady')
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    store.set(BEAT_KEY, JSON.stringify({ on: true, feel: 'party' }))
    expect(readBeatFeel()).toEqual({ on: true, feel: 'party' })
    store.set(BEAT_KEY, JSON.stringify({ on: true, feel: 'hype' }))
    expect(readBeatFeel()).toEqual({ on: true, feel: 'party' })
    store.set(BEAT_KEY, JSON.stringify({ on: false, feel: 'chill' }))
    expect(readBeatFeel()).toEqual({ on: false, feel: 'steady' })
    writeBeatFeel(true, 'party')
    expect(store.get(BEAT_KEY)).toBe('{"on":true,"feel":"party"}')
    writeBeatFeel(false, 'steady')
    expect(readBeatFeel()).toEqual({ on: false, feel: 'steady' })
  })
})
