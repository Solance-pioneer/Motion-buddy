/**
 * Safari exposes navigator.audioSession. WebKit maps play-and-record to
 * AVAudioSessionCategoryPlayAndRecord and rejects microphone capture for every
 * other type. That category is not given mixWithOthers, so other apps can still
 * pause. The previous type is restored when listening ends.
 */
export const CAPTURE_SESSION_TYPE = 'play-and-record'

type AudioSessionLike = { type: string }

function readAudioSession(host: Navigator): AudioSessionLike | null {
  const session = (host as Navigator & { audioSession?: { type?: unknown } }).audioSession
  if (!session || typeof session.type !== 'string') return null
  return session as AudioSessionLike
}

export function pageAudioSession(): AudioSessionLike | null {
  return readAudioSession(navigator)
}

export function beginCaptureSession(session: AudioSessionLike | null): () => void {
  if (!session) return () => {}
  const previous = session.type
  try {
    session.type = CAPTURE_SESSION_TYPE
  } catch {
    return () => {}
  }
  let restored = false
  return () => {
    if (restored) return
    restored = true
    try {
      session.type = previous
    } catch {
      // Leave the type the browser still has.
    }
  }
}
