import { describe, expect, it } from 'vitest'
import { sampleCandidate } from './catalog.ts'
import { PLAYBACK_GAIN } from './sfx.ts'

function series(id: string, period: number, step = 40) {
  const frames = []
  for (let t = 0; t <= period; t += step) frames.push(sampleCandidate(id, t))
  return frames
}

describe('reviewed motion fixes', () => {
  it('scans in a continuous loop without a gaze jump', () => {
    const frames = series('scan', 2100, 50)
    const xs = frames.map((frame) => frame.gazeX)
    let jump = 0
    for (let i = 1; i < xs.length; i += 1) jump = Math.max(jump, Math.abs(xs[i] - xs[i - 1]))
    expect(jump).toBeLessThan(0.2)
    expect(Math.min(...xs)).toBeLessThan(-0.95)
    expect(Math.max(...xs)).toBeGreaterThan(0.95)
    expect(Math.abs(sampleCandidate('scan', 0).gazeX - sampleCandidate('scan', 2100).gazeX)).toBeLessThan(0.02)
  })

  it('bobs the giggle face enough to read, then settles', () => {
    const base = sampleCandidate('giggle', 0)
    const mid = sampleCandidate('giggle', 480)
    const pulse = sampleCandidate('giggle', 160)
    const end = sampleCandidate('giggle', 1600)
    const travel = Math.abs(mid.features.left.cy - base.features.left.cy)
    expect(travel).toBeGreaterThan(4)
    expect(Math.abs(pulse.features.mouth.curve - base.features.mouth.curve)).toBeGreaterThan(0.8)
    expect(Math.abs(end.features.left.cy - base.features.left.cy)).toBeLessThan(0.2)
    expect(base.features.left.peak).toBeGreaterThan(8)
  })

  it('double-takes with a smooth recoil and a temporary brow', () => {
    const frames = series('take-left', 1800, 40)
    const xs = frames.map((frame) => frame.gazeX)
    let jump = 0
    for (let i = 1; i < xs.length; i += 1) jump = Math.max(jump, Math.abs(xs[i] - xs[i - 1]))
    expect(jump).toBeLessThan(0.25)
    expect(Math.min(...xs)).toBeLessThan(-0.9)
    const pop = sampleCandidate('take-left', 1800 * 0.4)
    expect(pop.features.brow ?? 0).toBeGreaterThan(0.4)
    expect(sampleCandidate('take-left', 0).features.brow ?? 0).toBe(0)
    expect(pop.features.left.w).toBeGreaterThan(sampleCandidate('take-left', 0).features.left.w)
  })

  it('sways the cute dizzy pose and keeps a reduced-motion spiral still', () => {
    const dizzy = series('dizzy', 2300, 50).map((frame) => frame.gazeX)
    expect(Math.max(...dizzy) - Math.min(...dizzy)).toBeGreaterThan(1.2)
    const spinA = sampleCandidate('spiral-dizzy', 200).features.left.spiral ?? 0
    const spinB = sampleCandidate('spiral-dizzy', 1100).features.left.spiral ?? 0
    expect(spinB).toBeGreaterThan(spinA)
    expect(spinB).toBeLessThan(1.6)
    const blink = sampleCandidate('spiral-dizzy', 2400 * 0.63).blink
    expect(blink).toBeGreaterThan(0.5)
    const stillA = sampleCandidate('spiral-dizzy', 200, true).features.left.spiral
    const stillB = sampleCandidate('spiral-dizzy', 2000, true).features.left.spiral
    expect(stillA).toBe(stillB)
    expect(sampleCandidate('spiral-dizzy', 200, true).blink).toBe(0)
  })

  it('leaves the approved yawn and wink beats on their reviewed poses', () => {
    const yawn = sampleCandidate('yawn-stretch', 1800)
    expect(yawn.features.mouth.open).toBeGreaterThan(0.8)
    expect(yawn.features.left.h).toBeLessThan(12)
    const wink = sampleCandidate('wink-play', 1100)
    expect(wink.features.blush).toBeGreaterThan(0.3)
    expect(wink.features.right.h).toBeLessThan(wink.features.left.h)
    expect(sampleCandidate('wink-play', 0).features.blush).toBe(0)
  })

  it('bounces the clap face on the recording hits and hops the level-up grin', () => {
    const rest = sampleCandidate('clap', 0).features.left.cy
    for (const hit of [290, 640, 940]) {
      expect(sampleCandidate('clap', hit).features.left.cy).toBeGreaterThan(rest + 4)
    }
    expect(sampleCandidate('clap', 1_900).features.mouth.open).toBe(0)
    const wide = sampleCandidate('level-up', 200)
    const proud = sampleCandidate('level-up', 1_200)
    const hop = sampleCandidate('level-up', 1_800)
    expect(wide.features.left.h).toBeGreaterThan(proud.features.left.h)
    expect(wide.features.mouth.open).toBeGreaterThan(0)
    expect(wide.features.mouth.open).toBeLessThan(0.4)
    expect(proud.features.mouth.open).toBe(0)
    expect(proud.features.mouth.curve).toBeGreaterThan(4)
    expect(hop.features.left.cy).toBeLessThan(proud.features.left.cy)
    expect(sampleCandidate('level-up', 200, true).features.left.cy).toBe(sampleCandidate('level-up', 1_800, true).features.left.cy)
    const peaks = { scan: -7.5, giggle: -7.5, surprise: -7.5, yawn: -7.5, wink: -7.5, dizzy: -7.5, clap: -1.5, 'level-up': -1.6 }
    for (const [cue, peak] of Object.entries(peaks)) {
      const gain = PLAYBACK_GAIN[cue as keyof typeof PLAYBACK_GAIN]
      expect(peak + 20 * Math.log10(gain)).toBeLessThanOrEqual(-11.5)
    }
    const popped = sampleCandidate('eye-pop', 400)
    expect(popped.features.left.h).toBeGreaterThan(sampleCandidate('eye-pop', 0).features.left.h)
    expect(popped.features.left.rot).toBe(0)
    expect(sampleCandidate('eye-bounce', 160).features.left.cy).toBeLessThan(sampleCandidate('eye-bounce', 0).features.left.cy)
    expect(sampleCandidate('eye-sleepy', 800, true).features.left.h).toBeCloseTo(sampleCandidate('eye-sleepy', 0, true).features.left.h, 0)
  })
})
