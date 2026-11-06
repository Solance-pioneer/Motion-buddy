import { describe, expect, it } from 'vitest'
import { eyePath, type EyeSpec } from '../view/features.ts'
import { ACTION_IDS, CANDIDATES, EXPRESSION_IDS, sampleAudition, sampleCandidate } from './catalog.ts'

function mixEye(a: EyeSpec, b: EyeSpec, t: number): EyeSpec {
  const m = (x: number, y: number) => x + (y - x) * t
  return {
    cx: m(a.cx, b.cx),
    cy: m(a.cy, b.cy),
    w: m(a.w, b.w),
    h: m(a.h, b.h),
    peak: m(a.peak, b.peak),
    rot: 0,
    radius: m(a.radius, b.radius),
  }
}

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

  it('draws every candidate and the frames between them as a lens, not a pointy block', () => {
    const samples = []
    for (const id of EXPRESSION_IDS) samples.push(sampleCandidate(id, 0).features.left, sampleCandidate(id, 0).features.right)
    const curious = sampleCandidate('curious', 0).features
    const beam = sampleCandidate('beam', 0).features
    const sleepy = sampleCandidate('sleepy', 0).features
    for (const t of [0.25, 0.5, 0.75]) {
      samples.push(mixEye(curious.left, beam.left, t), mixEye(curious.left, sleepy.left, t))
    }
    for (const eye of samples) {
      const path = eyePath(eye)
      expect(path.includes('Q')).toBe(false)
      expect(path.split('C').length).toBe(5)
      if (eye.peak <= 0) {
        const right = eye.cx + eye.w / 2
        expect(path).toContain(`${right.toFixed(1)} ${eye.cy.toFixed(1)}`)
      }
    }
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
