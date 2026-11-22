import { beforeEach, describe, expect, it } from 'vitest'
import {
  AMBIENT_SESSION_TYPE,
  beginAudioUse,
  beginCaptureSession,
  beginClipSession,
  CAPTURE_SESSION_TYPE,
  clipVideoStaysMuted,
  endAudioUse,
  initialAudioHold,
  resetAudioHold,
} from './audio-session.ts'

describe('clip and mic audio session', () => {
  beforeEach(() => resetAudioHold())

  it('uses ambient for a clip, play-and-record for the mic, then restores', () => {
    let state = initialAudioHold()
    const clip = beginAudioUse(state, 'clip', 'auto')
    state = clip.hold
    expect(clip.type).toBe(AMBIENT_SESSION_TYPE)
    const mic = beginAudioUse(state, 'mic', AMBIENT_SESSION_TYPE)
    state = mic.hold
    expect(mic.type).toBe(CAPTURE_SESSION_TYPE)
    const micDone = endAudioUse(state, 'mic')
    state = micDone.hold
    expect(micDone.type).toBe(AMBIENT_SESSION_TYPE)
    const clipDone = endAudioUse(state, 'clip')
    expect(clipDone.type).toBe('auto')
    expect(clipDone.hold).toEqual(initialAudioHold())
  })

  it('applies those types on a session and restores once', () => {
    const session = { type: 'auto' }
    const endClip = beginClipSession(session)
    expect(session.type).toBe(AMBIENT_SESSION_TYPE)
    const endMic = beginCaptureSession(session)
    expect(session.type).toBe(CAPTURE_SESSION_TYPE)
    endMic()
    expect(session.type).toBe(AMBIENT_SESSION_TYPE)
    endClip()
    expect(session.type).toBe('auto')
    session.type = 'playback'
    endClip()
    expect(session.type).toBe('playback')
  })

  it('does nothing when the browser has no audio session, and the video stays muted', () => {
    expect(clipVideoStaysMuted()).toBe(true)
    const begun = beginAudioUse(initialAudioHold(), 'clip', null)
    expect(begun.type).toBeNull()
    const end = beginClipSession(null)
    expect(() => end()).not.toThrow()
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
