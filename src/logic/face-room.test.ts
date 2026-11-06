import { describe, expect, it } from 'vitest'
import { desiredTravel, placeFace, roomFor } from './face-room.ts'

const room = roomFor(390, 844, 280, 55, 250)

describe('face travel', () => {
  it('sends the whole face near the far edge and squishes only past it', () => {
    const left = desiredTravel(0.7, 0, room)
    expect(left.x).toBeLessThan(room.minX)
    const placed = placeFace(left.x, left.y, room)
    expect(placed.x).toBeCloseTo(room.minX, 0)
    expect(placed.sx).toBeLessThan(0.9)
    expect(placed.sx).toBeGreaterThanOrEqual(0.76)
    expect(placed.sy).toBe(1)
    expect(placed.originX).toBe(0)
    const corner = placeFace(room.minX - 200, room.maxY + 200, room)
    expect(corner.sx).toBeLessThan(1)
    expect(corner.sy).toBeLessThan(1)
    expect(corner.x).toBeCloseTo(room.minX, 0)
    expect(corner.y).toBeCloseTo(room.maxY, 0)
  })

  it('keeps a centered finger at rest', () => {
    const still = desiredTravel(0, 0, room)
    const placed = placeFace(still.x, still.y, room)
    expect(placed.x).toBe(0)
    expect(placed.y).toBe(0)
    expect(placed.sx).toBe(1)
    expect(placed.sy).toBe(1)
  })
})
