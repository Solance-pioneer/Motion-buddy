import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cueForCandidate, cueForHearState } from './sfx.ts'

const runtime = [
  'src/logic/sfx.ts',
  'src/App.tsx',
  'src/view/Controls.tsx',
  'src/logic/voice-free-wavs.ts',
  'src/logic/original-wavs.ts',
  'scripts/package-static.mjs',
]

describe('shipping audio', () => {
  it('does not load the retired Japanese voice recordings', () => {
    const text = runtime.map((path) => readFileSync(path, 'utf8')).join('\n')
    for (const term of ['conte-de-fees', 'voice_13', 'voice_16', 'りこ', 'VOICE_MP3', 'voice-mp3']) {
      expect(text.includes(term), term).toBe(false)
    }
  })

  it('maps the clap and level-up faces to the new beeps', () => {
    expect(cueForCandidate('clap')).toBe('celebration_three_squeaks')
    expect(cueForCandidate('level-up')).toBe('proud_rise_beeps')
    const hear = { expression: 'clap', reaction: 'none', reduced: false, allowDizzy: true, allowStartled: true }
    expect(cueForHearState(hear)).toBe('celebration_three_squeaks')
    expect(cueForHearState({ ...hear, expression: 'level-up' })).toBe('proud_rise_beeps')
    expect(cueForHearState({ ...hear, reduced: true })).toBeNull()
  })
})
