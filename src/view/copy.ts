import type { CompanionState } from '../logic/engine.ts'
import type { MotionUiStatus } from './useTilt.ts'

export function readoutLabel(state: CompanionState): string {
  if (state.phase === 'transition') return 'Shifting'
  return state.settled === 'curious' ? 'Curious' : 'A little grumpy'
}

export function motionButtonLabel(status: MotionUiStatus): string {
  if (status === 'waiting') return 'Waiting for tilt…'
  if (status === 'active') return 'Motion on'
  return 'Enable motion'
}

export function motionCopy(status: MotionUiStatus, reduced: boolean): string {
  if (reduced) {
    return 'Calmer motion is on from your system setting, so Bram holds a quieter pose.'
  }
  switch (status) {
    case 'idle':
      return 'Pointer movement previews a gentle lean. Enable motion asks the phone for tilt, and only after you tap.'
    case 'waiting':
      return 'Listening for a tilt event. Motion stays off until one arrives.'
    case 'active':
      return 'Tilt is steering Bram. Small shakes inside the dead zone are ignored.'
    case 'denied':
      return 'Motion permission was denied. Bram is using the pointer and preview sway instead.'
    case 'unavailable':
      return 'This browser has no tilt sensor, or the page is not a secure context. Using the pointer and preview sway.'
    case 'no-events':
      return 'No orientation events arrived, so motion was not turned on. Using the pointer and preview sway.'
  }
}
