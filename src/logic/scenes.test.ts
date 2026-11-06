import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SCENE_WAV_BASE64 } from './scene-wavs.ts'
import { SCENE_CUE, SCENE_MS, nextAmbientScene, sampleScene } from './scenes.ts'

const files = {
  ninja_soft_swish: ['src/assets/scenes-v1/audio/app/ninja_soft_swish_app_pcm16_48k.wav', 'b3336913388017bb6d3ecc33c9680d9a9c8c7e5f662611254396074b59f114d5'],
  hero_original_flourish: ['src/assets/scenes-v1/audio/app/hero_original_flourish_app_pcm16_48k.wav', '2efecd43e981f14c1b5725dce881ea5e08e87cbb1515325b80448ca8b2d1b9b5'],
  racer_soft_wind: ['src/assets/scenes-v1/audio/app/racer_soft_wind_app_pcm16_48k.wav', 'dc909f08ab12611441ad645e2f0f54bdc3c3df8a36f34c7a1dc5628655d4b4d8'],
  ghost_cute_boo: ['src/assets/scenes-v1/audio/app/ghost_cute_boo_app_pcm16_48k.wav', '4a050c11536c1b59057400f8c163da04769f9fa6171ca7e66e4916df21481e46'],
} as const

describe('costume scenes', () => {
  it('keeps the supplied cue bytes', () => {
    for (const [key, [path, hash]] of Object.entries(files)) {
      const bytes = readFileSync(path)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
      const embedded = Buffer.from(SCENE_WAV_BASE64[key as keyof typeof SCENE_WAV_BASE64], 'base64')
      expect(createHash('sha256').update(embedded).digest('hex')).toBe(hash)
    }
  })

  it('runs each scene for its full length and is plain at the end', () => {
    expect(SCENE_MS).toEqual({ ninja: 6_000, cord_hero: 7_000, racer: 7_000, sheet_ghost: 7_500 })
    expect(sampleScene('ninja', 2_400).opacity).toBe(1)
    expect(sampleScene('ninja', 2_400).x).not.toBe(0)
    expect(sampleScene('cord_hero', 3_200).rotate).toBe(180)
    expect(sampleScene('racer', 3_000).wind).toBeGreaterThan(0)
    expect(sampleScene('sheet_ghost', 3_000).opacity).toBe(1)
    for (const [key, ms] of Object.entries(SCENE_MS)) {
      const done = sampleScene(key as keyof typeof SCENE_MS, ms)
      expect(done.done).toBe(true)
      expect(done.opacity).toBe(0)
      expect(done.rotate).toBe(0)
      expect(done.x).toBe(0)
      expect(done.y).toBe(0)
    }
  })

  it('keeps reduced motion full length without travel', () => {
    const hero = sampleScene('cord_hero', 3_200, true)
    expect(hero.opacity).toBe(1)
    expect(hero.rotate).toBe(0)
    expect(hero.y).toBe(0)
    expect(sampleScene('racer', 3_000, true).x).toBe(0)
    expect(sampleScene('sheet_ghost', 3_000, true).y).toBe(0)
    expect(sampleScene('ninja', 6_000, true).done).toBe(true)
  })

  it('does not schedule two scenes back to back', () => {
    expect(nextAmbientScene(null)).toBe('ninja')
    expect(nextAmbientScene('ninja')).toBe('cord_hero')
    expect(nextAmbientScene('sheet_ghost')).toBe('ninja')
    expect(SCENE_CUE.ninja.at).toBe(650)
    expect(SCENE_CUE.cord_hero.at).toBe(2_800)
    expect(SCENE_CUE.racer.at).toBe(2_000)
    expect(SCENE_CUE.sheet_ghost.at).toBe(2_200)
  })
})
