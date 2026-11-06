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

/** Modest finger offset, in -1..1, asks the face to travel to the far safe edge. The face moves away from the finger. */
export function desiredTravel(nx: number, ny: number, room: Room): { x: number; y: number } {
  const push = (value: number) => {
    if (value === 0) return 0
    const away = -Math.sign(value)
    const amount = Math.min(1.45, Math.abs(value) / 0.4)
    return away * amount
  }
  const ax = push(nx)
  const ay = push(ny)
  const x = ax < 0 ? ax * Math.abs(room.minX) : ax * room.maxX
  const y = ay < 0 ? ay * Math.abs(room.minY) : ay * room.maxY
  return { x, y }
}

/** Clamp to the safe room. Extra push compresses toward 0.76 sideways and 0.80 vertically, anchored on the touched edge. */
export function placeFace(desiredX: number, desiredY: number, room: Room): FacePlace {
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
    originX: desiredX < room.minX ? 0 : desiredX > room.maxX ? 1 : 0.5,
    originY: desiredY < room.minY ? 0 : desiredY > room.maxY ? 1 : 0.5,
  }
}

export function clearControl(
  place: FacePlace,
  faceLeft: number,
  faceTop: number,
  size: number,
  control: { left: number; top: number; right: number; bottom: number } | null,
  room: Room,
): FacePlace {
  if (!control) return place
  let x = place.x
  let y = place.y
  const left = faceLeft + x
  const top = faceTop + y
  const overlapX = Math.min(left + size, control.right) - Math.max(left, control.left)
  const overlapY = Math.min(top + size, control.bottom) - Math.max(top, control.top)
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
  return {
    minX: margin - originX,
    maxX: viewportW - margin - face - originX,
    minY: margin - originY,
    maxY: viewportH - margin - face - originY,
  }
}
