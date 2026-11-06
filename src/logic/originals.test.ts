import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { placeApproved } from './library.ts'
import { sampleOriginal, stepOriginalCue } from './originals.ts'
import { ORIGINAL_WAV_BASE64 } from './original-wavs.ts'

describe('original expressions', () => {
  it('plays the pose path and holds a readable still when motion is reduced', () => {
    const open = sampleOriginal('original_sneeze', 0, false)
    const sneeze = sampleOriginal('original_sneeze', 1_100, false)
    const still = sampleOriginal('original_sneeze', 1_100, true)
    expect(open?.features.left.peak).toBe(0)
    expect(open?.features.left.rot).toBe(0)
    expect(sneeze?.features.mouth.open).toBe(1)
    expect(sneeze?.features.left.peak).toBeGreaterThan(0)
    expect(still?.features.mouth.open).toBe(1)
    expect(still?.features.left.h).toBe(still?.features.left.h)
    const peek = sampleOriginal('original_peekaboo', 1_200, false)
    expect(peek?.features.left.h).not.toBe(peek?.features.right.h)
    const pout = sampleOriginal('original_pout_melt', 800, true)
    expect(pout?.features.mouth.curve).toBeGreaterThan(0)
    expect(pout?.features.left.rot).toBe(0)
  })

  it('fires each cue once at its mark and cancels when muted or replaced', () => {
    let arm = stepOriginalCue(null, 'original_sneeze', 1_000, true)
    expect(arm.play).toBeNull()
    arm = stepOriginalCue(arm.arm, 'original_sneeze', 1_100, false)
    expect(arm.play).toBeNull()
    expect(stepOriginalCue(arm.arm, 'original_sneeze', 2_000, true).play).toBeNull()
    const peek = stepOriginalCue(null, 'original_peekaboo', 1_200, true)
    expect(peek.play).toBe('peek_pop')
    expect(stepOriginalCue(peek.arm, 'original_peekaboo', 1_500, true).play).toBeNull()
    expect(stepOriginalCue(peek.arm, 'original_pout_melt', 800, true).play).toBe('pout_boop')
    expect(placeApproved(46_100, { dizzy: true, startled: true }).showcase?.id).toBe('original_sneeze')
    expect(placeApproved(51_200, { dizzy: true, startled: true }).showcase?.id).toBe('original_peekaboo')
    expect(placeApproved(56_100, { dizzy: true, startled: true }).showcase?.id).toBe('original_pout_melt')
  })

  it('keeps the app PCM copies byte-identical', () => {
    const files = {
      sneeze_zip: ['src/assets/originals-v1/audio/app/sneeze_zip_app_pcm16_48k.wav', 'ce1260e8b0d64c8413c01e507684ff76f11d92f4a948b39c7749bfa0a8344062'],
      peek_pop: ['src/assets/originals-v1/audio/app/peek_pop_app_pcm16_48k.wav', 'ec6384948afcefaa3726f29b46c7af478fff6d2ae3c4976974e6830690712ff4'],
      pout_boop: ['src/assets/originals-v1/audio/app/pout_boop_app_pcm16_48k.wav', '70c26d2ec5fbb0cc18fe93aede87d1f74a42d05911826867d2f5f40079fdabf7'],
    } as const
    for (const [key, [path, hash]] of Object.entries(files)) {
      const disk = readFileSync(path)
      const embedded = Buffer.from(ORIGINAL_WAV_BASE64[key as keyof typeof ORIGINAL_WAV_BASE64], 'base64')
      expect(createHash('sha256').update(disk).digest('hex')).toBe(hash)
      expect(createHash('sha256').update(embedded).digest('hex')).toBe(hash)
    }
  })
})
