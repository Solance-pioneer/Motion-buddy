import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { EXPRESSIONS, type Expression } from '../logic/expressions.ts'
import type { Presence, Selection } from '../logic/engine.ts'
import { ACCENTS, type AccentId } from './accents.ts'
import type { MotionUiStatus } from './useTilt.ts'
import type { WakeLockUi } from './useWakeLock.ts'

const EXPRESSION_LABEL: Record<Expression, string> = {
  curious: 'Curious',
  happy: 'Happy',
  grumpy: 'Grumpy',
  sleepy: 'Sleepy',
}

export function Controls({
  presence,
  selection,
  autoSet,
  accent,
  motionStatus,
  wakeLock,
  reduced,
  onClose,
  onPresence,
  onSelection,
  onToggleAuto,
  onAccent,
  onEnableMotion,
  onPreviewWake,
  onToggleWakeLock,
}: {
  presence: Presence
  selection: Selection
  autoSet: readonly Expression[]
  accent: AccentId
  motionStatus: MotionUiStatus
  wakeLock: WakeLockUi
  reduced: boolean
  onClose: () => void
  onPresence: (presence: Presence) => void
  onSelection: (selection: Selection) => void
  onToggleAuto: (expression: Expression) => void
  onAccent: (accent: AccentId) => void
  onEnableMotion: () => void
  onPreviewWake: () => void
  onToggleWakeLock: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <div
        ref={panelRef}
        id="buddy-controls"
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => trapTab(event, panelRef.current)}
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">Motion Buddy</p>
            <h2 id="controls-title">Controls</h2>
          </div>
          <button ref={closeRef} type="button" className="close" onClick={onClose}>
            Close
          </button>
        </div>

        <fieldset>
          <legend>While this page is open</legend>
          <div className="choice-row">
            <button type="button" aria-pressed={presence === 'awake'} onClick={() => onPresence('awake')}>
              Awake
            </button>
            <button type="button" aria-pressed={presence === 'rest'} onClick={() => onPresence('rest')}>
              Rest until motion
            </button>
          </div>
          <p className="note">
            {presence === 'awake'
              ? 'Stays expressive while this page is open and visible.'
              : 'Rests until a clear movement arrives, then stays up for a short calm spell. Preview wake tries that without a sensor.'}
          </p>
        </fieldset>

        <fieldset>
          <legend>Expression</legend>
          <div className="choice-grid">
            <button type="button" aria-pressed={selection === 'auto'} onClick={() => onSelection('auto')}>
              Auto
            </button>
            {EXPRESSIONS.map((expression) => (
              <button
                key={expression}
                type="button"
                aria-pressed={selection === expression}
                onClick={() => onSelection(expression)}
              >
                {EXPRESSION_LABEL[expression]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Auto uses</legend>
          <div className="choice-grid">
            {EXPRESSIONS.map((expression) => (
              <button
                key={expression}
                type="button"
                aria-pressed={autoSet.includes(expression)}
                onClick={() => onToggleAuto(expression)}
              >
                Use {EXPRESSION_LABEL[expression]}
              </button>
            ))}
          </div>
          <p className="note">Auto keeps at least one expression. It pauses while the face is resting.</p>
        </fieldset>

        <fieldset>
          <legend>Accent</legend>
          <div className="swatches">
            {ACCENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="swatch"
                style={{ background: item.bg }}
                aria-label={`Accent ${item.label}`}
                aria-pressed={accent === item.id}
                onClick={() => onAccent(item.id)}
              >
                <span className="swatch-iris" style={{ background: item.iris }} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Tilt</legend>
          <div className="choice-row">
            <button
              type="button"
              onClick={onEnableMotion}
              disabled={motionStatus === 'waiting' || motionStatus === 'active' || motionStatus === 'paused'}
            >
              {motionButton(motionStatus)}
            </button>
            <button type="button" onClick={onPreviewWake} disabled={presence !== 'rest'}>
              Preview wake
            </button>
          </div>
          <p className="note" role="status">
            {motionCopy(motionStatus)}
          </p>
        </fieldset>

        <fieldset>
          <legend>Screen</legend>
          <button type="button" onClick={onToggleWakeLock} disabled={wakeLock === 'unsupported'}>
            {wakeLock === 'granted' ? 'Stop keeping screen on' : wakeLock === 'unsupported' ? 'Screen wake lock unavailable' : 'Keep screen on'}
          </button>
          <p className="note" role="status">
            {wakeLockCopy(wakeLock)}
          </p>
        </fieldset>

        {reduced ? <p className="note">Calmer motion is on from your system setting. Blinks are rarer and expression changes are shorter.</p> : null}

        <details className="help">
          <summary>Setup and limits</summary>
          <ul>
            <li>Motion Buddy runs only while this page is open and visible. It does not wake a locked or sleeping phone, and it stops if the browser suspends the tab.</li>
            <li>This is a browser preview, not an iPhone app or an Apple Watch app. A square screen here is only a layout check.</li>
            <li>Tilt is optional. Motion counts as on only after orientation events arrive. The page has to be a secure context, such as HTTPS.</li>
            <li>Preview wake is a stand-in so rest and wake can be tried without hardware. It is not a wrist raise.</li>
            <li>Screen wake lock, if the browser grants it, only keeps this visible page from dimming. It is not a system always-on switch.</li>
            <li>Maps, navigation apps, music, and accounts are not part of this preview.</li>
            <li>Warmth and battery use have not been measured.</li>
          </ul>
        </details>
      </div>
    </div>
  )
}

function motionButton(status: MotionUiStatus): string {
  if (status === 'waiting') return 'Waiting for tilt…'
  if (status === 'active') return 'Motion on'
  if (status === 'paused') return 'Motion paused'
  return 'Enable motion'
}

function motionCopy(status: MotionUiStatus): string {
  switch (status) {
    case 'idle':
      return 'Tilt is off. Enable motion asks this browser for orientation, and only after you tap.'
    case 'waiting':
      return 'Waiting for an orientation event. Motion is not on yet.'
    case 'active':
      return 'Orientation events are arriving. Small jitters stay ignored.'
    case 'denied':
      return 'Motion permission was denied. Preview wake still works while resting.'
    case 'unavailable':
      return 'This page cannot read tilt. Use a secure page, or Preview wake.'
    case 'no-events':
      return 'No orientation events arrived, so motion was not turned on.'
    case 'paused':
      return 'Tilt listening is paused while this page is hidden.'
  }
}

function wakeLockCopy(status: WakeLockUi): string {
  switch (status) {
    case 'unsupported':
      return 'This browser has no screen wake lock.'
    case 'off':
      return 'Off. If granted, it only keeps the screen on while this page is visible.'
    case 'granted':
      return 'On for this visible page. The browser drops it if you leave, and it will not wake a locked phone.'
    case 'denied':
      return 'The browser refused the screen wake lock.'
  }
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
