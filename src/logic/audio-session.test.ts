import { describe, expect, it } from 'vitest'
import { beginCaptureSession, CAPTURE_SESSION_TYPE } from './audio-session.ts'

describe('capture audio session', () => {
  it('sets play-and-record while listening and restores the previous type once', () => {
    const session = { type: 'auto' }
    const restore = beginCaptureSession(session)
    expect(session.type).toBe(CAPTURE_SESSION_TYPE)
    restore()
    expect(session.type).toBe('auto')
    session.type = 'playback'
    restore()
    expect(session.type).toBe('playback')
  })

  it('does nothing when the browser has no audio session', () => {
    const restore = beginCaptureSession(null)
    expect(() => restore()).not.toThrow()
  })

  it('leaves the type alone when the browser refuses the change', () => {
    const session = {
      current: 'auto',
      get type() {
        return this.current
      },
      set type(value: string) {
        if (value === CAPTURE_SESSION_TYPE) throw new Error('refused')
        this.current = value
      },
    }
    const restore = beginCaptureSession(session)
    expect(session.type).toBe('auto')
    restore()
    expect(session.type).toBe('auto')
  })
})
