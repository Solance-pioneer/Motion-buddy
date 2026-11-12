import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { SceneKey } from '../logic/scenes.ts'
import type { ReactionKind } from '../logic/reactions.ts'
import type { Presence } from '../logic/engine.ts'

/** Testing controls. Normal settings stay in the user menu. */
export function AdminMenu({
  onClose,
  onOpenClips,
  onPlayScene,
  onPreviewWake,
  onPreviewGlance,
  onPreviewReaction,
  allowStartled,
  allowDizzy,
  presence,
}: {
  onClose: () => void
  onOpenClips: () => void
  onPlayScene: (key: SceneKey) => void
  onPreviewWake: () => void
  onPreviewGlance: () => void
  onPreviewReaction: (kind: ReactionKind) => void
  allowStartled: boolean
  allowDizzy: boolean
  presence: Presence
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <div
        ref={panelRef}
        id="buddy-admin"
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        data-menu-panel
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => trapTab(event, panelRef.current)}
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">Motion Buddy</p>
            <h2 id="admin-title">Admin</h2>
          </div>
          <button ref={closeRef} type="button" className="close" onClick={onClose}>
            Close
          </button>
        </div>

        <fieldset>
          <legend>Clips</legend>
          <button type="button" onClick={onOpenClips}>Clips</button>
          <p className="note">Gallery, date and weather overrides, and HD/SD badges.</p>
        </fieldset>

        <fieldset>
          <legend>Dress-up scenes</legend>
          <div className="choice-row">
            <button type="button" onClick={() => onPlayScene('ninja')}>Ninja peek</button>
            <button type="button" onClick={() => onPlayScene('cord_hero')}>Rope hero</button>
            <button type="button" onClick={() => onPlayScene('racer')}>Little racer</button>
            <button type="button" onClick={() => onPlayScene('sheet_ghost')}>Sheet ghost</button>
          </div>
          <p className="note">Each scene plays through, then Buddy is plain again. Little racer is that short scene. Race turns on Car tilt and is not Little racer.</p>
        </fieldset>

        <fieldset>
          <legend>Simulation, not the sensor</legend>
          <div className="choice-grid">
            <button type="button" onClick={onPreviewGlance}>Simulated glance</button>
            <button type="button" onClick={() => onPreviewReaction('startled')} disabled={!allowStartled}>Simulate worried</button>
            <button type="button" onClick={() => onPreviewReaction('dizzy')} disabled={!allowDizzy}>Simulate dizzy</button>
            <button type="button" onClick={onPreviewWake} disabled={presence !== 'rest'}>Preview wake</button>
          </div>
          <p className="note">These try the faces without a sensor. They do not mean motion is on.</p>
        </fieldset>
      </div>
    </div>
  )
}

function trapTab(event: ReactKeyboardEvent<HTMLDivElement>, panel: HTMLDivElement | null) {
  if (event.key !== 'Tab' || !panel) return
  const items = [...panel.querySelectorAll<HTMLElement>('button, summary, [href], input, select, textarea')]
    .filter((item) => !item.hasAttribute('disabled'))
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
