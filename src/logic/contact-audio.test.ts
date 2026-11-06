import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach } from 'vitest'
import { CONTACT_WAV_BASE64 } from './contact-wavs.ts'
import { advanceSound, beginContact, contactStatus, endContact, initialSoundMemory, playContactVariant, playCue, resetContactForTests, setSoundMuted, unlockSound } from './sfx.ts'

const files = {
  curious_contact_loop: ['src/assets/contact-audio-v1/audio/app/curious_contact_loop_app_pcm16_48k.wav', '87b629cead273de97ac0d496d381d99180227489bd6cdda930945670a01897d0', 134400],
  pet_soft_squeak: ['src/assets/contact-audio-v1/audio/app/pet_soft_squeak_app_pcm16_48k.wav', '3a555a6eeef942f4e634e63336aebac7b57cdabc6fb8efd2bf4b8ebc2969ebad', 16320],
  pet_round_chirp: ['src/assets/contact-audio-v1/audio/app/pet_round_chirp_app_pcm16_48k.wav', 'bb386e2895847c7ed9ca49cf5711e99b0e9046b67bcce9972ce166724b127edd', 23040],
  pet_content_wobble: ['src/assets/contact-audio-v1/audio/app/pet_content_wobble_app_pcm16_48k.wav', '507a0837d106d62a77ce7af2cd5784937b9d4cd14d4e4cfb9a1a9f2ed8c51dea', 37440],
} as const

class Param {
  value = 0
  events: { kind: string; value: number }[] = []
  cancelScheduledValues() {
    this.events.push({ kind: 'cancel', value: this.value })
  }
  setValueAtTime(value: number) {
    this.value = value
    this.events.push({ kind: 'set', value })
  }
  linearRampToValueAtTime(value: number) {
    this.events.push({ kind: 'ramp', value })
  }
}

class Source {
  loop = false
  loopStart = 0
  loopEnd = 0
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
    return { duration: length / rate, getChannelData: () => data }
  }
  createBufferSource() {
    const source = new Source()
    sources.push(source)
    return source
  }
  createGain() {
    return { gain: new Param(), connect() {} }
  }
}

beforeEach(() => {
  sources.length = 0
  ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext
  resetContactForTests()
  unlockSound()
  setSoundMuted(false)
})

describe('contact audio', () => {
  it('embeds the approved app copies without changing them', () => {
    for (const [key, [path, hash, samples]] of Object.entries(files)) {
      const bytes = readFileSync(path)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
      const embedded = Buffer.from(CONTACT_WAV_BASE64[key as keyof typeof CONTACT_WAV_BASE64], 'base64')
      expect(createHash('sha256').update(embedded).digest('hex')).toBe(hash)
      expect(samples).toBe((bytes.length - 44) / 2)
    }
  })

  it('keeps one looping bed across the loop point and yields other cues', () => {
    expect(beginContact()).toBe(true)
    expect(beginContact()).toBe(false)
    const bed = sources[0]
    expect(bed.loop).toBe(true)
    expect(bed.loopStart).toBe(0)
    expect(bed.loopEnd).toBeCloseTo(2.8, 5)
    expect(bed.started).toBe(1)
    expect(playCue('scan')).toBe(false)
    expect(playCue('chirp')).toBe(false)
    expect(contactStatus()).toMatchObject({ active: true, bedStarts: 1, yields: 2, liveSources: 1 })
    const heard = { expression: 'scan', reaction: 'none', reduced: false, allowDizzy: true, allowStartled: true }
    const first = advanceSound(initialSoundMemory(), heard, 5_000)
    expect(first.cue).toBe('scan')
    expect(playCue(first.cue)).toBe(false)
    endContact(130)
    expect(contactStatus().active).toBe(false)
    expect(contactStatus().bedStarts).toBe(1)
    expect(bed.stopped).toBe(1)
    expect(advanceSound(first.memory, heard, 6_000).cue).toBeNull()
    expect(playCue('chirp')).toBe(true)
  })

  it('plays one variant at a time, then the next only after the gate', () => {
    beginContact()
    expect(playContactVariant(1_000)).toBe('pet_soft_squeak')
    expect(playContactVariant(1_200)).toBeNull()
    expect(contactStatus().liveSources).toBe(2)
    sources[1].onended?.()
    expect(contactStatus().liveSources).toBe(1)
    expect(playContactVariant(1_500)).toBeNull()
    expect(playContactVariant(1_900)).toBe('pet_round_chirp')
    expect(contactStatus().variantKeys).toEqual(['pet_soft_squeak', 'pet_round_chirp'])
  })

  it('does not let a stopped variant restore or restart the bed', () => {
    beginContact()
    playContactVariant(2_000)
    endContact(130)
    expect(contactStatus()).toMatchObject({ active: false, bedStarts: 1, liveSources: 0 })
    setSoundMuted(true)
    expect(beginContact()).toBe(false)
    setSoundMuted(false)
    expect(beginContact()).toBe(true)
    expect(contactStatus().bedStarts).toBe(2)
  })
})
