import { describe, expect, it } from 'vitest'
import {
  SPEECH_COOLDOWN_MS,
  SPEECH_VISIBLE_MS,
  initialSpeechClock,
  offerSpeech,
  speechEnabledFromStorage,
  speechToStorage,
} from './speech.ts'

describe('speech bubbles', () => {
  it('does not repeat a line in the same category', () => {
    const first = offerSpeech(initialSpeechClock(), 'shake', 0, true, 0)
    const again = offerSpeech({ ...first.clock, showingUntil: 0, readyAt: 0 }, 'shake', 1, true, 0)
    expect(first.line).toBeTruthy()
    expect(again.line).toBeTruthy()
    expect(again.line).not.toBe(first.line)
    const pet = offerSpeech(initialSpeechClock(), 'pet', 0, true, 0)
    const petAgain = offerSpeech({ ...pet.clock, showingUntil: 0, readyAt: 0 }, 'pet', 1, true, 0)
    expect(petAgain.line).not.toBe(pet.line)
  })

  it('shows one line at a time and then waits out the cooldown', () => {
    const first = offerSpeech(initialSpeechClock(), 'pet', 1_000, true, 0.6)
    expect(first.line).toBeTruthy()
    expect(first.clock.showingUntil).toBe(1_000 + SPEECH_VISIBLE_MS)
    expect(first.clock.readyAt).toBe(1_000 + SPEECH_COOLDOWN_MS)
    expect(offerSpeech(first.clock, 'shake', 1_000 + 500, true, 0.2).line).toBeNull()
    const afterShow = { ...first.clock, showingUntil: 0 }
    expect(offerSpeech(afterShow, 'shake', 1_000 + SPEECH_COOLDOWN_MS - 1, true, 0.2).line).toBeNull()
    expect(offerSpeech(afterShow, 'shake', 1_000 + SPEECH_COOLDOWN_MS, true, 0.2).line).toBeTruthy()
  })

  it('stays quiet while the toggle is off and defaults to on', () => {
    const clock = initialSpeechClock()
    const quiet = offerSpeech(clock, 'pet', 0, false, 0)
    expect(quiet.line).toBeNull()
    expect(quiet.clock).toEqual(clock)
    expect(speechEnabledFromStorage(null)).toBe(true)
    expect(speechEnabledFromStorage('')).toBe(true)
    expect(speechEnabledFromStorage('nope')).toBe(true)
    expect(speechEnabledFromStorage('{"enabled":false}')).toBe(false)
    expect(speechEnabledFromStorage(speechToStorage(true))).toBe(true)
    expect(speechEnabledFromStorage(speechToStorage(false))).toBe(false)
  })
})
