import { beforeEach, describe, expect, it } from 'vitest'
import { playCue, setSoundMuted, unlockSound } from './sfx.ts'
import { SYNTH_COOLDOWN_MS, chooseSynthCue, initialSynthClock, type SynthCue } from './synth-cues.ts'

const open = { reduced: false, muted: false, unlocked: true, blocked: false }

function run(cue: SynthCue, times: number, hasExisting: boolean, start = 0, step = 100) {
  let clock = initialSynthClock()
  const choices: Array<'synth' | 'existing' | 'none'> = []
  for (let i = 0; i < times; i += 1) {
    const next = chooseSynthCue(clock, { ...open, cue, now: start + i * step, hasExisting })
    clock = next.clock
    choices.push(next.choice)
  }
  return choices
}

describe('synth cue arbiter', () => {
  it('fires each synth on its own trigger', () => {
    for (const cue of ['blink', 'curious', 'happy', 'movement'] as const) {
      const alone = chooseSynthCue(initialSynthClock(), { ...open, cue, now: 0, hasExisting: false })
      expect(alone.choice).toBe('synth')
    }
  })

  it('respects each cooldown and keeps to one cue at a time', () => {
    const blink = chooseSynthCue(initialSynthClock(), { ...open, cue: 'blink', now: 0, hasExisting: false })
    expect(chooseSynthCue(blink.clock, { ...open, cue: 'blink', now: SYNTH_COOLDOWN_MS.blink - 1, hasExisting: false }).choice).toBe('none')
    expect(chooseSynthCue(blink.clock, { ...open, cue: 'blink', now: SYNTH_COOLDOWN_MS.blink, hasExisting: false }).choice).toBe('synth')
    expect(chooseSynthCue(blink.clock, { ...open, cue: 'happy', now: 10, hasExisting: false }).choice).toBe('none')
    expect(SYNTH_COOLDOWN_MS).toEqual({ blink: 8_000, curious: 10_000, happy: 10_000, movement: 6_000 })
  })

  it('does not play the synth and the existing cue on the same trigger', () => {
    const choices = run('curious', 6, true, 0, 11_000)
    expect(choices).toEqual(['existing', 'existing', 'synth', 'existing', 'existing', 'synth'])
    for (const choice of choices) expect(choice === 'synth' || choice === 'existing').toBe(true)
    const third = run('blink', 3, true, 0, 9_000)
    expect(third.filter((choice) => choice === 'synth')).toHaveLength(1)
    expect(third.filter((choice) => choice === 'existing')).toHaveLength(2)
  })

  it('stays silent while muted, locked, or in reduced motion when nothing else owns the trigger', () => {
    expect(chooseSynthCue(initialSynthClock(), { ...open, muted: true, cue: 'happy', now: 0, hasExisting: false }).choice).toBe('none')
    expect(chooseSynthCue(initialSynthClock(), { ...open, unlocked: false, cue: 'movement', now: 0, hasExisting: false }).choice).toBe('none')
    expect(chooseSynthCue(initialSynthClock(), { ...open, reduced: true, cue: 'curious', now: 0, hasExisting: false }).choice).toBe('none')
    expect(chooseSynthCue(initialSynthClock(), { ...open, reduced: true, cue: 'blink', now: 0, hasExisting: true }).choice).toBe('existing')
    expect(chooseSynthCue(initialSynthClock(), { ...open, blocked: true, cue: 'movement', now: 0, hasExisting: false }).choice).toBe('none')
  })
})

class Source {
  start() {}
  connect() {}
}

class FakeContext {
  currentTime = 0
  destination = {}
  resume() {
    return Promise.resolve()
  }
  decodeAudioData() {
    return Promise.resolve({ getChannelData: () => new Float32Array([0]), sampleRate: 22050 })
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) }
  }
  createBufferSource() {
    return new Source()
  }
  createGain() {
    return { gain: { value: 0 }, connect() {} }
  }
}

beforeEach(() => {
  ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext
  unlockSound()
  setSoundMuted(false)
})

describe('playCue synth allow-list', () => {
  it('plays a synth cue once and stays silent while muted', () => {
    expect(playCue('blink')).toBe(true)
    expect(playCue('curious')).toBe(false)
    setSoundMuted(true)
    expect(playCue('happy')).toBe(false)
    expect(playCue('movement')).toBe(false)
  })
})
