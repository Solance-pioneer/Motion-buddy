/**
 * Car mode only. Desk reactions stay on the numbers in `reactions.ts` and `sfx.ts`.
 * Each gate is about 3–3.5× the desk value, so ordinary driving does not annoy him
 * and a big jolt still can.
 */
/** Desk gentle band (medium sensitivity) is 0.9. */
export const CAR_ANNOY_GENTLE = 3.2
/** Desk fast band (medium sensitivity) is 3.4. */
export const CAR_ANNOY_FAST = 12
/** Desk gentle hold is 280ms. */
export const CAR_ANNOY_HOLD_MS = 900
/** Desk fast hold is 160ms. */
export const CAR_ANNOY_FAST_HOLD_MS = 480
/** Desk reaction cooldown and grumpy quiet time are 4000ms. */
export const CAR_ANNOY_COOLDOWN_MS = 14_000
