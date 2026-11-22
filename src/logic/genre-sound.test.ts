import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GENRE_PACK } from './genre-pack.ts'
import { playGenreSting } from './genre-sound.ts'

describe('genre stings', () => {
  it('does not play an oscillator on a detected beat', () => {
    let oscillators = 0
    const host = globalThis as { AudioContext?: new () => unknown }
    const previous = host.AudioContext
    class FakeContext {
      currentTime = 0
      destination = {}
      createOscillator() {
        oscillators += 1
        return { frequency: { value: 0 }, connect() {}, start() {}, stop() {} }
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }
      }
    }
    host.AudioContext = FakeContext
    try {
      const sound = GENRE_PACK[0].sound
      expect(playGenreSting(sound, true, { muted: false, unlocked: true, reduced: false })).toBe(false)
      expect(playGenreSting(sound, false, { muted: false, unlocked: true, reduced: false })).toBe(false)
      expect(oscillators).toBe(0)
      const app = readFileSync('src/App.tsx', 'utf8')
      expect(app.includes('playGenreSting')).toBe(false)
      expect(GENRE_PACK).toHaveLength(25)
    } finally {
      host.AudioContext = previous
    }
  })
})
