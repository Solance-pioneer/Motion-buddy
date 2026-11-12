export const DOUBLE_MS = 280
export const DRAG_PX = 8
export interface TouchClock {
  down: boolean
  second: boolean
  dragged: boolean
  startX: number
  startY: number
  x: number
  y: number
  pendingTapAt: number
  lastChirpAt: number
}

export function initialTouch(): TouchClock {
  return { down: false, second: false, dragged: false, startX: 0, startY: 0, x: 0, y: 0, pendingTapAt: 0, lastChirpAt: -1_000_000 }
}

export interface TouchStep {
  clock: TouchClock
  openMenu: boolean
  singleTap: boolean
  chirp: boolean
  dragging: boolean
}

function blank(clock: TouchClock, dragging = false): TouchStep {
  return { clock, openMenu: false, singleTap: false, chirp: false, dragging }
}

/** Finger position in the face, -1..1. The face moves the opposite way, and stays inside a small range. */
export function avoidFinger(nx: number, ny: number): { x: number; y: number } {
  const x = Math.max(-0.85, Math.min(0.85, -nx * 0.95))
  const y = Math.max(-0.5, Math.min(0.5, -ny * 0.5))
  return { x, y }
}

export function touchDown(clock: TouchClock, x: number, y: number, now: number): TouchStep {
  const second = clock.pendingTapAt > 0 && now - clock.pendingTapAt <= DOUBLE_MS
  return blank({
    ...clock,
    down: true,
    second,
    dragged: false,
    startX: x,
    startY: y,
    x,
    y,
    pendingTapAt: second ? 0 : clock.pendingTapAt,
  })
}

export function touchMove(clock: TouchClock, x: number, y: number, now: number): TouchStep {
  void now
  if (!clock.down) return blank(clock)
  const dx = x - clock.startX
  const dy = y - clock.startY
  const dragged = clock.dragged || Math.hypot(dx, dy) >= DRAG_PX
  const chirp = dragged && !clock.dragged
  return {
    clock: { ...clock, x, y, dragged, pendingTapAt: dragged ? 0 : clock.pendingTapAt, second: dragged ? false : clock.second },
    openMenu: false,
    singleTap: false,
    chirp,
    dragging: dragged,
  }
}

export function touchUp(clock: TouchClock, now: number): TouchStep {
  if (!clock.down) return blank({ ...clock, down: false })
  if (clock.dragged) {
    return blank({ ...clock, down: false, dragged: false, second: false, pendingTapAt: 0 })
  }
  if (clock.second) {
    return { clock: { ...clock, down: false, second: false, pendingTapAt: 0 }, openMenu: true, singleTap: false, chirp: false, dragging: false }
  }
  return {
    clock: { ...clock, down: false, pendingTapAt: now },
    openMenu: false,
    singleTap: true,
    chirp: true,
    dragging: false,
  }
}

export function touchCancel(clock: TouchClock): TouchStep {
  return blank({ ...initialTouch(), lastChirpAt: clock.lastChirpAt })
}

/** The single tap already reacted on pointer-up. Expiry only forgets it so it cannot fire twice. */
export function touchExpire(clock: TouchClock, now: number): TouchStep {
  if (clock.down || clock.pendingTapAt <= 0 || now - clock.pendingTapAt < DOUBLE_MS) return blank(clock)
  return { clock: { ...clock, pendingTapAt: 0 }, openMenu: false, singleTap: false, chirp: false, dragging: false }
}
