import { describe, expect, it } from 'vitest'
import { avoidFinger, DRAG_PX, initialTouch, touchCancel, touchDown, touchExpire, touchMove, touchUp } from './touch.ts'

describe('touch gestures', () => {
  it('waits, then treats one poke as a chirp and not a menu', () => {
    let clock = initialTouch()
    clock = touchDown(clock, 10, 10, 0).clock
    const up = touchUp(clock, 40)
    expect(up.openMenu).toBe(false)
    expect(up.singleTap).toBe(false)
    expect(up.chirp).toBe(false)
    const done = touchExpire(up.clock, 400)
    expect(done.singleTap).toBe(true)
    expect(done.chirp).toBe(true)
    expect(done.openMenu).toBe(false)
  })

  it('opens the menu on a double tap without a chirp or a saved poke', () => {
    let clock = initialTouch()
    clock = touchUp(touchDown(clock, 10, 10, 0).clock, 30).clock
    const secondDown = touchDown(clock, 12, 11, 120)
    expect(secondDown.clock.pendingTapAt).toBe(0)
    const up = touchUp(secondDown.clock, 160)
    expect(up.openMenu).toBe(true)
    expect(up.chirp).toBe(false)
    expect(up.singleTap).toBe(false)
    expect(touchExpire(up.clock, 600).singleTap).toBe(false)
  })

  it('dodges a drag, spaces chirps, and does not count it as a tap', () => {
    let clock = touchDown(initialTouch(), 0, 0, 0).clock
    const drag = touchMove(clock, DRAG_PX + 2, 0, 30)
    expect(drag.dragging).toBe(true)
    expect(drag.chirp).toBe(true)
    const again = touchMove(drag.clock, DRAG_PX + 8, 1, 80)
    expect(again.chirp).toBe(false)
    const later = touchMove(again.clock, DRAG_PX + 10, 2, 30 + 480)
    expect(later.chirp).toBe(true)
    const up = touchUp(later.clock, 800)
    expect(up.singleTap).toBe(false)
    expect(up.openMenu).toBe(false)
    expect(touchExpire(up.clock, 1_200).singleTap).toBe(false)
    expect(avoidFinger(0.8, 0.2).x).toBeLessThan(-0.7)
    expect(avoidFinger(-0.8, 0).x).toBeGreaterThan(0.7)
  })

  it('clears a dodge when the touch is cancelled', () => {
    const down = touchDown(initialTouch(), 0, 0, 0).clock
    const drag = touchMove(down, 40, 0, 20)
    const cancelled = touchCancel(drag.clock)
    expect(cancelled.dragging).toBe(false)
    expect(cancelled.singleTap).toBe(false)
    expect(cancelled.clock.down).toBe(false)
  })
})
