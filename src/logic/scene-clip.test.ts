import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginSceneClip, BRAKE_CLIP_COOLDOWN_MS, endSceneClip, initialClipClock, sceneClipMuted } from './scene-clip.ts'

const files = {
  'src/assets/scene-clips-v1/buddy-anime-speed-rush-v2.mp4': '2eee896cb96d05c286255775d06c121c8813057787074ba346eea9a0d215996c',
  'src/assets/scene-clips-v1/buddy-brake-surprised-v1.mp4': 'c310e7a992d0c06d163587b2bfe81549db4db0d80c66aa900f1208b7633ab51d',
} as const

describe('scene clips', () => {
  it('keeps the approved film bytes', () => {
    for (const [path, hash] of Object.entries(files)) {
      expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(hash)
    }
  })

  it('plays the race clip once, skips reduced motion, and restores on end', () => {
    expect(sceneClipMuted(true)).toBe(true)
    expect(sceneClipMuted(false)).toBe(false)
    const started = beginSceneClip(initialClipClock(), 'race-rush', 0, false)
    expect(started.play).toBe('race-rush')
    expect(beginSceneClip(started.clock, 'race-rush', 10, false).play).toBeNull()
    expect(beginSceneClip(started.clock, 'brake-surprise', 10, false).play).toBeNull()
    const reduced = beginSceneClip(initialClipClock(), 'race-rush', 0, true)
    expect(reduced.play).toBeNull()
    expect(reduced.clock.playing).toBeNull()
    const restored = endSceneClip(started.clock)
    expect(restored.playing).toBeNull()
    expect(beginSceneClip(restored, 'race-rush', 100, false).play).toBe('race-rush')
    expect(endSceneClip(restored)).toBe(restored)
  })

  it('plays the brake clip once and blocks a retrigger until the cooldown', () => {
    expect(BRAKE_CLIP_COOLDOWN_MS).toBe(20_000)
    const first = beginSceneClip(initialClipClock(), 'brake-surprise', 1_000, false)
    expect(first.play).toBe('brake-surprise')
    expect(first.clock.brakeReadyAt).toBe(21_000)
    const ended = endSceneClip(first.clock)
    expect(ended.playing).toBeNull()
    expect(beginSceneClip(ended, 'brake-surprise', 20_999, false).play).toBeNull()
    expect(beginSceneClip(ended, 'brake-surprise', 21_000, false).play).toBe('brake-surprise')
    const reduced = beginSceneClip(ended, 'brake-surprise', 21_000, true)
    expect(reduced.play).toBeNull()
    expect(reduced.clock.brakeReadyAt).toBe(ended.brakeReadyAt)
  })
})
