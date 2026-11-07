import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SCENE_WAV_BASE64 } from './scene-wavs.ts'
import { featuresFor } from '../view/features.ts'
import { HERO_CAPE, SCENE_CUE, SCENE_GAP_MS, SCENE_MS, heroCapePath, nextAmbientScene, sampleScene } from './scenes.ts'

const files = {
  ninja_soft_swish: ['src/assets/scenes-v1/audio/app/ninja_soft_swish_app_pcm16_48k.wav', 'b3336913388017bb6d3ecc33c9680d9a9c8c7e5f662611254396074b59f114d5'],
  hero_original_fanfare: ['src/assets/scenes-v1/audio/app/hero_original_fanfare_app_pcm16_48k.wav', 'c2b04eba0b553fc17bffad732da7323f06c7b57885f98ccd7b75119c76cb2f14'],
  racer_accelerate_return_brake: ['src/assets/scenes-v1/audio/app/racer_accelerate_return_brake_app_pcm16_48k.wav', '7a5178a1246f6c1a8b49849ab39fb6a3ebd23dbf2a26989bf1f5623fc21534e0'],
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
    expect(sampleScene('racer', 1_600).x).toBeGreaterThan(40)
    expect(sampleScene('racer', 3_000).x).toBeGreaterThan(400)
    expect(sampleScene('racer', 4_500).x).toBeLessThan(sampleScene('racer', 3_000).x)
    expect(Math.abs(sampleScene('racer', 6_600).x)).toBeLessThan(20)
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

  it('does not change the resting curious eyes or mouth', () => {
    const face = featuresFor('curious', 'soft')
    expect(face.left).toMatchObject({ cx: 32, cy: 38, w: 20, h: 28 })
    expect(face.right).toMatchObject({ cx: 68, cy: 38, w: 20, h: 28 })
    expect(face.mouth).toMatchObject({ y: 67, width: 20, curve: 10 })
  })

  it('does not schedule two scenes back to back', () => {
    expect(SCENE_GAP_MS).toBe(7_000)
    expect(nextAmbientScene(null)).toBe('ninja')
    expect(nextAmbientScene('ninja')).toBe('cord_hero')
    expect(nextAmbientScene('sheet_ghost')).toBe('ninja')
    const round = [nextAmbientScene(null)]
    for (let i = 0; i < 3; i += 1) round.push(nextAmbientScene(round[i] ?? null))
    expect(new Set(round).size).toBe(4)
    expect(round.filter((key) => key === 'sheet_ghost')).toHaveLength(1)
    expect(SCENE_CUE.ninja.at).toBe(650)
    expect(SCENE_CUE.cord_hero.at).toBe(0)
    expect(heroCapePath(0, false)).toBe(HERO_CAPE[0])
    expect(heroCapePath(2_000, true)).toBe(HERO_CAPE[0])
    expect(heroCapePath(650 + 325, false)).toBe(HERO_CAPE[1])
    expect(heroCapePath(6_300, false)).toBe(HERO_CAPE[0])
    expect(heroCapePath(1_000, false)).not.toBe(HERO_CAPE[0])
    expect(SCENE_CUE.racer.at).toBe(0)
    expect(SCENE_CUE.sheet_ghost.at).toBe(2_200)
  })
})
