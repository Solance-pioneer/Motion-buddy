import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COUNTRY_WAV_BASE64 } from './country-wavs.ts'
import {
  COUNTRY_GAIN,
  COUNTRY_MS,
  COUNTRY_ORDER,
  pickCountry,
  sampleCountry,
  TRANSITION_MS,
  USA_GRAB_S,
} from './countries.ts'
import { SCENE_MS, nextAmbientScene } from './scenes.ts'

const files = {
  uk_guard_march: ['src/assets/scenes-v2/audio/app/uk_guard_march_app_pcm16_48k.wav', '4aff97692ad6fe8bbbbd7614f4f58f4f8668ec5b3e138b73c71a850fa5959f6c'],
  france_cafe_waltz: ['src/assets/scenes-v2/audio/app/france_cafe_waltz_app_pcm16_48k.wav', '1d9615a9ffee8b87e91f2c26f17d357edb470a2166077da4c3e49b7127a5d59d'],
  usa_anthem_eagle: ['src/assets/scenes-v2/audio/app/usa_anthem_eagle_app_pcm16_48k.wav', '43b4f60ed0336f380123bc0ce64adbee69c45410bbbbe4257682b666adc25429'],
  egypt_cinematic: ['src/assets/scenes-v2/audio/app/egypt_cinematic_app_pcm16_48k.wav', '64c464fa653df9f08b141f717d56cf4f6d7ade02829f22054d48504d911ad3c2'],
} as const

describe('country scenes', () => {
  it('keeps the supplied app cue bytes and the 0.68 gain', () => {
    expect(COUNTRY_GAIN).toBe(0.68)
    for (const [key, [path, hash]] of Object.entries(files)) {
      const bytes = readFileSync(path)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
      const embedded = Buffer.from(COUNTRY_WAV_BASE64[key as keyof typeof COUNTRY_WAV_BASE64], 'base64')
      expect(createHash('sha256').update(embedded).digest('hex')).toBe(hash)
    }
  })

  it('runs each country for its full length and returns to a plain pose', () => {
    expect(COUNTRY_MS).toEqual({ uk_guard: 8_000, france_cafe: 8_000, usa_eagle: 9_000, egypt_pharaoh: 9_500 })
    expect(TRANSITION_MS).toEqual({ normal: 280, reduced: 420 })
    for (const key of COUNTRY_ORDER) {
      const done = sampleCountry(key, COUNTRY_MS[key])
      expect(done.done).toBe(true)
      expect(done.tx).toBe(0)
      expect(done.ty).toBe(0)
      expect(done.sx).toBe(1)
      expect(done.sy).toBe(1)
      for (const layer of Object.values(done.layers)) expect(layer.opacity).toBe(0)
    }
  })

  it('stops the UK march at 6.6s and does not step the later beats', () => {
    const marching = sampleCountry('uk_guard', 3_000)
    expect(Math.abs(marching.tx)).toBeGreaterThan(5)
    expect(marching.layers['overlay:uk_guard'].opacity).toBe(1)
    expect(marching.layers['prop:uk_big_ben'].opacity).toBeCloseTo(0.72, 2)
    const halted = sampleCountry('uk_guard', 6_700)
    expect(halted.tx).toBe(0)
    expect(halted.ty).toBe(12)
    const afterListedBeat = sampleCountry('uk_guard', 7_170)
    expect(afterListedBeat.tx).toBe(0)
    expect(sampleCountry('uk_guard', 3_000, true).tx).toBe(0)
  })

  it('grabs Buddy on the precise USA marker, not the prose times', () => {
    expect(USA_GRAB_S).toBe(2.7938)
    const before = sampleCountry('usa_eagle', 2_700)
    expect(before.tx).toBe(0)
    expect(before.ty).toBe(0)
    expect(before.sx).toBe(1)
    const atMarker = sampleCountry('usa_eagle', 2_793)
    expect(atMarker.ty).toBe(0)
    const lifted = sampleCountry('usa_eagle', 3_050)
    expect(lifted.ty).toBeLessThan(0)
    expect(sampleCountry('usa_eagle', 2_200, true).tx).toBe(0)
    expect(sampleCountry('usa_eagle', 2_200, true).layers['prop:us_eagle'].tx).toBe(0)
  })

  it('keeps France and Egypt on their tracks without joining the costume cycle', () => {
    const france = sampleCountry('france_cafe', 3_500)
    expect(Math.abs(france.tx)).toBeGreaterThan(1)
    expect(france.layers['overlay:france_cafe'].opacity).toBe(1)
    expect(france.layers['prop:france_eiffel_tower'].opacity).toBeCloseTo(0.72, 2)
    expect(sampleCountry('france_cafe', 3_000, true).tx).toBe(0)
    const egypt = sampleCountry('egypt_pharaoh', 5_500)
    expect(egypt.tx).toBeLessThan(-20)
    expect(egypt.layers['prop:egypt_pyramids'].scaleY).toBe(1)
    expect(sampleCountry('egypt_pharaoh', 5_500, true).tx).toBe(0)
    expect(sampleCountry('egypt_pharaoh', 5_500, true).layers['prop:egypt_pyramids'].scaleY).toBe(1)
    expect(SCENE_MS).toEqual({ ninja: 6_000, cord_hero: 7_000, racer: 7_000, sheet_ghost: 7_500 })
    expect(nextAmbientScene('sheet_ghost')).toBe('ninja')
    expect(pickCountry(0)).toBe('uk_guard')
    expect(pickCountry(0.25)).toBe('france_cafe')
    expect(pickCountry(0.5)).toBe('usa_eagle')
    expect(pickCountry(0.75)).toBe('egypt_pharaoh')
    expect(pickCountry(0.99)).toBe('egypt_pharaoh')
  })
})
