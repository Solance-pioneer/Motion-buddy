import { audioContext, prepareAudio, unlockSound } from './sfx.ts'

const warmBuffers = new Map<string, AudioBuffer>()

/** Decode a clip soundtrack ahead of the press. Playback still waits for the gesture gate. */
export async function warmClipBuffer(url: string): Promise<AudioBuffer | null> {
  const cached = warmBuffers.get(url)
  if (cached) return cached
  const audio = prepareAudio()
  if (!audio || !url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const decoded = await audio.decodeAudioData((await response.arrayBuffer()).slice(0))
    warmBuffers.set(url, decoded)
    return decoded
  } catch {
    return null
  }
}

/** Play a buffer that was already decoded. duration stops it at the film cut. */
export function playClipBuffer(buffer: AudioBuffer, offset = 0, duration?: number): () => void {
  const audio = audioContext()
  if (!audio) return () => {}
  const node = audio.createBufferSource()
  node.buffer = buffer
  node.connect(audio.destination)
  const stop = () => {
    try {
      node.stop()
    } catch {
      // The buffer already ended.
    }
  }
  try {
    if (duration != null) node.start(audio.currentTime, offset, Math.max(0.05, duration))
    else node.start(audio.currentTime, offset)
  } catch {
    return () => {}
  }
  return stop
}

/**
 * Play a clip's soundtrack apart from its <video>. The element stays muted so
 * it does not seize the playback session. If the file cannot be decoded, the
 * picture continues in silence rather than unmuting that element.
 */
export async function startClipMix(url: string, currentTime: () => number): Promise<() => void> {
  const audio = audioContext()
  if (!url || !audio || !unlockSound()) return () => {}
  let source: { stop: () => void } | null = null
  let cancelled = false
  const stop = () => {
    cancelled = true
    try {
      source?.stop()
    } catch {
      // The buffer already ended.
    }
  }
  try {
    const response = await fetch(url)
    if (!response.ok) return stop
    const bytes = await response.arrayBuffer()
    if (cancelled) return stop
    const decoded = await audio.decodeAudioData(bytes.slice(0))
    if (cancelled) return stop
    const node = audio.createBufferSource()
    node.buffer = decoded
    node.connect(audio.destination)
    const offset = Math.min(Math.max(0, currentTime()), Math.max(0, decoded.duration - 0.05))
    node.start(audio.currentTime, offset)
    source = node
  } catch {
    // Decoding failed. Leave the video muted.
  }
  return stop
}
