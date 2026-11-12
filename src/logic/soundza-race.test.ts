import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { DRIVE_WAV_BASE64 } from './drive-wavs.ts'
import { playRaceActivate, setSoundMuted, stopRaceActivate, unlockSound } from './sfx.ts'
import { SOUNDZA_RACE_ACTIVATE_WAV_BASE64 } from './soundza-wavs.ts'

const APP_SHA = '6384c4696663b712dfde09357b2b0f247a90488862f1fb1c6779dd015916b02d'

class Source {
  loop = false
  onended: (() => void) | null = null
  started = 0
  stopped = 0
  connect() {}
  start() {
    this.started += 1
  }
  stop() {
    this.stopped += 1
    this.onended?.()
  }
}

const sources: Source[] = []

class FakeContext {
  currentTime = 0
  destination = {}
  resume() {
    return Promise.resolve()
  }
  decodeAudioData() {
    return Promise.resolve({ getChannelData: () => new Float32Array([0]), sampleRate: 22050 })
  }
  createBuffer(_channels: number, length: number, rate: number) {
    const data = new Float32Array(length)
    return { duration: length / rate, getChannelData: () => data, sampleRate: rate }
  }
  createBufferSource() {
    const source = new Source()
    sources.push(source)
    return source
  }
  createGain() {
    return {
      gain: {
        cancelScheduledValues() {},
        setValueAtTime() {},
        linearRampToValueAtTime() {},
      },
      connect() {},
    }
  }
}

beforeEach(() => {
  sources.length = 0
  ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext
  stopRaceActivate(0)
  unlockSound()
  setSoundMuted(false)
})

describe('Soundza race activation', () => {
  it('embeds the approved app copy and not a standalone wav', () => {
    const bytes = Buffer.from(SOUNDZA_RACE_ACTIVATE_WAV_BASE64, 'base64')
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(APP_SHA)
    expect(bytes.readUInt16LE(22)).toBe(1)
    expect(bytes.readUInt32LE(24)).toBe(48_000)
    expect(bytes.readUInt16LE(34)).toBe(16)
    const frames = bytes.readUInt32LE(40) / 2
    expect(frames / 48_000).toBeGreaterThan(1.99)
    expect(frames / 48_000).toBeLessThan(2.01)
    expect(readFileSync('src/assets/soundza-race-v1/PROVENANCE.md', 'utf8')).toContain(APP_SHA)
  })

  it('plays the Soundza cue once and does not stack a second one', () => {
    expect(playRaceActivate()).toBe(true)
    expect(playRaceActivate()).toBe(false)
    expect(sources).toHaveLength(1)
    expect(sources[0].loop).toBe(false)
    expect(sources[0].started).toBe(1)
    stopRaceActivate(80)
    expect(sources[0].stopped).toBe(1)
    expect(playRaceActivate()).toBe(true)
    expect(sources).toHaveLength(2)
  })

  it('stays silent while muted and no longer uses the synthetic activation rev', () => {
    setSoundMuted(true)
    expect(playRaceActivate()).toBe(false)
    expect(sources).toHaveLength(0)
    expect(Object.keys(DRIVE_WAV_BASE64)).not.toContain('race_activate_rev')
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app.includes('race_activate_rev')).toBe(false)
    expect(app.includes('playRaceActivate()')).toBe(true)
  })
})
