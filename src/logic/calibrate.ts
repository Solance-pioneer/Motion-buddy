/** Shown after Set neutral. The cradle zero itself stays in the tilt sensor. */
export const CALIBRATE_NOTE = 'Neutral set'
export const CALIBRATE_NOTE_MS = 1_200

/** Motion already on: one tap. Waiting on the permission gesture: that tap, then the next one confirms. */
export function calibrateTaps(motionReady: boolean): 1 | 2 {
  return motionReady ? 1 : 2
}
