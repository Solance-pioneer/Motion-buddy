import { describe, expect, it } from 'vitest'
import { openingClears, publishedEyeAgrees, type FitPoint } from './opening-fit.ts'

function loop(): FitPoint[] {
  const pts: FitPoint[] = []
  for (let i = 0; i <= 16; i += 1) pts.push({ x: 0, y: (100 * i) / 16 })
  for (let i = 0; i <= 16; i += 1) pts.push({ x: (100 * i) / 16, y: 100 })
  for (let i = 0; i <= 16; i += 1) pts.push({ x: 100, y: 100 - (100 * i) / 16 })
  for (let i = 0; i <= 16; i += 1) pts.push({ x: 100 - (100 * i) / 16, y: 0 })
  return pts
}

describe('opening fit', () => {
  it('accepts the captured peaked eye for its published height and rejects a short ellipse', () => {
    const captured = 'M 32.0 25.5 C 37.5 25.5 41.9 31.2 41.9 38.2 C 41.9 44.9 37.5 50.3 32.0 50.3 C 26.5 50.3 22.1 44.9 22.1 38.2 C 22.1 31.2 26.5 25.5 32.0 25.5 Z'
    expect(publishedEyeAgrees(captured, 26.44)).toBe(true)
    const happy = 'M 32.0 33.8 C 37.5 33.8 42.0 36.4 42.0 39.6 C 42.0 40.3 37.5 38.4 32.0 38.4 C 26.5 38.4 22.0 40.3 22.0 39.6 C 22.0 36.4 26.5 33.8 32.0 33.8 Z'
    expect(publishedEyeAgrees(happy, 9)).toBe(true)
    const shortened = 'M 32.0 32.0 C 37.5 32.0 42.0 35.0 42.0 38.0 C 42.0 41.0 37.5 44.0 32.0 44.0 C 26.5 44.0 22.0 41.0 22.0 38.0 C 22.0 35.0 26.5 32.0 32.0 32.0 Z'
    expect(publishedEyeAgrees(shortened, 26.44)).toBe(false)
    expect(publishedEyeAgrees('M 0 0 L 10 0 L 10 4 Z', 28)).toBe(false)
  })

  it('accepts a box inside the stroke and rejects one that crosses it', () => {
    const points = loop()
    expect(openingClears({ x: 20, y: 20, right: 60, bottom: 70 }, points, 4)).toBe(true)
    expect(openingClears({ x: -6, y: 20, right: 30, bottom: 70 }, points, 4)).toBe(false)
    expect(openingClears({ x: 80, y: 20, right: 108, bottom: 70 }, points, 4)).toBe(false)
  })
})
