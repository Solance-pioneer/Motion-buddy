/** Give up if a clip has not produced a frame within this long. */
export const CLIP_PLAY_TIMEOUT_MS = 4_000

/** Opacity fade for a clip that has a frame, in and out. */
export const CLIP_FADE_MS = 150

/** Touch-cancel returns to the live face without waiting on the full fade. */
export const CLIP_CANCEL_FADE_MS = 80

/** Reduced motion is instant. Cancel stays at or under CLIP_CANCEL_FADE_MS. Errors do not linger. */
export function clipFadeMs(kind: 'show' | 'end' | 'cancel' | 'error', reduced: boolean): number {
  if (reduced || kind === 'error') return 0
  if (kind === 'cancel') return CLIP_CANCEL_FADE_MS
  return CLIP_FADE_MS
}

export type ClipAudibleAttempt = 'unmuted' | 'muted'

/**
 * Idle clips are started by the timer, not by a tap. Mobile browsers reject
 * play() on an unmuted element without a user gesture. The gallery button is a
 * tap, so it may start unmuted. Every other start begins muted.
 */
export function clipShouldStartMuted(input: { fromGallery: boolean; soundOn: boolean; gestureUnlocked: boolean }): boolean {
  if (!input.soundOn || !input.gestureUnlocked) return true
  return !input.fromGallery
}

/** Unmuted rejection retries muted. A muted rejection is a real failure. */
export function afterPlayRejection(attempt: ClipAudibleAttempt): 'retry-muted' | 'fail' {
  return attempt === 'unmuted' ? 'retry-muted' : 'fail'
}

/** Unmute only after a gesture has primed playback, and only when sound is on. */
export function clipMayUnmute(input: { soundOn: boolean; userMuted: boolean; primed: boolean }): boolean {
  return input.soundOn && !input.userMuted && input.primed
}

/** Race-on keeps the rush and race-start pictures, and leaves their own audio off. */
export function activationFilmMuted(activation: boolean): boolean {
  return activation
}

/** A playing event at time 0 is still a black frame. Wait for a presented frame or a moved clock. */
export function clipOverlayRevealed(currentTime: number, presentedFrame: boolean): boolean {
  return presentedFrame || currentTime > 0
}
