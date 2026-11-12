import { CONTACT_WAV_BASE64 } from './contact-wavs.ts'
import { PET_GLIDE_WAV_BASE64 } from './pet-glide-wav.ts'
import { SCENE_ORDER, type SceneKey } from './scenes.ts'

/**
 * Which recording is Buddy's ooh.
 * 'contact' is the 2.8s curious contact clip. 'glide' is the 1.8s pet glide.
 */
export const OOH_SOURCE: 'contact' | 'glide' = 'contact'

/** Delivered share after the two-in-a-row cap. The roll is higher so the cap still lands near 55%. */
export const OOH_PET_WEIGHT = 0.55
const OOH_ROLL = 0.71
export const OOH_MAX_RUN = 2
export const OOH_IDLE_COOLDOWN_MS = 45_000
export const OOH_FACE_MS = 1_800
export const OOH_RELEASE_FADE_MS = 130

/** The 2.8s contact clip is cut in playback to about one gesture. The file itself stays whole. */
export const OOH_MAX_MS = 1_400
export const OOH_CAP_FADE_MS = 180

const PET_NOTES = ['pet_soft_squeak', 'pet_round_chirp', 'pet_content_wobble', 'pet_squish_press', 'pet_spring_release'] as const
export type OohPetNote = (typeof PET_NOTES)[number]
export type PetChoice = 'ooh' | OohPetNote
export type CodedIdleId = SceneKey | 'ooh'

const CODED_WITH_OOH: readonly CodedIdleId[] = [...SCENE_ORDER, 'ooh']

export function oohClip(): { key: string; b64: string } {
  if (OOH_SOURCE === 'glide') return { key: 'curious_pet_glide', b64: PET_GLIDE_WAV_BASE64 }
  return { key: 'curious_contact_loop', b64: CONTACT_WAV_BASE64.curious_contact_loop }
}

/** 55% ooh. The other pet notes share the rest. A third ooh in a row is refused. */
export function choosePetNote(random: number, recentOohs: number): PetChoice {
  const roll = Math.min(0.999999, Math.max(0, random))
  if (recentOohs < OOH_MAX_RUN && roll < OOH_ROLL) return 'ooh'
  const span = recentOohs < OOH_MAX_RUN ? (roll - OOH_ROLL) / (1 - OOH_ROLL) : roll
  const index = Math.min(PET_NOTES.length - 1, Math.floor(span * PET_NOTES.length))
  return PET_NOTES[index]
}

export function noteOohRun(recentOohs: number, choice: PetChoice): number {
  return choice === 'ooh' ? recentOohs + 1 : 0
}

/** One ooh for a drag stroke. A stroke that is already sounding does not start another. */
export function dragOohCue(alreadySounding: boolean): 'ooh' | null {
  return alreadySounding ? null : 'ooh'
}

export function oohIdleDue(lastAt: number, now: number): boolean {
  return now - lastAt >= OOH_IDLE_COOLDOWN_MS
}

/** Release fade stays inside 100–150ms. */
export function oohReleaseSeconds(ms = OOH_RELEASE_FADE_MS): number {
  return Math.max(0.1, Math.min(0.15, ms / 1000))
}

/** Fade at the end of a capped contact ooh, inside 150–200ms. */
export function oohCapFadeSeconds(ms = OOH_CAP_FADE_MS): number {
  return Math.max(0.15, Math.min(0.2, ms / 1000))
}

/** Contact ooh stops near OOH_MAX_MS. The glide alternative is already a short take and is not cut. */
export function oohPlaybackCap(source: 'contact' | 'glide' = OOH_SOURCE): { maxMs: number; fadeMs: number } | null {
  if (source !== 'contact') return null
  return { maxMs: OOH_MAX_MS, fadeMs: OOH_CAP_FADE_MS }
}

/** Costumes plus the ooh expression, in that order. Disabled ids are left out. */
export function nextCodedIdle(previous: string | null, allowed?: ReadonlySet<string> | null): CodedIdleId | null {
  const pool = CODED_WITH_OOH.filter((id) => !allowed || allowed.has(id))
  if (pool.length === 0) return null
  if (!previous) return pool[0]
  const index = pool.indexOf(previous as CodedIdleId)
  return pool[(index < 0 ? 0 : index + 1) % pool.length]
}
