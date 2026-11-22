import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyCarVariant, codedVariantId, sampleCarVariant } from './car-variants.ts'

describe('car reaction variants', () => {
  it('keeps the hard-brake film in front of every coded pose', () => {
    expect(codedVariantId('car_brake_soft_a', true)).toBeNull()
    expect(codedVariantId('car_brake_soft_b', true)).toBeNull()
    expect(codedVariantId('car_accel_rev_a', true)).toBeNull()
    expect(codedVariantId('car_brake_soft_a', false)).toBe('brake_glass_squish')
    expect(codedVariantId('car_brake_soft_b', false)).toBe('brake_fly_forward_crack')
    expect(codedVariantId('car_accel_rev_a', false)).toBe('accel_helmet_mic')
    expect(codedVariantId('car_accel_rev_b', false)).toBe('accel_anime_rush')
  })

  it('squashes the face without a drawn window, and stays still under reduced motion', () => {
    const approach = sampleCarVariant('brake_glass_squish', 0, false)
    const impact = sampleCarVariant('brake_glass_squish', 360, false)
    const reduced = sampleCarVariant('brake_glass_squish', 360, true)
    const done = sampleCarVariant('brake_glass_squish', 1_100, false)
    expect(approach.scaleX).toBeCloseTo(0.45)
    expect(approach.faceOpacity).toBe(0)
    expect(impact.scaleX).toBeCloseTo(1.5)
    expect(impact.scaleY).toBeCloseTo(0.66)
    expect(impact.cheeks).toBe(1)
    expect(impact.mouthScaleY).toBeCloseTo(0.25)
    expect(reduced.scaleX).toBe(1)
    expect(reduced.scaleY).toBe(1)
    expect(reduced.cheeks).toBe(1)
    expect(reduced.mouthScaleY).toBeLessThan(0.5)
    expect(done.done).toBe(true)
    expect(done.cheeks).toBe(0)
    expect(done.scaleX).toBe(1)
    const face = readFileSync('src/view/Face.tsx', 'utf8')
    expect(face).toContain('data-part="squashed-cheeks"')
    expect(face).not.toContain('glass_squish_impression')
    expect(face).not.toContain('glass-window')
  })

  it('shows the cartoon crack only while moving, and not under reduced motion', () => {
    const early = sampleCarVariant('brake_fly_forward_crack', 200, false)
    const contact = sampleCarVariant('brake_fly_forward_crack', 700, false)
    const reduced = sampleCarVariant('brake_fly_forward_crack', 700, true)
    expect(early.crack).toBe(0)
    expect(contact.crack).toBeGreaterThan(0.5)
    expect(contact.scaleX).toBeGreaterThan(1)
    expect(reduced.crack).toBe(0)
    expect(reduced.scaleX).toBe(1)
    expect(reduced.cheeks).toBeGreaterThan(0)
  })

  it('drops the helmet onto the face and keeps the chin over the mouth', () => {
    const start = sampleCarVariant('accel_helmet_mic', 0, false)
    const on = sampleCarVariant('accel_helmet_mic', 180, false)
    const reduced = sampleCarVariant('accel_helmet_mic', 180, true)
    expect(start.helmetY).toBe(-100)
    expect(on.helmet).toBe(1)
    expect(on.helmetY).toBe(0)
    expect(on.scaleY).toBeGreaterThan(1)
    expect(reduced.helmet).toBe(1)
    expect(reduced.helmetY).toBe(0)
    expect(reduced.scaleX).toBe(1)
    const face = readFileSync('src/view/Face.tsx', 'utf8')
    expect(face.indexOf('data-part="racing-helmet"')).toBeGreaterThan(face.indexOf('data-part="mouth"'))
  })

  it('rushes with speed lines and skips that motion when reduced', () => {
    const rush = sampleCarVariant('accel_anime_rush', 800, false)
    const reduced = sampleCarVariant('accel_anime_rush', 800, true)
    const done = sampleCarVariant('accel_anime_rush', 2_600, false)
    expect(rush.speed).toBeGreaterThan(0)
    expect(rush.rotate).toBeLessThan(0)
    expect(rush.helmet).toBe(1)
    expect(rush.scaleX).toBeLessThan(1)
    expect(reduced.speed).toBe(0)
    expect(reduced.rotate).toBe(0)
    expect(reduced.scaleX).toBe(1)
    expect(reduced.helmet).toBe(1)
    expect(done.done).toBe(true)
    expect(done.speed).toBe(0)
    expect(done.helmet).toBe(0)
  })

  it('clears the overlay nodes when the reaction is over', () => {
    const nodes = new Map<string, { opacity: string; transform: string; attrs: Record<string, string> }>()
    const element = (part: string) => {
      const node = { opacity: '', transform: '', attrs: {} as Record<string, string> }
      nodes.set(part, node)
      return {
        setAttribute(name: string, value: string) {
          node.attrs[name] = value
          if (name === 'opacity') node.opacity = value
          if (name === 'transform') node.transform = value
        },
        removeAttribute(name: string) {
          delete node.attrs[name]
          if (name === 'transform') node.transform = ''
        },
      }
    }
    const root = { querySelector: (selector: string) => element(selector) }
    applyCarVariant(root, sampleCarVariant('brake_glass_squish', 1_100, false))
    expect(nodes.get('[data-part="squashed-cheeks"]')?.opacity).toBe('0')
    expect(nodes.get('[data-part="car-reaction"]')?.opacity).toBe('1')
    expect(nodes.get('[data-part="glass-crack"]')?.opacity).toBe('0')
  })
})
