export type PetGesture = 'tap' | 'follow' | 'squish' | 'dodge' | 'tuck'

export type PetNoteName = 'pet_soft_squeak' | 'pet_round_chirp' | 'pet_content_wobble' | 'pet_squish_press' | 'pet_spring_release'

/** One finite cue for the gesture. A squish does not also play the spring. */
export function cueForGesture(gesture: PetGesture): PetNoteName {
  switch (gesture) {
    case 'tap':
      return 'pet_spring_release'
    case 'follow':
      return 'pet_round_chirp'
    case 'squish':
      return 'pet_squish_press'
    case 'dodge':
      return 'pet_content_wobble'
    case 'tuck':
      return 'pet_soft_squeak'
  }
}

export function classifyStroke(onFace: boolean, fast: boolean): 'squish' | 'dodge' | 'follow' {
  if (onFace) return 'squish'
  if (fast) return 'dodge'
  return 'follow'
}

/** Same cue waits. A different deliberate gesture can sound immediately. */
export function allowPetCue(lastKey: string, lastAt: number, key: string, now: number, gapMs = 900): boolean {
  if (!lastKey || key !== lastKey) return true
  return now - lastAt >= gapMs
}
