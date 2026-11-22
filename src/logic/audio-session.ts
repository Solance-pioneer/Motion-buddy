/**
 * Safari exposes navigator.audioSession.
 * WebKit maps ambient to a mixable category and play-and-record to
 * AVAudioSessionCategoryPlayAndRecord. Capture is rejected for every other
 * type, and play-and-record is not given mixWithOthers, so other apps can pause
 * while the mic is open. A clip asks for ambient only when the mic is off.
 * The type from before the first hold is restored when both holds end.
 */
export const AMBIENT_SESSION_TYPE = 'ambient'
export const CAPTURE_SESSION_TYPE = 'play-and-record'

export interface AudioHold {
  base: string | null
  mic: number
  clip: number
}

type AudioSessionLike = { type: string }

let hold: AudioHold = { base: null, mic: 0, clip: 0 }

export function initialAudioHold(): AudioHold {
  return { base: null, mic: 0, clip: 0 }
}

export function resetAudioHold(): void {
  hold = initialAudioHold()
}

export function beginAudioUse(state: AudioHold, kind: 'mic' | 'clip', currentType: string | null): { hold: AudioHold; type: string | null } {
  const next: AudioHold = {
    base: state.base,
    mic: state.mic + (kind === 'mic' ? 1 : 0),
    clip: state.clip + (kind === 'clip' ? 1 : 0),
  }
  if (currentType == null) return { hold: next, type: null }
  if (state.mic === 0 && state.clip === 0) next.base = currentType
  if (next.mic > 0) return { hold: next, type: CAPTURE_SESSION_TYPE }
  return { hold: next, type: AMBIENT_SESSION_TYPE }
}

export function endAudioUse(state: AudioHold, kind: 'mic' | 'clip'): { hold: AudioHold; type: string | null } {
  const next: AudioHold = {
    base: state.base,
    mic: kind === 'mic' ? Math.max(0, state.mic - 1) : state.mic,
    clip: kind === 'clip' ? Math.max(0, state.clip - 1) : state.clip,
  }
  if (next.mic > 0) return { hold: next, type: CAPTURE_SESSION_TYPE }
  if (next.clip > 0) return { hold: next, type: AMBIENT_SESSION_TYPE }
  const restore = next.base
  next.base = null
  return { hold: next, type: restore }
}

function readAudioSession(host: Navigator): AudioSessionLike | null {
  const session = (host as Navigator & { audioSession?: { type?: unknown } }).audioSession
  if (!session || typeof session.type !== 'string') return null
  return session as AudioSessionLike
}

export function pageAudioSession(): AudioSessionLike | null {
  return readAudioSession(navigator)
}

function openAudioUse(session: AudioSessionLike | null, kind: 'mic' | 'clip'): () => void {
  const begun = beginAudioUse(hold, kind, session?.type ?? null)
  if (session && begun.type) {
    try {
      session.type = begun.type
    } catch {
      return () => {}
    }
  }
  hold = begun.hold
  let ended = false
  return () => {
    if (ended) return
    ended = true
    const done = endAudioUse(hold, kind)
    hold = done.hold
    if (session && done.type) {
      try {
        session.type = done.type
      } catch {
        // Leave the type the browser still has.
      }
    }
  }
}

export function beginCaptureSession(session: AudioSessionLike | null): () => void {
  return openAudioUse(session, 'mic')
}

export function beginClipSession(session: AudioSessionLike | null): () => void {
  return openAudioUse(session, 'clip')
}

/**
 * Clip pictures stay on a muted, inline video. An unmuted video can take the
 * playback session and pause other apps. Where audioSession is missing, the
 * page cannot force a mixable category, so the element stays muted. That is a
 * browser limitation. The soundtrack, when allowed, is mixed on the shared
 * Web Audio context instead.
 */
export function clipVideoStaysMuted(): boolean {
  return true
}
