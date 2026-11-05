export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** Inverse of smoothstep on [0, 1], used to resume Auto without a pose pop. */
export function inverseSmoothstep(y: number): number {
  const target = clamp(y, 0, 1)
  let x = target
  for (let i = 0; i < 8; i++) {
    const f = x * x * (3 - 2 * x) - target
    const d = 6 * x * (1 - x)
    if (Math.abs(d) < 1e-5) break
    x -= f / d
  }
  return clamp(x, 0, 1)
}
