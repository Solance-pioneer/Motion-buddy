import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodeWav, gateCue, initialGate, renderCue } from './sfx.ts'

describe('sound cues', () => {
  it('stays silent until a gesture unlocks it, then respects mute and cooldown', () => {
    const gate = initialGate()
    expect(gate.muted).toBe(true)
    expect(gateCue(gate, 'chirp', 0)).toBe(false)
    gate.unlocked = true
    expect(gateCue(gate, 'chirp', 0)).toBe(false)
    gate.muted = false
    expect(gateCue(gate, 'chirp', 1_000)).toBe(true)
    expect(gateCue(gate, 'chirp', 1_100)).toBe(false)
    expect(gateCue(gate, 'chirp', 1_500)).toBe(true)
  })

  it('writes a short local chirp with a bounded peak', () => {
    const samples = renderCue('chirp', 22050)
    const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
    const duration = samples.length / 22050
    expect(duration).toBeGreaterThan(0.08)
    expect(duration).toBeLessThan(0.2)
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThanOrEqual(0.85)
    const wav = encodeWav(samples, 22050)
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF')
    writeFileSync('/opt/cursor/artifacts/sfx_chirp.wav', wav)
  })
})