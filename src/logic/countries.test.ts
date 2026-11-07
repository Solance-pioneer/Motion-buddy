import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COUNTRY_WAV_BASE64 } from './country-wavs.ts'
import {
  COUNTRY_GAIN,
  COUNTRY_MS,
  COUNTRY_ORDER,
  EGYPT_WONDER_S,
  pickCountry,
  sampleCountry,
  takeCountryTurn,
  TRANSITION_MS,
  UK_MARCH_BEATS_S,
  USA_GRAB_S,
} from './countries.ts'
import { SCENE_MS, nextAmbientScene } from './scenes.ts'

const files = {
  uk_guard_march: ['src/assets/scenes-v2/audio/app/uk_guard_march_app_pcm16_48k.wav', '4aff97692ad6fe8bbbbd7614f4f58f4f8668ec5b3e138b73c71a850fa5959f6c'],
  france_cafe_waltz: ['src/assets/scenes-v2/audio/app/france_cafe_waltz_app_pcm16_48k.wav', '1d9615a9ffee8b87e91f2c26f17d357edb470a2166077da4c3e49b7127a5d59d'],
  usa_anthem_eagle: ['src/assets/scenes-v2/audio/app/usa_anthem_eagle_app_pcm16_48k.wav', '43b4f60ed0336f380123bc0ce64adbee69c45410bbbbe4257682b666adc25429'],
  egypt_cinematic: ['src/assets/scenes-v2/audio/app/egypt_cinematic_app_pcm16_48k.wav', '64c464fa653df9f08b141f717d56cf4f6d7ade02829f22054d48504d911ad3c2'],
  egypt_wonder_once: ['src/assets/scenes-v2/audio/app/egypt_wonder_once_app_pcm16_48k.wav', 'f9aa04a607e519af7e1b8644eb375866b67ebf15ac75f94f37bdef3b71ebe3a2'],
  uk_soft_march_once: ['src/assets/scenes-v2/audio/app/uk_soft_march_once_app_pcm16_48k.wav', 'a6f1e98d53edd38042a696308c7f26798ea832cfc631a98cd9ec816860fa1b68'],
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

  it('steps the UK march on the soft-march beats and is home by 7s', () => {
    expect(UK_MARCH_BEATS_S).toEqual([1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25, 4.75, 5.25, 5.75, 6.25, 6.75])
    const left = sampleCountry('uk_guard', 3_250)
    const right = sampleCountry('uk_guard', 3_750)
    expect(left.tx).toBeLessThan(-40)
    expect(right.tx).toBeGreaterThan(40)
    expect(left.layers['overlay:uk_guard'].opacity).toBe(1)
    expect(left.layers['prop:uk_big_ben'].opacity).toBeCloseTo(0.72, 2)
    expect(Math.abs(sampleCountry('uk_guard', 6_750).tx)).toBeGreaterThan(40)
    expect(sampleCountry('uk_guard', 7_170).tx).toBe(0)
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
    expect(lifted.sx).toBeLessThan(0.8)
    const carried = sampleCountry('usa_eagle', 4_500)
    expect(carried.sx).toBeLessThan(0.6)
    expect(Math.abs(carried.tx - carried.layers['prop:us_eagle'].tx)).toBeLessThan(1)
    expect(sampleCountry('usa_eagle', 2_200, true).tx).toBe(0)
    expect(sampleCountry('usa_eagle', 2_200, true).layers['prop:us_eagle'].tx).toBe(0)
  })

  it('keeps France and Egypt on their tracks without joining the costume cycle', () => {
    const france = sampleCountry('france_cafe', 3_500)
    expect(Math.abs(france.tx)).toBeGreaterThan(1)
    expect(france.layers['overlay:france_cafe'].opacity).toBe(1)
    expect(france.layers['prop:france_eiffel_tower'].opacity).toBeCloseTo(0.72, 2)
    expect(createHash('sha256').update(readFileSync('src/assets/scenes-v2/svg/props/france_eiffel_tower.svg')).digest('hex')).toBe(
      '57e13c7996127d6ca10d9ffcc61500b79446b75200437ff8ea7f9ded143ad631',
    )
    expect(createHash('sha256').update(readFileSync('src/assets/scenes-v2/svg/props/usa_statue_of_liberty.svg')).digest('hex')).toBe(
      '4f71ab5d51eb50fe10b00dca8b848ca955cacb4dd31acb04f5c8ef70494b2844',
    )
    expect(sampleCountry('france_cafe', 3_000, true).tx).toBe(0)
    const egypt = sampleCountry('egypt_pharaoh', 5_500)
    expect(EGYPT_WONDER_S).toBe(3)
    expect(egypt.ty).toBeLessThan(-40)
    expect(egypt.sx).toBeLessThan(0.55)
    expect(egypt.layers['overlay:egypt_pharaoh'].opacity).toBe(1)
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

  it('visits each country once per cycle and does not spend a locked press', () => {
    let cursor = 0
    const take = (accepted: boolean) => {
      const turn = takeCountryTurn(cursor, accepted)
      cursor = turn.cursor
      return turn.key
    }
    const first = Array.from({ length: 4 }, () => take(true))
    const second = Array.from({ length: 4 }, () => take(true))
    expect(first).toEqual(['uk_guard', 'france_cafe', 'usa_eagle', 'egypt_pharaoh'])
    expect(new Set(first).size).toBe(4)
    expect(second).toEqual(first)
    expect(first[3]).not.toBe(second[0])
    const before = cursor
    expect(take(false)).toBeNull()
    expect(cursor).toBe(before)
    expect(take(true)).toBe('uk_guard')
  })
})
