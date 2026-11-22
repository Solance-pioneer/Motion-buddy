import { audioContext, unlockSound } from './sfx.ts'

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
