import { beginCaptureSession, pageAudioSession } from './audio-session.ts'
import { audioContext, unlockSound } from './sfx.ts'

/**
 * Live microphone levels for beat detection. The stream is never recorded,
 * never connected to the speakers, and the tracks stop when listening ends.
 */
export async function openBeatMic(onMagnitudes: (bins: Uint8Array, sampleRate: number, fftSize: number) => void): Promise<() => void> {
  if (!unlockSound()) return () => {}
  const audio = audioContext()
  if (!audio || !navigator.mediaDevices?.getUserMedia) return () => {}
  const releaseSession = beginCaptureSession(pageAudioSession())
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch (error) {
    releaseSession()
    throw error
  }
  const source = audio.createMediaStreamSource(stream)
  const analyser = audio.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const bins = new Uint8Array(analyser.frequencyBinCount)
  const timer = window.setInterval(() => {
    analyser.getByteFrequencyData(bins)
    onMagnitudes(bins, audio.sampleRate, analyser.fftSize)
  }, 50)
  return () => {
    window.clearInterval(timer)
    source.disconnect()
    for (const track of stream.getTracks()) track.stop()
    releaseSession()
  }
}
