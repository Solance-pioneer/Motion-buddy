import { describe, expect, it } from 'vitest'
import { eyePath, featuresFor } from '../view/features.ts'
import { ACTION_IDS, CANDIDATES, EXPRESSION_IDS, sampleAudition, sampleCandidate } from './catalog.ts'

describe('catalog', () => {
  it('has a large distinct set of expressions and actions', () => {
    expect(EXPRESSION_IDS.length).toBeGreaterThanOrEqual(32)
    expect(ACTION_IDS.length).toBeGreaterThanOrEqual(16)
    expect(CANDIDATES.length).toBe(EXPRESSION_IDS.length + ACTION_IDS.length)
    expect(new Set(CANDIDATES.map((item) => item.id)).size).toBe(CANDIDATES.length)
    const heights = EXPRESSION_IDS.map((id) => sampleCandidate(id, 0).features.left.h)
    expect(new Set(heights.map((value) => Math.round(value))).size).toBeGreaterThan(6)
    const curves = EXPRESSION_IDS.map((id) => sampleCandidate(id, 0).features.mouth.curve)
    expect(Math.max(...curves) - Math.min(...curves)).toBeGreaterThan(8)
  })

  it('keeps blush rare and eyes level', () => {
    const blushed = CANDIDATES.filter((item) => item.blush).map((item) => item.id)
    expect(blushed).toEqual(['wink'])
    for (const id of EXPRESSION_IDS) {
      const frame = sampleCandidate(id, 0)
      expect(frame.features.left.rot).toBe(0)
      expect(frame.features.right.rot).toBe(0)
    }
  })

  it('draws closed eyes as a clean crescent, not a lumpy peak', () => {
    const eye = featuresFor('happy', 'soft').left
    const path = eyePath(eye)
    const controls = [...path.matchAll(/Q [\d.-]+ ([\d.-]+)/g)].map((match) => Number(match[1]))
    const rise = eye.cy - Math.min(...controls)
    expect(rise).toBeGreaterThan(4)
    expect(rise).toBeLessThanOrEqual(eye.w * 0.5)
    expect(path.split('Q').length).toBe(3)
  })

  it('plays an action instead of freezing, and labels motion previews with opposite gazes', () => {
    const blink = [0, 400, 800].map((t) => sampleCandidate('blink', t).blink)
    expect(Math.max(...blink)).toBeGreaterThan(0.5)
    expect(blink[0]).toBeLessThan(0.2)
    const left = sampleAudition('shock-left', 600)
    const right = sampleAudition('shock-left', 1800)
    expect(left.gazeX).toBeLessThan(-0.8)
    expect(right.gazeX).toBeGreaterThan(0.8)
  })
})
