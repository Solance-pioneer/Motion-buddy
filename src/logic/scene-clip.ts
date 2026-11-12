/** Full-screen scene films. They are not the ambient costume cycle. */
export const BRAKE_CLIP_COOLDOWN_MS = 20_000

export type SceneClip = 'race-rush' | 'brake-surprise'

export interface ClipClock {
  playing: SceneClip | null
  brakeReadyAt: number
}

export function initialClipClock(): ClipClock {
  return { playing: null, brakeReadyAt: 0 }
}

/** The video element uses this. Mute silences the clip; it does not skip it. */
export function sceneClipMuted(soundMuted: boolean): boolean {
  return soundMuted
}

/**
 * Start one clip. Reduced motion skips. A clip that is already up blocks another.
 * Brake waits out its cooldown. Race does not use that cooldown.
 */
export function beginSceneClip(
  clock: ClipClock,
  request: SceneClip,
  now: number,
  reduced: boolean,
): { clock: ClipClock; play: SceneClip | null } {
  if (reduced || clock.playing) return { clock, play: null }
  if (request === 'brake-surprise' && now < clock.brakeReadyAt) return { clock, play: null }
  return {
    clock: {
      playing: request,
      brakeReadyAt: request === 'brake-surprise' ? now + BRAKE_CLIP_COOLDOWN_MS : clock.brakeReadyAt,
    },
    play: request,
  }
}

/** End, skip, error, a rejected play(), or hiding the app all clear the clip. */
export function endSceneClip(clock: ClipClock): ClipClock {
  if (!clock.playing) return clock
  return { ...clock, playing: null }
}
