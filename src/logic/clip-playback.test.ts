import { describe, expect, it } from 'vitest'
import {
  CLIP_CANCEL_FADE_MS,
  CLIP_FADE_MS,
  CLIP_PLAY_TIMEOUT_MS,
  afterPlayRejection,
  clipFadeMs,
  clipMayUnmute,
  clipOverlayRevealed,
  clipShouldStartMuted,
} from './clip-playback.ts'

describe('idle clip playback', () => {
  it('starts an idle clip muted even when sound is on', () => {
    expect(clipShouldStartMuted({ fromGallery: false, soundOn: true, gestureUnlocked: true })).toBe(true)
    expect(clipShouldStartMuted({ fromGallery: false, soundOn: true, gestureUnlocked: false })).toBe(true)
    expect(clipShouldStartMuted({ fromGallery: true, soundOn: true, gestureUnlocked: true })).toBe(false)
    expect(clipShouldStartMuted({ fromGallery: true, soundOn: false, gestureUnlocked: true })).toBe(true)
    expect(clipShouldStartMuted({ fromGallery: true, soundOn: true, gestureUnlocked: false })).toBe(true)
  })

  it('retries a rejected unmuted play as muted, then fails', () => {
    expect(afterPlayRejection('unmuted')).toBe('retry-muted')
    expect(afterPlayRejection('muted')).toBe('fail')
  })

  it('unmutes only after a gesture prime when the user has not muted', () => {
    expect(clipMayUnmute({ soundOn: true, userMuted: false, primed: true })).toBe(true)
    expect(clipMayUnmute({ soundOn: true, userMuted: false, primed: false })).toBe(false)
    expect(clipMayUnmute({ soundOn: true, userMuted: true, primed: true })).toBe(false)
    expect(clipMayUnmute({ soundOn: false, userMuted: false, primed: true })).toBe(false)
  })

  it('keeps the clip hidden until a frame is actually playing', () => {
    expect(CLIP_PLAY_TIMEOUT_MS).toBeGreaterThan(1_000)
    expect(clipOverlayRevealed(0, false)).toBe(false)
    expect(clipOverlayRevealed(0, true)).toBe(true)
    expect(clipOverlayRevealed(0.04, false)).toBe(true)
  })

  it('fades scene clips over 150ms, skips the fade for reduced motion, and cancels quickly', () => {
    expect(CLIP_FADE_MS).toBe(150)
    expect(clipFadeMs('show', false)).toBe(CLIP_FADE_MS)
    expect(clipFadeMs('end', false)).toBe(CLIP_FADE_MS)
    expect(clipFadeMs('cancel', false)).toBe(CLIP_CANCEL_FADE_MS)
    expect(clipFadeMs('cancel', false)).toBeLessThanOrEqual(80)
    expect(clipFadeMs('show', true)).toBe(0)
    expect(clipFadeMs('end', true)).toBe(0)
    expect(clipFadeMs('cancel', true)).toBe(0)
    expect(clipFadeMs('error', false)).toBe(0)
  })
})
