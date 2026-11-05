import { describe, expect, it } from 'vitest'
import { inverseSmoothstep, smoothstep } from './math.ts'
import {
  CURIOUS_DWELL_MS,
  elapsedForBlend,
  GRUMPY_DWELL_MS,
  MOOD_CYCLE_MS,
  sampleAutoMood,
  TRANSITION_MS,
} from './mood.ts'

describe('sampleAutoMood', () => {
  it('rests on curious, shifts, rests on grumpy, and shifts back', () => {
    expect(sampleAutoMood(1_000)).toMatchObject({ blend: 0, phase: 'dwell', settled: 'curious' })
    expect(sampleAutoMood(CURIOUS_DWELL_MS - 1)).toMatchObject({ blend: 0, phase: 'dwell' })

    const mid = sampleAutoMood(CURIOUS_DWELL_MS + TRANSITION_MS / 2)
    expect(mid.phase).toBe('transition')
    expect(mid.blend).toBeCloseTo(0.5, 5)

    const grumpyAt = CURIOUS_DWELL_MS + TRANSITION_MS + 2_000
    expect(sampleAutoMood(grumpyAt)).toMatchObject({ blend: 1, phase: 'dwell', settled: 'grumpy' })

    const back = sampleAutoMood(CURIOUS_DWELL_MS + TRANSITION_MS + GRUMPY_DWELL_MS + TRANSITION_MS / 2)
    expect(back.phase).toBe('transition')
    expect(back.blend).toBeCloseTo(0.5, 5)
    const curiousAgain = sampleAutoMood(CURIOUS_DWELL_MS + TRANSITION_MS + GRUMPY_DWELL_MS + TRANSITION_MS - 1)
    expect(curiousAgain.settled).toBe('curious')
    expect(curiousAgain.blend).toBeLessThan(0.02)

    expect(sampleAutoMood(MOOD_CYCLE_MS)).toMatchObject(sampleAutoMood(0))
    expect(sampleAutoMood(MOOD_CYCLE_MS + 500)).toMatchObject(sampleAutoMood(500))
  })

  it('keeps each dwell long enough to read', () => {
    expect(CURIOUS_DWELL_MS).toBeGreaterThanOrEqual(10_000)
    expect(GRUMPY_DWELL_MS).toBeGreaterThanOrEqual(8_000)
    expect(TRANSITION_MS).toBeGreaterThanOrEqual(1_200)
    expect(TRANSITION_MS).toBeLessThanOrEqual(2_500)
  })

  it('resumes a blend without popping to the other mood', () => {
    const elapsed = elapsedForBlend(0.5)
    expect(sampleAutoMood(elapsed).blend).toBeCloseTo(0.5, 2)
    expect(sampleAutoMood(elapsedForBlend(0)).blend).toBe(0)
    expect(sampleAutoMood(elapsedForBlend(1)).blend).toBe(1)
  })
})

describe('smoothstep', () => {
  it('is flat at the ends and halfway in the middle', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5)
    expect(inverseSmoothstep(smoothstep(0.35))).toBeCloseTo(0.35, 4)
  })
})
