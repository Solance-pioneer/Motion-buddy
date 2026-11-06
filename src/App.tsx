import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BuddyEngine, type BuddyState, type Presence, type Selection } from './logic/engine.ts'
import type { PoseId } from './logic/library.ts'
import { applyPose, type FaceHandles, type FaceStyle } from './view/applyPose.ts'
import { FaceBlend } from './view/features.ts'
import { glanceOffset } from './view/glance.ts'
import { accentById, type AccentId } from './view/accents.ts'
import { Controls } from './view/Controls.tsx'
import { Face } from './view/Face.tsx'
import { useScreenWakeLock } from './view/useWakeLock.ts'
import { motionNeedsGesture, useTilt } from './view/useTilt.ts'
import type { ReactionKind, Sensitivity } from './logic/reactions.ts'
import { loadSoundPrefs, playCue, setSoundMuted, soundStatus, unlockSound } from './logic/sfx.ts'

type TestApi = {
  seek: (ms: number) => void
  getState: () => BuddyState
  setSelection: (selection: Selection) => void
  setPresence: (presence: Presence) => void
  previewWake: () => void
  feedMotion: (level: number) => void
  feedAcceleration: (magnitude: number, lateral?: number) => void
  feedLook: (x: number, y: number) => void
  previewReaction: (kind: ReactionKind) => void
  setReactionEnabled: (kind: ReactionKind, enabled: boolean) => void
  elapse: (ms: number) => void
  setHidden: (hidden: boolean) => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function testHookEnabled(): boolean {
  if (import.meta.env.DEV) return true
  return new URLSearchParams(window.location.search).has('e2e')
}

function hintDuration(): number {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('e2e')) return 6_500
  const raw = params.get('hintMs')
  if (raw == null || raw === '') return 6_500
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : 6_500
}

function viewKey(state: BuddyState): string {
  return [
    state.presence,
    state.selection,
    state.autoSet.join(','),
    state.expression,
    state.profile,
    state.phase,
    state.resting ? 'resting' : 'up',
    state.reduced ? 'reduced' : 'full',
    state.hidden ? 'hidden' : 'shown',
    state.reaction,
    state.sensitivity,
    state.allowStartled ? 'startled-on' : 'startled-off',
    state.allowDizzy ? 'dizzy-on' : 'dizzy-off',
  ].join('|')
}

function openerName(coarse: boolean): string {
  return coarse
    ? 'Motion Buddy. Tap for controls.'
    : 'Motion Buddy. Click or press Enter for controls.'
}

export function App() {
  const [engine] = useState(() => {
    const created = new BuddyEngine()
    created.setReduced(prefersReducedMotion())
    return created
  })
  const rootRef = useRef<HTMLElement>(null)
  const faceButtonRef = useRef<HTMLButtonElement>(null)
  const handlesRef = useRef<FaceHandles | null>(null)
  const lastKey = useRef('')
  const [view, setView] = useState<BuddyState>(() => engine.snapshot())
  const [open, setOpen] = useState(false)
  const [accent, setAccent] = useState<AccentId>('white')
  const [style, setStyle] = useState<FaceStyle>('soft')
  const styleRef = useRef(style)
  const [coarse, setCoarse] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const [hintOn, setHintOn] = useState(true)
  const [soundOn, setSoundOn] = useState(false)
  const [soundAvailable, setSoundAvailable] = useState(true)
  const [seenControls, setSeenControls] = useState(false)
  const accentRef = useRef(accent)
  const blendRef = useRef(new FaceBlend())
  const [promptDone, setPromptDone] = useState(false)

  const publish = useCallback((state: BuddyState, dt = 0) => {
    const root = rootRef.current
    const colors = accentById(accentRef.current)
    if (root) {
      root.dataset.presence = state.presence
      root.dataset.selection = state.selection
      root.dataset.expression = state.expression
      root.dataset.profile = state.profile
      root.dataset.speed = state.speed ? 'on' : 'off'
      root.dataset.gaze = `${state.gazeX.toFixed(2)},${state.gazeY.toFixed(2)}`
      root.dataset.phase = state.phase
      root.dataset.display = state.presence === 'rest' && state.wakefulness < 0.5 ? 'resting' : state.expression
      root.dataset.auto = state.autoSet.join(',')
      root.dataset.eyes = state.pose.eyeOpen.toFixed(2)
      root.dataset.mouth = state.pose.mouthOpen.toFixed(2)
      root.dataset.curve = state.pose.mouthCurve.toFixed(2)
      root.dataset.wake = state.wakefulness.toFixed(2)
      root.dataset.blink = state.blink.toFixed(2)
      root.dataset.reduced = state.reduced ? 'true' : 'false'
      root.dataset.paused = state.hidden ? 'true' : 'false'
      root.dataset.accent = accentRef.current
      root.dataset.reaction = state.reaction
      root.dataset.style = styleRef.current
      root.dataset.sensitivity = state.sensitivity
      root.style.setProperty('--face', colors.face)
    }
    const features = blendRef.current.sample(state.expression, styleRef.current, state.reduced, state.speed, dt)
    if (root) {
      root.dataset.eyeH = features.left.h.toFixed(2)
      root.dataset.glanceX = glanceOffset(state.gazeX, state.gazeY).x.toFixed(2)
    }
    if (handlesRef.current) {
      applyPose(handlesRef.current, features, state.blink, colors.face, state.gazeX, state.gazeY)
    }
    const key = viewKey(state)
    if (key !== lastKey.current) {
      lastKey.current = key
      setView(state)
    }
  }, [])

  const onReady = useCallback((handles: FaceHandles) => {
    handlesRef.current = handles
  }, [])

  const onSample = useCallback(
    (sample: { x: number; y: number; level: number }) => {
      engine.feedLook(sample.x, sample.y)
      engine.feedMotion(sample.level)
    },
    [engine],
  )
  const onAcceleration = useCallback((magnitude: number, lateral: number) => {
    engine.feedAcceleration(magnitude, lateral)
  }, [engine])

  const tilt = useTilt(onSample, onAcceleration)
  const wakeLock = useScreenWakeLock()
  const enableMotion = tilt.enable
  const askForMotion = motionNeedsGesture() && !promptDone && tilt.status === 'idle'

  useEffect(() => {
    if (motionNeedsGesture()) return
    void enableMotion()
  }, [enableMotion])

  useLayoutEffect(() => {
    accentRef.current = accent
    styleRef.current = style
    publish(engine.snapshot())
  })

  useEffect(() => {
    const loop = { raf: 0, running: false, last: performance.now() }
    const frame = (now: number) => {
      const dt = now - loop.last
      loop.last = now
      publish(engine.tick(dt), dt)
      loop.raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (loop.running || document.hidden) return
      loop.running = true
      engine.setHidden(false)
      loop.last = performance.now()
      loop.raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      loop.running = false
      engine.setHidden(true)
      cancelAnimationFrame(loop.raf)
    }
    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [engine, publish])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      engine.setReduced(media.matches)
      publish(engine.snapshot())
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [engine, publish])

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)')
    const apply = () => setCoarse(media.matches)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setHintOn(false), hintDuration())
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    loadSoundPrefs()
    setSoundAvailable(soundStatus().available)
    setSoundOn(soundStatus().unlocked && !soundStatus().muted)
  }, [])

  useEffect(() => {
    if (view.reaction === 'dizzy') playCue('dizzy')
    else if (view.reaction === 'startled' || view.reaction === 'worried') playCue('surprise')
  }, [view.reaction])

  useEffect(() => {
    if (!testHookEnabled()) return
    const testWindow = window as Window & { __motionBuddyTest?: TestApi }
    const elapse = (ms: number) => {
      let left = ms
      while (left > 0) {
        const dt = Math.min(16, left)
        publish(engine.tick(dt), dt)
        left -= dt
      }
    }
    testWindow.__motionBuddyTest = {
      seek: (ms: number) => {
        engine.seek(ms)
        publish(engine.snapshot())
      },
      getState: () => engine.snapshot(),
      setSelection: (selection: Selection) => {
        engine.setSelection(selection)
        publish(engine.snapshot())
      },
      setPresence: (presence: Presence) => {
        engine.setPresence(presence)
        publish(engine.snapshot())
      },
      previewWake: () => {
        engine.previewWake()
        publish(engine.snapshot())
      },
      feedMotion: (level: number) => {
        engine.feedMotion(level)
      },
      feedAcceleration: (magnitude: number, lateral?: number) => {
        engine.feedAcceleration(magnitude, lateral ?? 0)
      },
      feedLook: (x: number, y: number) => {
        engine.feedLook(x, y)
      },
      previewReaction: (kind: ReactionKind) => {
        engine.previewReaction(kind)
        publish(engine.snapshot())
      },
      setReactionEnabled: (kind: ReactionKind, enabled: boolean) => {
        engine.setReactionEnabled(kind, enabled)
        publish(engine.snapshot())
      },
      elapse,
      setHidden: (hidden: boolean) => {
        engine.setHidden(hidden)
        publish(engine.snapshot())
      },
    }
    return () => {
      delete testWindow.__motionBuddyTest
    }
  }, [engine, publish])

  const closeControls = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => faceButtonRef.current?.focus())
  }, [])

  const showHint = hintOn && !seenControls && !open
  const live = view.reaction !== 'none'
    ? `Motion Buddy looks ${view.reaction}.`
    : view.presence === 'rest' && view.wakefulness < 0.5
      ? 'Motion Buddy is resting.'
      : `Motion Buddy looks ${view.expression}.`

  return (
    <main
        ref={rootRef}
        className="app"
        data-controls={open ? 'open' : 'closed'}
        data-motion={tilt.status}
        data-tilt={tilt.signals.tilt ? 'live' : 'off'}
        data-movement={tilt.signals.movement ? 'live' : 'off'}
        data-wake-lock={wakeLock.status}
      >
      <button
        ref={faceButtonRef}
        type="button"
        className="face-button"
        aria-label={openerName(coarse)}
        aria-expanded={open}
        aria-controls="buddy-controls"
        aria-haspopup="dialog"
        tabIndex={open ? -1 : 0}
        inert={open}
        onClick={() => {
          if (!open) {
            setSeenControls(true)
            setHintOn(false)
            setOpen(true)
          }
        }}
      >
        <Face onReady={onReady} />
        {showHint ? (
          <span className={askForMotion ? 'hint hint-raised' : 'hint'} data-testid="hint">
            {coarse ? 'Tap for controls' : 'Click or press Enter for controls'}
          </span>
        ) : null}
      </button>
      {askForMotion && !open ? (
        <div className="launch">
          <button
            type="button"
            className="allow-motion"
            onClick={() => {
              setPromptDone(true)
              void tilt.enable()
            }}
          >
            Allow motion
          </button>
          <button type="button" className="allow-skip" onClick={() => setPromptDone(true)}>
            Not now
          </button>
        </div>
      ) : null}
      {open ? (
        <Controls
          presence={view.presence}
          selection={view.selection}
          profile={view.profile}
          autoSet={view.autoSet}
          accent={accent}
          style={style}
          sensitivity={view.sensitivity}
          allowStartled={view.allowStartled}
          allowDizzy={view.allowDizzy}
          signals={tilt.signals}
          motionStatus={tilt.status}
          wakeLock={wakeLock.status}
          reduced={view.reduced}
          onClose={closeControls}
          onPresence={(presence) => {
            engine.setPresence(presence)
            publish(engine.snapshot())
          }}
          onProfile={(profile) => {
            engine.setProfile(profile)
            publish(engine.snapshot())
          }}
          onSelection={(selection) => {
            engine.setSelection(selection)
            publish(engine.snapshot())
          }}
          onToggleAuto={(expression: PoseId) => {
            engine.toggleAutoExpression(expression)
            publish(engine.snapshot())
          }}
          onAccent={(next) => {
            accentRef.current = next
            setAccent(next)
            publish(engine.snapshot())
          }}
          onStyle={(next) => {
            styleRef.current = next
            setStyle(next)
            publish(engine.snapshot())
          }}
          onSensitivity={(next: Sensitivity) => {
            engine.setSensitivity(next)
            publish(engine.snapshot())
          }}
          onToggleReaction={(kind, enabled) => {
            engine.setReactionEnabled(kind, enabled)
            publish(engine.snapshot())
          }}
          onPreviewGlance={() => {
            engine.previewGlance(1)
            publish(engine.snapshot())
          }}
          onPreviewReaction={(kind) => {
            engine.previewReaction(kind)
            publish(engine.snapshot())
          }}
          onEnableMotion={() => {
            setPromptDone(true)
            void tilt.enable()
          }}
          onStopMotion={() => {
            setPromptDone(true)
            tilt.stop()
          }}
          onPreviewWake={() => {
            engine.previewWake()
            publish(engine.snapshot())
          }}
          onToggleWakeLock={wakeLock.toggle}
          soundOn={soundOn}
          soundAvailable={soundAvailable}
          onToggleSound={() => {
            if (!unlockSound()) {
              setSoundAvailable(false)
              return
            }
            const enable = !soundOn
            setSoundMuted(!enable)
            setSoundOn(enable)
            if (enable) playCue('chirp')
          }}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </main>
  )
}
