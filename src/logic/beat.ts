export type BeatFeel = 'steady' | 'party'

export interface BeatClock {
  floor: number
  primed: boolean
  lastAt: number
  gaps: number[]
}

export function initialBeatClock(): BeatClock {
  return { floor: 0, primed: false, lastAt: -10_000, gaps: [] }
}

/** Average energy in the bass band, 40–150 Hz. Magnitudes are 0–1. */
export function bassEnergy(magnitudes: ArrayLike<number>, sampleRate: number, fftSize: number): number {
  const width = sampleRate / fftSize
  let sum = 0
  let count = 0
  for (let i = 0; i < magnitudes.length; i += 1) {
    const hz = i * width
    if (hz < 40 || hz > 150) continue
    sum += magnitudes[i]
    count += 1
  }
  return count === 0 ? 0 : sum / count
}

/** Party sits closer to the noise floor. The floor still rises with a steady rumble. */
export function beatLift(feel: BeatFeel): number {
  return feel === 'party' ? 0.06 : 0.14
}

export function stepBeat(clock: BeatClock, energy: number, now: number, feel: BeatFeel): { clock: BeatClock; beat: boolean } {
  if (!clock.primed) return { clock: { ...clock, floor: energy, primed: true }, beat: false }
  const floor = clock.floor * 0.96 + energy * 0.04
  const onset = energy > clock.floor + beatLift(feel)
  const spaced = now - clock.lastAt >= 280
  const beat = onset && spaced
  const gap = now - clock.lastAt
  const gaps = beat && gap < 2_000 ? [...clock.gaps, gap].slice(-6) : clock.gaps
  return { clock: { floor, primed: true, lastAt: beat ? now : clock.lastAt, gaps }, beat }
}

export function tempoBpm(gaps: readonly number[]): number {
  const usable = gaps.filter((gap) => gap >= 280 && gap <= 1_200)
  if (usable.length === 0) return 0
  const mean = usable.reduce((sum, gap) => sum + gap, 0) / usable.length
  return Math.round(60_000 / mean)
}
