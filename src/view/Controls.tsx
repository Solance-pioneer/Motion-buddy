import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Presence, Selection } from '../logic/engine.ts'
import type { SceneKey } from '../logic/scenes.ts'
import { POSE_IDS, type PoseId, type Profile } from '../logic/library.ts'
import type { ReactionKind, Sensitivity } from '../logic/reactions.ts'
import { ACCENTS, type AccentId } from './accents.ts'
import type { FaceStyle } from './applyPose.ts'
import type { MotionUiStatus, SensorSignals } from './useTilt.ts'
import type { WakeLockUi } from './useWakeLock.ts'

const EXPRESSION_LABEL: Record<PoseId, string> = {
  curious: 'Curious',
  happy: 'Happy',
  laugh: 'Laugh',
  shy: 'Shy',
  smug: 'Smug',
  grumpy: 'Grumpy',
  determined: 'Determined',
  worried: 'Worried',
  startled: 'Startled',
  sleepy: 'Sleepy',
  pant: 'Pant',
  dizzy: 'Dizzy',
  wink: 'Wink',
  content: 'Content',
  yawn: 'Yawn',
}

const PROFILE_NOTE: Record<Profile, string> = {
  desk: 'Chill and curious, with daydreams and an occasional yawn. The face stays the whole picture.',
  car: 'Lean the phone from a neutral you set. Toward you leans ahead, away eases off, left and right bank. This is phone tilt, not the car’s speed or brakes, and it is not the Little racer scene.',
  wrist: 'Walking and running faces, including a pant and a happy recovery. A browser profile, not a watch, step count, or heart rate.',
}

export function Controls({
  presence,
  selection,
  profile,
  autoSet,
  accent,
  style,
  sensitivity,
  allowStartled,
  allowDizzy,
  signals,
  motionStatus,
  wakeLock,
  reduced,
  onClose,
  onPlayScene,
  onPresence,
  onProfile,
  onCarNeutral,
  onSelection,
  onToggleAuto,
  onAccent,
  onStyle,
  onSensitivity,
  onToggleReaction,
  onEnableMotion,
  onStopMotion,
  soundOn,
  soundAvailable,
  onToggleSound,
  onPreviewWake,
  onPreviewGlance,
  onPreviewReaction,
  onToggleWakeLock,
}: {
  presence: Presence
  selection: Selection
  profile: Profile
  autoSet: readonly PoseId[]
  accent: AccentId
  style: FaceStyle
  sensitivity: Sensitivity
  allowStartled: boolean
  allowDizzy: boolean
  signals: SensorSignals
  motionStatus: MotionUiStatus
  wakeLock: WakeLockUi
  reduced: boolean
  onClose: () => void
  onPlayScene: (key: SceneKey) => void
  onPresence: (presence: Presence) => void
  onProfile: (profile: Profile) => void
  onCarNeutral: () => void
  onSelection: (selection: Selection) => void
  onToggleAuto: (expression: PoseId) => void
  onAccent: (accent: AccentId) => void
  onStyle: (style: FaceStyle) => void
  onSensitivity: (sensitivity: Sensitivity) => void
  onToggleReaction: (kind: ReactionKind, enabled: boolean) => void
  onEnableMotion: () => void
  onStopMotion: () => void
  soundOn: boolean
  soundAvailable: boolean
  onToggleSound: () => void
  onPreviewWake: () => void
  onPreviewGlance: () => void
  onPreviewReaction: (kind: ReactionKind) => void
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
          <legend>Where it is</legend>
          <p className="release">Expressive v3.5</p>
          <div className="choice-row">
            <button type="button" aria-pressed={profile === 'desk'} onClick={() => onProfile('desk')}>
              Desk
            </button>
            <button type="button" aria-pressed={profile === 'car'} onClick={() => onProfile('car')}>
              Car
            </button>
            <button type="button" aria-pressed={profile === 'wrist'} onClick={() => onProfile('wrist')}>
              Wrist
            </button>
          </div>
          <p className="note">{PROFILE_NOTE[profile]}</p>
          {profile === 'car' ? (
            <>
              <div className="choice-row">
                <button type="button" onClick={onCarNeutral}>Set neutral</button>
              </div>
              <p className="note">{carTiltStatus(motionStatus, reduced)}</p>
            </>
          ) : null}
        </fieldset>

        <fieldset>
          <legend>Dress-up scenes</legend>
          <div className="choice-row">
            <button type="button" onClick={() => onPlayScene('ninja')}>Ninja peek</button>
            <button type="button" onClick={() => onPlayScene('cord_hero')}>Rope hero</button>
            <button type="button" onClick={() => onPlayScene('racer')}>Little racer</button>
            <button type="button" onClick={() => onPlayScene('sheet_ghost')}>Sheet ghost</button>
          </div>
          <p className="note">Each scene plays through, then Buddy is plain again. Little racer is that short scene. Car tilt is the phone lean while Car is selected. Mute still silences a scene.</p>
        </fieldset>

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
            {POSE_IDS.map((expression) => (
              <button
                key={expression}
                type="button"
                aria-pressed={selection === expression}
                disabled={!autoSet.includes(expression)}
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
            {POSE_IDS.map((expression) => (
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
          <p className="note">Auto keeps at least one idle face. Unchecked faces stay out of Auto and out of motion, including recovery.</p>
        </fieldset>

        <fieldset>
          <legend>Face style</legend>
          <div className="choice-row">
            <button type="button" aria-pressed={style === 'soft'} onClick={() => onStyle('soft')}>
              Soft capsules
            </button>
            <button type="button" aria-pressed={style === 'tile'} onClick={() => onStyle('tile')}>
              Bevelled tiles
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Movement reactions</legend>
          <div className="choice-row">
            <button type="button" aria-pressed={allowStartled} onClick={() => onToggleReaction('startled', !allowStartled)}>
              Worried / startled
            </button>
            <button type="button" aria-pressed={allowDizzy} onClick={() => onToggleReaction('dizzy', !allowDizzy)}>
              Dizzy / recovery
            </button>
          </div>
          <div className="choice-grid">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button key={level} type="button" aria-pressed={sensitivity === level} onClick={() => onSensitivity(level)}>
                {level[0].toUpperCase() + level.slice(1)} sensitivity
              </button>
            ))}
          </div>
          <p className="note">
            Orientation tilts the face. A gentle held movement, from the phone’s movement sensor, plays worried then startled. A quicker move plays dizzy, then a calm recovery. Low sensitivity still notices a gentle deliberate move. Do not shake hard.
          </p>
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

        <fieldset>
          <legend>Accent</legend>
          <div className="swatches">
            {ACCENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="swatch"
                style={{ background: '#000000' }}
                aria-label={`Accent ${item.label}`}
                aria-pressed={accent === item.id}
                onClick={() => onAccent(item.id)}
              >
                <span className="swatch-iris" style={{ background: item.face }} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>This device</legend>
          <button
            type="button"
            onClick={onEnableMotion}
            disabled={motionStatus === 'waiting' || motionStatus === 'active' || motionStatus === 'paused'}
          >
            {motionButton(motionStatus)}
          </button>
          {motionStatus === 'waiting' || motionStatus === 'active' || motionStatus === 'paused' ? (
            <button type="button" onClick={onStopMotion}>
              Turn motion off
            </button>
          ) : null}
          <p className="note" role="status">
            {motionCopy(motionStatus, signals)}
          </p>
          <button type="button" onClick={onToggleSound} disabled={!soundAvailable}>
            {soundAvailable ? (soundOn ? 'Sound on' : 'Sound off') : 'Sound unavailable'}
          </button>
          <p className="note">Sound is on until you turn it off here. Nothing plays until the first tap.</p>
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

        {reduced ? <p className="note">Calmer motion is on. Expression changes stay still: no glance, lift, or dizzy wobble.</p> : null}

        <details className="help">
          <summary>Setup and limits</summary>
          <ul>
            <li>Motion Buddy runs only while this page is open and visible. It does not wake a locked or sleeping phone, and it stops if the browser suspends the tab.</li>
            <li>This is a browser preview, not an iPhone app or an Apple Watch app. A square screen here is only a layout check.</li>
            <li>On an iPhone, the first tap has to be Allow motion on the face. iOS will not show the permission prompt before that tap. Other browsers start listening as soon as the secure page opens. Turn motion off stops listening until you ask again.</li>
            <li>Simulation buttons are not a sensor and do not wake a locked phone.</li>
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
  if (status === 'off') return 'Enable motion'
  return 'Enable motion'
}

function motionCopy(status: MotionUiStatus, signals: SensorSignals): string {
  switch (status) {
    case 'idle':
      return 'Motion has not started. On an iPhone, tap Allow motion on the face. That tap is what lets iOS show the permission prompt.'
    case 'off':
      return 'Motion is off until you tap Enable motion. The face keeps its own idle animation.'
    case 'waiting':
      return 'Waiting for a numeric tilt or movement event. Motion is not on yet.'
    case 'active':
      if (signals.tilt && signals.movement) return 'Tilt and movement events are arriving. Small jitters stay ignored.'
      if (signals.tilt) return 'Tilt events are arriving, so the face can glance. Movement events have not arrived, so worried and dizzy will not come from the device.'
      return 'Movement events are arriving. Tilt events have not, so glance stays off.'
    case 'denied':
      return 'Motion permission was denied. Simulation still works. The sensor is not on.'
    case 'unavailable':
      return 'This page cannot read device motion. Use a secure page, or the simulation buttons.'
    case 'no-events':
      return 'No tilt or movement events arrived, so motion was not turned on.'
    case 'paused':
      return 'Sensor listening is paused while this page is hidden.'
  }
}

function carTiltStatus(status: MotionUiStatus, reduced: boolean): string {
  if (reduced) return 'Reduced motion is on, so Car tilt stays neutral.'
  switch (status) {
    case 'active':
      return 'Tilt is live from the neutral you set. Toward you leans ahead, away eases off, left and right bank.'
    case 'waiting':
      return 'Waiting for a tilt reading. Car stays neutral until one arrives.'
    case 'denied':
      return 'Motion permission was denied. Car tilt stays neutral.'
    case 'unavailable':
      return 'This browser has no tilt sensor. Car tilt stays neutral.'
    case 'no-events':
      return 'No tilt events arrived. Car tilt stays neutral.'
    case 'paused':
      return 'Tilt paused while this page is hidden. Car stays neutral.'
    case 'off':
    case 'idle':
      return 'Motion is off. Car tilt stays neutral until you turn it on.'
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
