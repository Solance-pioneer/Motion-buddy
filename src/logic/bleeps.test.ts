import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BLEEP_WAV_BASE64 } from './bleep-wavs.ts'
import { allowBleep, BLEEP_COOLDOWN_MS, initialBleepClock } from './bleeps.ts'

const files = {
  tap: ['src/assets/comigo-bleeps-v1/audio/app/tap_press03_pcm16_48k.wav', 'a830816150f8683631eca3f6e1e576d1f8334c4a29c5d42653d9bdea300e064f'],
  blink: ['src/assets/comigo-bleeps-v1/audio/app/blink_press02_pcm16_48k.wav', '1a374b62afa45bed1ecf856cb8e387417674df3745b058e2429dc949ed4eb524'],
  idle: ['src/assets/comigo-bleeps-v1/audio/app/idle_press01_pcm16_48k.wav', '6fb0018028aa6fc5186cba7166b5dd540b8fd71f7bf374601de654f89ce3b722'],
  ack: ['src/assets/comigo-bleeps-v1/audio/app/ack_jump01_pcm16_48k.wav', '1608171df57df5ed4d9d9ebdaf7f76d9cb1e5196226c529df5b6edd4e2ebe638'],
} as const

const open = { muted: false, unlocked: true, busy: false }

describe('comigo bleeps', () => {
  it('keeps the four app copies', () => {
    expect(BLEEP_COOLDOWN_MS).toEqual({ tap: 300, blink: 1_000, idle: 8_000, ack: 600 })
    for (const [key, [path, hash]] of Object.entries(files)) {
      const bytes = readFileSync(path)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
      const embedded = Buffer.from(BLEEP_WAV_BASE64[key as keyof typeof BLEEP_WAV_BASE64], 'base64')
      expect(createHash('sha256').update(embedded).digest('hex')).toBe(hash)
    }
  })

  it('stays silent while muted and waits out each cooldown', () => {
    const first = allowBleep(initialBleepClock(), 'tap', 1_000, open)
    expect(first.ok).toBe(true)
    expect(allowBleep(first.clock, 'tap', 1_299, open).ok).toBe(false)
    const again = allowBleep(first.clock, 'tap', 1_300, open)
    expect(again.ok).toBe(true)
    expect(allowBleep(again.clock, 'tap', 1_400, { ...open, muted: true }).ok).toBe(false)
    expect(allowBleep(again.clock, 'blink', 1_400, { ...open, unlocked: false }).ok).toBe(false)
    expect(allowBleep(again.clock, 'ack', 1_400, { ...open, busy: true }).ok).toBe(false)
    const idle = allowBleep(initialBleepClock(), 'idle', 0, open)
    expect(allowBleep(idle.clock, 'idle', 7_999, open).ok).toBe(false)
    expect(allowBleep(idle.clock, 'idle', 8_000, open).ok).toBe(true)
    const ack = allowBleep(initialBleepClock(), 'ack', 0, open)
    expect(allowBleep(ack.clock, 'ack', 599, open).ok).toBe(false)
    expect(allowBleep(ack.clock, 'ack', 600, open).ok).toBe(true)
    const muted = allowBleep(initialBleepClock(), 'blink', 0, { ...open, muted: true })
    expect(muted.ok).toBe(false)
    expect(muted.clock.last.blink).toBeUndefined()
  })
})
