import { describe, expect, it } from 'vitest'
import { boxInside, mouthContained, mouthPathExtent, type FitBox } from './mouth-fit.ts'

/** Captured at scene 3778 ms, upside-down hero, grumpy blend. Node present, opacity 1. */
const THIN_PATH = 'M 40.7 70.4 Q 50.0 69.9 59.3 70.4 Q 50.0 69.8 40.7 70.4 Z'
const THIN_BOX: FitBox = {
  x: 390.01251220703125,
  y: 90.05567932128906,
  width: 59.482177734375,
  height: 0.959381103515625,
  right: 390.01251220703125 + 59.482177734375,
  bottom: 90.05567932128906 + 0.959381103515625,
}
const CHIN: FitBox = {
  x: 300.4693603515625,
  y: 39.687652587890625,
  right: 543.5150146484375,
  bottom: 279.53533935546875,
  width: 243.045654296875,
  height: 239.84768676757812,
}

describe('mouth containment', () => {
  it('accepts the captured subpixel grumpy mouth when it sits in the mask', () => {
    const extent = mouthPathExtent(THIN_PATH)
    expect(extent.valid).toBe(true)
    expect(extent.height).toBeGreaterThan(0)
    expect(extent.height).toBeLessThan(1)
    expect(THIN_BOX.height).toBeLessThan(1)
    expect(THIN_BOX.height).toBeGreaterThan(0)
    expect(mouthContained({ path: THIN_PATH, box: THIN_BOX, chin: CHIN })).toBe(true)
  })

  it('rejects a collapsed, missing, nonfinite, or letter-only mouth', () => {
    const flat: FitBox = { ...THIN_BOX, height: 0, bottom: THIN_BOX.y }
    const dot: FitBox = { ...THIN_BOX, width: 0, height: 0, right: THIN_BOX.x, bottom: THIN_BOX.y }
    expect(mouthContained({ path: THIN_PATH, box: flat, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: THIN_PATH, box: dot, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: THIN_PATH, box: null, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: THIN_PATH, box: { ...THIN_BOX, height: Number.NaN, bottom: Number.NaN }, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: null, box: THIN_BOX, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: 'M Q', box: THIN_BOX, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: 'MQ', box: THIN_BOX, chin: CHIN })).toBe(false)
    expect(mouthContained({ path: 'M 0 0 Q 0 0 0 0 Z', box: THIN_BOX, chin: CHIN })).toBe(false)
    expect(mouthPathExtent('M 40 70 Q 50 70 60 70 Q 50 70 40 70 Z').valid).toBe(false)
  })

  it('rejects positive geometry that sits outside the mask', () => {
    const outside: FitBox = { ...THIN_BOX, x: 0, y: 0, right: THIN_BOX.width, bottom: THIN_BOX.height }
    expect(boxInside(CHIN, outside)).toBe(false)
    expect(mouthContained({ path: THIN_PATH, box: outside, chin: CHIN })).toBe(false)
  })
})
