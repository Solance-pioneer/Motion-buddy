import { describe, expect, it } from 'vitest'
import { allowPetCue, classifyStroke, cueForGesture } from './pet-play.ts'

describe('pet gestures', () => {
  it('gives each gesture one cue and does not pair press with release', () => {
    expect(cueForGesture('squish')).toBe('pet_squish_press')
    expect(cueForGesture('tap')).toBe('pet_spring_release')
    expect(cueForGesture('follow')).toBe('pet_round_chirp')
    expect(cueForGesture('dodge')).toBe('pet_content_wobble')
    expect(cueForGesture('tuck')).toBe('pet_soft_squeak')
    expect(cueForGesture('squish')).not.toBe(cueForGesture('tap'))
  })

  it('squishes on the face, follows a small stroke, and dodges a flick', () => {
    expect(classifyStroke(true, false)).toBe('squish')
    expect(classifyStroke(true, true)).toBe('squish')
    expect(classifyStroke(false, false)).toBe('follow')
    expect(classifyStroke(false, true)).toBe('dodge')
  })

  it('spaces a repeated cue and lets a different gesture through', () => {
    expect(allowPetCue('pet_squish_press', 0, 'pet_squish_press', 400)).toBe(false)
    expect(allowPetCue('pet_squish_press', 0, 'pet_squish_press', 900)).toBe(true)
    expect(allowPetCue('pet_squish_press', 0, 'pet_round_chirp', 120)).toBe(true)
  })
})