/** How long the on-screen buttons stay up after a touch before they fade. */
export const CONTROLS_IDLE_MS = 6_500

/** Touch wakes the buttons. Motion and shake leave them as they are. Idle fades them. */
export function chromeAfterInput(visible: boolean, source: 'touch' | 'motion' | 'idle'): boolean {
  if (source === 'touch') return true
  if (source === 'idle') return false
  return visible
}

export function faceTapOutcome(step: { singleTap: boolean; openMenu: boolean }): { reveal: boolean; reaction: boolean; menu: boolean } {
  return {
    reveal: step.singleTap,
    reaction: step.singleTap,
    menu: step.openMenu,
  }
}
