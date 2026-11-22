import type { GenreSound } from './genre-pack.ts'

/**
 * Per-beat genre stings are switched off.
 * All 25 genre looks stay selectable and their drawings are unchanged.
 * Beat detection still drives the visuals. This does not start an oscillator.
 */
export function playGenreSting(_sound: GenreSound, _party: boolean, _access: { muted: boolean; unlocked: boolean; reduced: boolean }): boolean {
  return false
}
