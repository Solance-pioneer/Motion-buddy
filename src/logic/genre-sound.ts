import { audioContext, unlockSound } from './sfx.ts'
import { genreNotes, type GenreSound } from './genre-pack.ts'

let live: { stop: () => void }[] = []

function silence(): void {
  for (const note of live) note.stop()
  live = []
}

/** One short original pattern. No samples, no loop, and nothing is kept. */
export function playGenreSting(sound: GenreSound, party: boolean, access: { muted: boolean; unlocked: boolean; reduced: boolean }): boolean {
  if (access.muted || !access.unlocked || access.reduced) return false
  if (!unlockSound()) return false
  const audio = audioContext()
  if (!audio) return false
  silence()
  const notes = genreNotes(sound, party)
  const start = audio.currentTime + 0.02
  for (const note of notes) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = sound.waveform
    osc.frequency.value = note.hz
    const at = start + note.at
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.07, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.05, note.dur))
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(at)
    osc.stop(at + note.dur + 0.03)
    live.push({ stop: () => { try { osc.stop() } catch { /* already stopped */ } } })
  }
  return notes.length > 0
}
