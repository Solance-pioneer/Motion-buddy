import { clamp } from '../logic/math.ts'

/** Full glance travel in the 100-unit face. A modest tilt is meant to cross most of this. */
export const GLANCE_X_UNITS = 18
export const GLANCE_Y_UNITS = 11

export function glanceOffset(gazeX: number, gazeY: number): { x: number; y: number; rotate: number } {
  const x = clamp(gazeX, -1, 1)
  const y = clamp(gazeY, -1, 1)
  return { x: x * GLANCE_X_UNITS, y: y * GLANCE_Y_UNITS, rotate: 0 }
}

export function glanceTransform(gazeX: number, gazeY: number): string {
  const offset = glanceOffset(gazeX, gazeY)
  return `translate(${offset.x.toFixed(2)} ${offset.y.toFixed(2)}) rotate(${offset.rotate.toFixed(2)} 50 46)`
}
