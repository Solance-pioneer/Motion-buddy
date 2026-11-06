import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { VOICE_MP3_BASE64 } from './voice-mp3.ts'
import { describe, expect, it } from 'vitest'
import { APPROVED_WAV_BASE64 } from './approved-wavs.ts'
import { POSE_IDS, sampleIdle, type PoseId } from './library.ts'
import {
  advanceCandidate,
  advanceSound,
  approvedSamples,
  claimChirp,
  cueForCandidate,
  cueForHearState,
  initialSoundMemory,
  type ApprovedCue,
  type HearState,
} from './sfx.ts'

const FILES: Record<ApprovedCue, [string, string, number]> = {
  scan: ['src/assets/approved-sfx/01_38_scan_ORIGINAL_DRAFT.wav', '8c6c3b2b44924449b35f6b50a7c0c871fbc55aef17270d55a2f91a8135240ebd', 11025],
  giggle: ['src/assets/approved-sfx/02_04_giggle_ORIGINAL_DRAFT.wav', '8f1174c79743929a4841b75533274ddbb33183b8e237d2159703a4af5f852c05', 14994],
  surprise: ['src/assets/approved-sfx/03_40_surprise_ORIGINAL_DRAFT.wav', 'fc2d560fa5418c09f9effe2e427e57be02b76e0e1a697bfacdabb9a5afc2b547', 11025],
  yawn: ['src/assets/approved-sfx/04_42_yawn_ORIGINAL_DRAFT.wav', '95cf38d1581d83c6a0a710729925e8fe8178b1fd0bf1307161ecb4e05387ac33', 19845],
  wink: ['src/assets/approved-sfx/05_48_wink_ORIGINAL_DRAFT.wav', 'c68b3e10f99974e1e55909db6502f37aa53db173d315717c58d2c7b501d26dac', 7497],
  dizzy: ['src/assets/approved-sfx/06_15_dizzy_ORIGINAL_DRAFT.wav', '6490fd5309f8d2d03a68a669935346f489151ccf7c05acb895a2f8d4fa167843', 26460],
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

const openHear: HearState = {
  expression: 'curious',
  reaction: 'none',
  reduced: false,
  allowDizzy: true,
  allowStartled: true,
}

describe('approved expression sounds', () => {
  it('maps the six owner-approved recordings and reuses dizzy for the spiral', () => {
    expect(cueForCandidate('scan')).toBe('scan')
    expect(cueForCandidate('giggle')).toBe('giggle')
    expect(cueForCandidate('take-left')).toBe('surprise')
    expect(cueForCandidate('yawn-stretch')).toBe('yawn')
    expect(cueForCandidate('wink-play')).toBe('wink')
    expect(cueForCandidate('dizzy')).toBe('dizzy')
    expect(cueForCandidate('spiral-dizzy')).toBe('dizzy')
    expect(cueForCandidate('laugh')).toBeNull()
    expect(cueForCandidate('happy')).toBeNull()
    expect(cueForCandidate('curious')).toBeNull()
    expect(cueForCandidate('blink')).toBeNull()
    expect(cueForHearState({ ...openHear, reaction: 'worried' })).toBeNull()
  })

  it('keeps the embedded recordings byte-identical to the approved files', () => {
    for (const [kind, [path, hash, frames]] of Object.entries(FILES) as [ApprovedCue, [string, string, number]][]) {
      const disk = new Uint8Array(readFileSync(path))
      const embedded = new Uint8Array(Buffer.from(APPROVED_WAV_BASE64[kind], 'base64'))
      expect(sha256(disk)).toBe(hash)
      expect(sha256(embedded)).toBe(hash)
      expect(approvedSamples(kind).length).toBe(frames)
    }
    const chirp = new Uint8Array(readFileSync('/opt/cursor/artifacts/sfx_chirp.wav'))
    expect(sha256(chirp)).toBe('7f566f44a10f9223b2903387376bff3f3afdf8c0c9e5b38bd928f060b7eba23c')
    const clap = new Uint8Array(readFileSync('src/assets/private-voice/voice_13_1.mp3'))
    const level = new Uint8Array(readFileSync('src/assets/private-voice/voice_16_1.mp3'))
    expect(sha256(clap)).toBe('44dceb3afc7676c01f9ac0b204584560e82c7cd1959515345d1b2da2ca72411a')
    expect(sha256(level)).toBe('11f7c3071f31de9b7502866bd0056b5c5aa872e06dce9a675207a9f4b44260d1')
    expect(sha256(new Uint8Array(Buffer.from(VOICE_MP3_BASE64.clap, 'base64')))).toBe(sha256(clap))
    expect(sha256(new Uint8Array(Buffer.from(VOICE_MP3_BASE64['level-up'], 'base64')))).toBe(sha256(level))
  })

  it('plays once per expression entrance and does not retrigger through a held or looping beat', () => {
    const allowed = new Set<PoseId>(POSE_IDS)
    let memory = initialSoundMemory()
    const cues: string[] = []
    for (let t = 0; t < 23_200; t += 16) {
      const frame = sampleIdle(t, 'desk', allowed, false)
      const next = advanceSound(memory, { ...openHear, expression: frame.pose }, t)
      memory = next.memory
      if (next.cue) cues.push(next.cue)
    }
    expect(cues).toEqual(['surprise', 'yawn', 'wink'])

    memory = initialSoundMemory()
    const held: number[] = []
    for (let t = 0; t < 1_800; t += 16) {
      const next = advanceSound(memory, { ...openHear, expression: 'yawn' }, t)
      memory = next.memory
      if (next.cue) held.push(t)
    }
    expect(held).toEqual([0])

    memory = initialSoundMemory()
    const scan: ApprovedCue[] = []
    for (let i = 0; i < 80; i += 1) {
      const next = advanceCandidate(memory, 'scan', i * 40)
      memory = next.memory
      if (next.cue) scan.push(next.cue)
    }
    expect(scan).toEqual(['scan'])
    const blocked = advanceCandidate(memory, 'giggle', 200)
    expect(blocked.cue).toBeNull()
    expect(advanceCandidate(blocked.memory, 'giggle', 5_000).cue).toBe('giggle')
  })

  it('keeps mute, unlock, reduced motion, exclusions, and the chirp from stacking', () => {
    const yawn = advanceSound(initialSoundMemory(), { ...openHear, expression: 'yawn' }, 0)
    expect(yawn.cue).toBe('yawn')
    expect(claimChirp(yawn.memory, 40, { unlocked: true, muted: false, explicit: true }).ok).toBe(false)
    expect(claimChirp(yawn.memory, 1_000, { unlocked: true, muted: false, explicit: true }).ok).toBe(true)
    expect(claimChirp(initialSoundMemory(), 0, { unlocked: true, muted: false, explicit: false }).ok).toBe(false)
    expect(claimChirp(initialSoundMemory(), 0, { unlocked: false, muted: false, explicit: true }).ok).toBe(false)
    expect(claimChirp(initialSoundMemory(), 0, { unlocked: true, muted: true, explicit: true }).ok).toBe(false)

    const reduced = advanceSound(initialSoundMemory(), { ...openHear, expression: 'wink', reduced: true }, 0)
    expect(reduced.cue).toBeNull()
    expect(advanceSound(initialSoundMemory(), { ...openHear, reaction: 'dizzy', allowDizzy: false }, 0).cue).toBeNull()
    expect(advanceSound(initialSoundMemory(), { ...openHear, expression: 'startled', allowStartled: false }, 0).cue).toBeNull()
  })
})
