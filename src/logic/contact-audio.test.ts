import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { CONTACT_WAV_BASE64 } from './contact-wavs.ts'
import { OOH_CAP_FADE_MS, OOH_MAX_MS } from './ooh.ts'
import { advanceSound, beginContact, contactStatus, endContact, initialSoundMemory, playContactVariant, playCue, playPetNote, resetContactForTests, setSoundMuted, unlockSound } from './sfx.ts'

const files = {
  curious_contact_loop: ['src/assets/contact-audio-v1/audio/app/curious_contact_loop_app_pcm16_48k.wav', '87b629cead273de97ac0d496d381d99180227489bd6cdda930945670a01897d0', 134400],
  pet_soft_squeak: ['src/assets/contact-audio-v1/audio/app/pet_soft_squeak_app_pcm16_48k.wav', '3a555a6eeef942f4e634e63336aebac7b57cdabc6fb8efd2bf4b8ebc2969ebad', 16320],
  pet_round_chirp: ['src/assets/contact-audio-v1/audio/app/pet_round_chirp_app_pcm16_48k.wav', 'bb386e2895847c7ed9ca49cf5711e99b0e9046b67bcce9972ce166724b127edd', 23040],
  pet_content_wobble: ['src/assets/contact-audio-v1/audio/app/pet_content_wobble_app_pcm16_48k.wav', '507a0837d106d62a77ce7af2cd5784937b9d4cd14d4e4cfb9a1a9f2ed8c51dea', 37440],
  pet_squish_press: ['src/assets/contact-audio-v1/audio/app/pet_squish_press_app_pcm16_48k.wav', '34e67700ad85970ea40f1037e915743eff16e0010cbd1981b263434599d75a6f', 13440],
  pet_spring_release: ['src/assets/contact-audio-v1/audio/app/pet_spring_release_app_pcm16_48k.wav', '0ff5f7beac3b3fc5b6746abecadba03d25eed9bf21f5760e6f1324e0e306aa9a', 10560],
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

  it('plays the drag clip once and yields other cues while it is sounding', () => {
    expect(beginContact()).toBe(true)
    expect(beginContact()).toBe(false)
    const bed = sources[0]
    expect(bed.loop).toBe(false)
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

  it('stops a contact ooh near 1.4s with a fade, and sooner if the gesture ends', () => {
    vi.useFakeTimers()
    try {
      expect(beginContact()).toBe(true)
      expect(sources[0].loop).toBe(false)
      vi.advanceTimersByTime(OOH_MAX_MS - OOH_CAP_FADE_MS - 1)
      expect(sources[0].stopped).toBe(0)
      vi.advanceTimersByTime(1)
      expect(sources[0].stopped).toBe(1)
      sources.length = 0
      expect(beginContact()).toBe(true)
      vi.advanceTimersByTime(200)
      endContact(130)
      expect(sources[0].stopped).toBe(1)
      vi.advanceTimersByTime(OOH_MAX_MS)
      expect(sources[0].stopped).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not stack a pet note on an ooh, and mute blocks the ooh', () => {
    expect(beginContact()).toBe(true)
    expect(beginContact()).toBe(false)
    expect(playPetNote('pet_round_chirp', 3_000)).toBeNull()
    expect(contactStatus().liveSources).toBe(1)
    expect(contactStatus().loop).toBe(false)
    endContact(130)
    setSoundMuted(true)
    expect(beginContact()).toBe(false)
    setSoundMuted(false)
    expect(playPetNote('pet_soft_squeak', 4_000)).toBe('pet_soft_squeak')
    expect(beginContact()).toBe(false)
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
