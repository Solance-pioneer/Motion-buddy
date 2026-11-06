export interface Room {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface FacePlace {
  x: number
  y: number
  sx: number
  sy: number
  originX: number
  originY: number
}

export type PetMode = 'dodge' | 'chase'

/** Modest finger offset, in -1..1. Dodge travels away from the finger. Chase travels toward it. Past the safe edge, the caller squashes instead of leaving the screen. */
export function desiredTravel(nx: number, ny: number, room: Room, mode: PetMode = 'dodge'): { x: number; y: number } {
  const push = (value: number) => {
    if (value === 0) return 0
    const direction = mode === 'chase' ? Math.sign(value) : -Math.sign(value)
    const amount = Math.min(1.45, Math.abs(value) / 0.4)
    return direction * amount
  }
  const ax = push(nx)
  const ay = push(ny)
  const x = ax < 0 ? ax * Math.abs(room.minX) : ax * room.maxX
  const y = ay < 0 ? ay * Math.abs(room.minY) : ay * room.maxY
  return { x, y }
}

/** Clamp to the safe room. Extra push compresses toward 0.76 sideways and 0.80 vertically, anchored on the touched edge. */
export function placeFace(
  desiredX: number,
  desiredY: number,
  room: Room,
  anchor = { left: 0, right: 1, top: 0, bottom: 1 },
): FacePlace {
  const overX = desiredX < room.minX ? room.minX - desiredX : desiredX > room.maxX ? desiredX - room.maxX : 0
  const overY = desiredY < room.minY ? room.minY - desiredY : desiredY > room.maxY ? desiredY - room.maxY : 0
  const spanX = Math.max(48, room.maxX - room.minX)
  const spanY = Math.max(48, room.maxY - room.minY)
  const px = Math.min(1, overX / (spanX * 0.28))
  const py = Math.min(1, overY / (spanY * 0.28))
  return {
    x: Math.max(room.minX, Math.min(room.maxX, desiredX)),
    y: Math.max(room.minY, Math.min(room.maxY, desiredY)),
    sx: 1 - 0.24 * px,
    sy: 1 - 0.2 * py,
    originX: desiredX < room.minX ? anchor.left : desiredX > room.maxX ? anchor.right : 0.5,
    originY: desiredY < room.minY ? anchor.top : desiredY > room.maxY ? anchor.bottom : 0.5,
  }
}

export function clearControl(
  place: FacePlace,
  faceLeft: number,
  faceTop: number,
  size: number,
  control: { left: number; top: number; right: number; bottom: number } | null,
  room: Room,
  inset = { left: 0, top: 0, right: 0, bottom: 0 },
): FacePlace {
  if (!control) return place
  let x = place.x
  let y = place.y
  const left = faceLeft + x + inset.left
  const top = faceTop + y + inset.top
  const right = faceLeft + x + size - inset.right
  const bottom = faceTop + y + size - inset.bottom
  const overlapX = Math.min(right, control.right) - Math.max(left, control.left)
  const overlapY = Math.min(bottom, control.bottom) - Math.max(top, control.top)
  if (overlapX > 0 && overlapY > 0) {
    if (overlapX <= overlapY) x -= overlapX
    else y += overlapY
  }
  return {
    ...place,
    x: Math.max(room.minX, Math.min(room.maxX, x)),
    y: Math.max(room.minY, Math.min(room.maxY, y)),
  }
}

export function roomFor(viewportW: number, viewportH: number, face: number, originX: number, originY: number, margin = 8): Room {
  return roomForFeatures(viewportW, viewportH, face, originX, originY, { left: 0, top: 0, right: 0, bottom: 0 }, margin)
}

/** Room for the visible eye and mouth box. Insets are the empty padding inside the square face. */
export function roomForFeatures(
  viewportW: number,
  viewportH: number,
  face: number,
  originX: number,
  originY: number,
  inset: { left: number; top: number; right: number; bottom: number },
  margin = 8,
): Room {
  return {
    minX: margin - originX - inset.left,
    maxX: viewportW - margin - originX - face + inset.right,
    minY: margin - originY - inset.top,
    maxY: viewportH - margin - originY - face + inset.bottom,
  }
}
