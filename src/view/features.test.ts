import { describe, expect, it } from 'vitest'
import { lookFromDegrees } from '../logic/motion.ts'
import { FaceBlend, featuresFor, oohFeatures } from './features.ts'
import { glanceOffset } from './glance.ts'

describe('face blend', () => {
  it('moves through the shapes instead of swapping at the first frame', () => {
    const blend = new FaceBlend()
    const start = blend.sample('curious', 'soft', false, false, 0)
    blend.sample('happy', 'soft', false, false, 0)
    let mid = start
    for (let left = 180; left > 0; left -= 16) mid = blend.sample('happy', 'soft', false, false, 16)
    let settled = mid
    for (let left = 400; left > 0; left -= 16) settled = blend.sample('happy', 'soft', false, false, 16)
    expect(mid.left.h).toBeLessThan(start.left.h - 4)
    expect(mid.left.h).toBeGreaterThan(settled.left.h + 4)
    expect(mid.left.peak).toBeGreaterThan(2)
    expect(mid.left.peak).toBeLessThan(11)
    expect(settled.left.h).toBeCloseTo(featuresFor('happy', 'soft').left.h, 0)
  })

  it('continues from the in-between face when a reaction interrupts', () => {
    const blend = new FaceBlend()
    blend.sample('curious', 'soft', false, false, 0)
    blend.sample('happy', 'soft', false, false, 0)
    const mid = blend.sample('happy', 'soft', false, false, 140)
    const interrupted = blend.sample('startled', 'soft', false, false, 0)
    expect(interrupted.left.h).toBeCloseTo(mid.left.h, 1)
    expect(interrupted.left.cx).toBeCloseTo(mid.left.cx, 1)
  })

  it('snaps when reduced motion is on and keeps the families apart', () => {
    const blend = new FaceBlend()
    blend.sample('curious', 'soft', false, false, 0)
    const sleepy = blend.sample('sleepy', 'soft', true, false, 0)
    expect(sleepy.left.h).toBeCloseTo(featuresFor('sleepy', 'soft').left.h, 1)
    const curious = featuresFor('curious', 'soft')
    const happy = featuresFor('happy', 'soft')
    const worried = featuresFor('worried', 'soft')
    const ooh = oohFeatures()
    expect(ooh.left.w).toBeGreaterThan(curious.left.w)
    expect(ooh.left.peak).toBe(0)
    expect(ooh.left.h).toBe(curious.left.h)
    expect(ooh.mouth.width).toBeLessThan(12)
    expect(ooh.mouth.curve).toBeLessThan(2)
    expect(ooh.mouth.open).toBeGreaterThan(0)
    expect(curious.mouth.curve).toBeGreaterThan(8)
    expect(curious.mouth.width).toBeGreaterThan(18)
    expect(happy.left.h).toBeLessThan(curious.left.h - 16)
    expect(worried.mouth.open).toBe(1)
    expect(worried.left.h).toBeGreaterThan(curious.left.h)
  })

  it('keeps eyes level and saves blush for the rare wink', () => {
    const ids = ['curious', 'happy', 'laugh', 'shy', 'smug', 'grumpy', 'determined', 'worried', 'startled', 'sleepy', 'pant', 'dizzy', 'wink', 'content', 'yawn'] as const
    const blushed = ids.filter((id) => featuresFor(id, 'soft').blush > 0)
    expect(blushed).toEqual(['wink'])
    for (const id of ids) {
      const face = featuresFor(id, 'soft')
      expect(Math.abs(face.left.rot)).toBeLessThanOrEqual(0)
      expect(Math.abs(face.right.rot)).toBeLessThanOrEqual(0)
      expect(Math.min(face.left.w, face.right.w)).toBeGreaterThan(12)
    }
    expect(featuresFor('laugh', 'soft').mouth.curve).toBeGreaterThan(featuresFor('curious', 'soft').mouth.curve)
    expect(featuresFor('laugh', 'soft').mouth.open).toBe(0)
  })
})

describe('rendered glance', () => {
  it('turns a modest tilt into a shift that is obvious on the face', () => {
    const shift = glanceOffset(lookFromDegrees(10), 0)
    expect(Math.abs(shift.x)).toBeGreaterThan(12)
    expect(Math.abs(glanceOffset(lookFromDegrees(1), 0).x)).toBe(0)
    expect(Math.abs(glanceOffset(1, 0).x)).toBeLessThanOrEqual(18)
    expect(glanceOffset(1, 0.4).rotate).toBe(0)
  })
})
