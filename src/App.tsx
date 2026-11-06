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
import { sampleCandidate } from './logic/catalog.ts'
import { stepOriginalCue, type CueArm } from './logic/originals.ts'
import { advanceSound, claimChirp, fadePetGlide, initialMoveClock, initialSoundMemory, initialTapClock, loadSoundPrefs, noteFaceTap, noteMovement, playCue, setSoundMuted, soundStatus, startPetGlide, unlockSound, type MoveClock, type SoundMemory, type TapClock } from './logic/sfx.ts'
import { clearControl, desiredTravel, placeFace, roomFor, type FacePlace } from './logic/face-room.ts'
import { DOUBLE_MS, initialTouch, touchCancel, touchDown, touchExpire, touchMove, touchUp, type TouchClock } from './logic/touch.ts'

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
    state.showcase?.id ?? '',
  ].join('|')
}

function openerName(coarse: boolean): string {
  return coarse
    ? 'Motion Buddy. Double-tap for controls.'
    : 'Motion Buddy. Double-tap or press Enter for controls.'
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
  const [soundOn, setSoundOn] = useState(true)
  const [soundReady, setSoundReady] = useState(false)
  const heard = useRef<SoundMemory>(initialSoundMemory())
  const moves = useRef<MoveClock>(initialMoveClock())
  const faceTaps = useRef<TapClock>(initialTapClock())
  const touch = useRef<TouchClock>(initialTouch())
  const originalArm = useRef<CueArm | null>(null)
  const tapTimer = useRef(0)
  const pet = useRef({ x: 0, y: 0, sx: 1, sy: 1, ox: 0.5, oy: 0.5, tx: 0, ty: 0, tsx: 1, tsy: 1, tox: 0.5, toy: 0.5, dragging: false })
  const damp = (current: number, target: number, dt: number, ms: number) => {
    if (ms <= 0) return target
    return current + (target - current) * (1 - Math.exp(-dt / ms))
  }
  const measureRoom = () => {
    const button = faceButtonRef.current
    const svg = button?.querySelector('svg.face') as HTMLElement | null
    if (!button || !svg) return null
    const bounds = button.getBoundingClientRect()
    const style = getComputedStyle(button)
    const face = parseFloat(getComputedStyle(svg).width)
    const padL = parseFloat(style.paddingLeft) || 0
    const padR = parseFloat(style.paddingRight) || 0
    const padT = parseFloat(style.paddingTop) || 0
    const padB = parseFloat(style.paddingBottom) || 0
    const left = bounds.left + padL + (bounds.width - padL - padR - face) / 2
    const top = bounds.top + padT + (bounds.height - padT - padB - face) / 2
    return {
      room: roomFor(window.innerWidth, window.innerHeight, face, left, top, 8),
      left,
      top,
      size: face,
      svg,
    }
  }
  const aimPet = (nx: number, ny: number, dragging: boolean) => {
    const p = pet.current
    p.dragging = dragging
    if (engine.snapshot().reduced || !dragging) {
      p.tx = 0
      p.ty = 0
      p.tsx = 1
      p.tsy = 1
      p.tox = 0.5
      p.toy = 0.5
      return
    }
    const measured = measureRoom()
    if (!measured) return
    const desired = desiredTravel(nx, ny, measured.room)
    const raw: FacePlace = placeFace(desired.x, desired.y, measured.room)
    const mute = document.querySelector('.mute-chip')?.getBoundingClientRect() ?? null
    const placed = clearControl(
      raw,
      measured.left,
      measured.top,
      measured.size,
      mute ? { left: mute.left, top: mute.top, right: mute.right, bottom: mute.bottom } : null,
      measured.room,
    )
    p.tx = placed.x
    p.ty = placed.y
    p.tsx = placed.sx
    p.tsy = placed.sy
    p.tox = placed.originX
    p.toy = placed.originY
  }
  const releasePet = () => aimPet(0, 0, false)
  const stepPet = (dt: number) => {
    const p = pet.current
    const reduced = engine.snapshot().reduced
    const posMs = reduced ? 0 : p.dragging ? 90 : 520
    const squMs = reduced ? 0 : p.dragging ? 110 : 250
    p.x = damp(p.x, reduced ? 0 : p.tx, dt, posMs)
    p.y = damp(p.y, reduced ? 0 : p.ty, dt, posMs)
    p.sx = damp(p.sx, reduced ? 1 : p.tsx, dt, squMs)
    p.sy = damp(p.sy, reduced ? 1 : p.tsy, dt, squMs)
    p.ox = damp(p.ox, p.tox, dt, squMs)
    p.oy = damp(p.oy, p.toy, dt, squMs)
    const svg = faceButtonRef.current?.querySelector('svg.face') as HTMLElement | null
    if (svg) {
      svg.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${p.sx.toFixed(3)}, ${p.sy.toFixed(3)})`
      svg.style.transformOrigin = `${(p.ox * 100).toFixed(1)}% ${(p.oy * 100).toFixed(1)}%`
    }
    const root = rootRef.current
    if (root) root.dataset.pet = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.sx.toFixed(2)},${p.sy.toFixed(2)}`
  }
  const [muteLit, setMuteLit] = useState(false)
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
    const played = state.showcase ? sampleCandidate(state.showcase.id, state.showcase.elapsed, state.reduced, 'soft') : null
    const features = blendRef.current.sample(
      state.expression,
      styleRef.current,
      state.reduced,
      state.speed,
      dt,
      played ? { key: state.showcase?.id ?? '', features: played.features } : undefined,
    )
    if (root) {
      root.dataset.eyeH = features.left.h.toFixed(2)
      root.dataset.glanceX = glanceOffset(state.gazeX, state.gazeY).x.toFixed(2)
    }
    if (handlesRef.current) {
      applyPose(handlesRef.current, features, state.blink, colors.face, state.gazeX, state.gazeY)
    }
    const cue = stepOriginalCue(
      originalArm.current,
      state.showcase?.id ?? null,
      state.showcase?.elapsed ?? 0,
      !state.hidden && !state.reduced && soundStatus().unlocked && !soundStatus().muted,
    )
    originalArm.current = cue.arm
    if (cue.play) playCue(cue.play as 'sneeze_zip' | 'peek_pop' | 'pout_boop')
    stepPet(dt)
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
  const unlockQuiet = useCallback(() => {
    if (!unlockSound()) {
      setSoundAvailable(false)
      return
    }
    setSoundReady(true)
  }, [])
  const playChirp = useCallback(() => {
    if (soundStatus().muted || !soundOn) return
    const claimed = claimChirp(heard.current, performance.now(), { unlocked: true, muted: false, explicit: true })
    heard.current = claimed.memory
    if (claimed.ok) playCue('chirp')
  }, [soundOn])
  const confirmSingle = useCallback(() => {
    const step = touchExpire(touch.current, performance.now())
    touch.current = step.clock
    if (!step.singleTap) return
    const status = soundStatus()
    const state = engine.snapshot()
    const tap = noteFaceTap(faceTaps.current, {
      now: performance.now(),
      reduced: state.reduced,
      muted: status.muted || !soundOn,
      unlocked: status.unlocked,
      allowGrumpy: state.autoSet.includes('grumpy'),
      busyUntil: heard.current.voiceUntil,
    })
    faceTaps.current = tap.clock
    if (tap.frown && engine.requestScold()) {
      publish(engine.snapshot())
      if (tap.cue && playCue('disapprove')) heard.current = { ...heard.current, voiceUntil: performance.now() + 120 }
      return
    }
    if (!state.reduced) engine.requestGreeting()
    publish(engine.snapshot())
    playChirp()
  }, [engine, playChirp, publish, soundOn])
  const onAcceleration = useCallback((magnitude: number, lateral: number) => {
    engine.feedAcceleration(magnitude, lateral)
    const status = soundStatus()
    const state = engine.snapshot()
    const next = noteMovement(moves.current, {
      now: performance.now(),
      magnitude,
      reduced: state.reduced,
      muted: status.muted || !soundOn,
      unlocked: status.unlocked,
      allowDizzy: state.allowDizzy,
      allowGrumpy: state.autoSet.includes('grumpy'),
      busyUntil: heard.current.voiceUntil,
    })
    moves.current = next.clock
    if (next.cue === 'grumpy') {
      if (engine.requestScold() && playCue('disapprove')) heard.current = { ...heard.current, voiceUntil: performance.now() + 120 }
      publish(engine.snapshot())
    } else if (next.cue === 'dizzy') {
      const already = state.reaction === 'dizzy'
      engine.previewReaction('dizzy')
      publish(engine.snapshot())
      if (already && playCue('dizzy')) heard.current = { ...heard.current, voiceUntil: performance.now() + 1_200 }
    } else if (next.cue === 'chirp') {
      const claimed = claimChirp(heard.current, performance.now(), { unlocked: true, muted: false, explicit: true })
      heard.current = claimed.memory
      if (claimed.ok) playCue('chirp')
    }
  }, [engine, publish, soundOn])

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
      fadePetGlide(130)
      cancelAnimationFrame(loop.raf)
    }
    const onBlur = () => fadePetGlide(130)
    window.addEventListener('blur', onBlur)
    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
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
    if (!muteLit || !soundOn) return
    const id = window.setTimeout(() => setMuteLit(false), 2_800)
    return () => window.clearTimeout(id)
  }, [muteLit, soundOn])

  useEffect(() => {
    loadSoundPrefs()
    setSoundAvailable(soundStatus().available)
    setSoundOn(!soundStatus().muted)
  }, [])

  useEffect(() => {
    if (view.hidden || !soundOn) return
    const status = soundStatus()
    if (!status.unlocked || status.muted) return
    const next = advanceSound(
      heard.current,
      {
        expression: view.showcase?.id ?? view.expression,
        reaction: view.reaction,
        reduced: view.reduced,
        allowDizzy: view.allowDizzy,
        allowStartled: view.allowStartled,
      },
      performance.now(),
    )
    heard.current = next.memory
    if (next.cue) playCue(next.cue)
  }, [soundOn, view.expression, view.reaction, view.reduced, view.allowDizzy, view.allowStartled, view.hidden, view.showcase?.id, soundReady])

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
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          unlockQuiet()
          setSeenControls(true)
          setHintOn(false)
          setOpen(true)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          unlockQuiet()
          setMuteLit(true)
          const step = touchDown(touch.current, event.clientX, event.clientY, performance.now())
          touch.current = step.clock
          window.clearTimeout(tapTimer.current)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const step = touchMove(touch.current, event.clientX, event.clientY, performance.now())
          touch.current = step.clock
          if (!step.dragging) return
          const rect = event.currentTarget.getBoundingClientRect()
          const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
          const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
          if (step.chirp) startPetGlide()
          aimPet(nx, ny, true)
        }}
        onPointerUp={() => {
          const step = touchUp(touch.current, performance.now())
          touch.current = step.clock
          releasePet()
          fadePetGlide(130)
          engine.feedLook(0, 0)
          if (step.openMenu) {
            setSeenControls(true)
            setHintOn(false)
            setOpen(true)
            return
          }
          if (step.clock.pendingTapAt > 0) tapTimer.current = window.setTimeout(confirmSingle, DOUBLE_MS)
        }}
        onPointerCancel={() => {
          touch.current = touchCancel(touch.current).clock
          releasePet()
          fadePetGlide(130)
          engine.feedLook(0, 0)
        }}
      >
        <Face onReady={onReady} />
        {showHint ? (
          <span className={askForMotion ? 'hint hint-raised' : 'hint'} data-testid="hint">
            {coarse ? 'Double-tap for controls' : 'Double-tap or press Enter for controls'}
          </span>
        ) : null}
      </button>
      {(muteLit || !soundOn) && !open ? (
        <button
          type="button"
          className="mute-chip"
          aria-pressed={!soundOn}
          aria-label={soundOn ? 'Mute' : 'Unmute'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            unlockQuiet()
            const enable = !soundOn
            setSoundMuted(!enable)
            setSoundOn(enable)
            if (enable) playChirp()
          }}
        >
          <span>{soundOn ? 'Mute' : 'Unmute'}</span>
        </button>
      ) : null}
      {askForMotion && !open ? (
        <div className="launch">
          <button
            type="button"
            className="allow-motion"
onClick={() => {
          unlockQuiet()
          setPromptDone(true)
          void tilt.enable()
        }}
          >
            Allow motion
          </button>
          <button type="button" className="allow-skip" onClick={() => {
            unlockQuiet()
            setPromptDone(true)
          }}>
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
            if (enable) {
              const claimed = claimChirp(heard.current, performance.now(), { unlocked: true, muted: false, explicit: true })
              heard.current = claimed.memory
              if (claimed.ok) playCue('chirp')
            }
          }}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </main>
  )
}
