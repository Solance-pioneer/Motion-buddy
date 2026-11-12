import { describe, expect, it } from 'vitest'
import { CALIBRATE_NOTE, CALIBRATE_NOTE_MS, calibrateTaps } from './calibrate.ts'

describe('calibrate', () => {
  it('reuses one confirmation and takes one tap when motion is already on', () => {
    expect(calibrateTaps(true)).toBe(1)
    expect(calibrateTaps(false)).toBe(2)
    expect(CALIBRATE_NOTE).toBe('Neutral set')
    expect(CALIBRATE_NOTE_MS).toBe(1_200)
  })
})
