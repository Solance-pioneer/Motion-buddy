import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CompanionEngine, type CompanionState, type Mode } from './logic/engine.ts'
import { pointerLean } from './logic/motion.ts'
import { applyPose, type PoseHandles } from './view/applyPose.ts'
import { BramFace } from './view/BramFace.tsx'
import { motionButtonLabel, motionCopy, readoutLabel } from './view/copy.ts'
import { useTilt } from './view/useTilt.ts'

type BramTestApi = {
  seek: (ms: number) => void
  getState: () => CompanionState
  setMode: (mode: Mode) => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function testHookEnabled(): boolean {
  if (import.meta.env.DEV) return true
  return new URLSearchParams(window.location.search).has('e2e')
}

function viewKey(state: CompanionState): string {
  return [state.mode, state.settled, state.phase, state.sway, state.reduced, state.sensor].join('|')
}

export function App() {
  const [engine] = useState(() => {
    const created = new CompanionEngine()
    created.setReduced(prefersReducedMotion())
    return created
  })

  const rootRef = useRef<HTMLElement>(null)
  const handlesRef = useRef<PoseHandles | null>(null)
  const lastKey = useRef('')
  const [view, setView] = useState<CompanionState>(() => engine.snapshot())

  const publish = useCallback((state: CompanionState) => {
    const root = rootRef.current
    if (root) {
      root.dataset.blend = state.blend.toFixed(3)
      root.dataset.settled = state.settled
      root.dataset.phase = state.phase
      root.dataset.lean = state.lean.toFixed(3)
      root.dataset.bounce = state.bounce.toFixed(2)
      root.dataset.blink = state.blink.toFixed(2)
      root.dataset.reduced = state.reduced ? 'true' : 'false'
      root.dataset.mode = state.mode
      root.dataset.sway = state.sway ? 'true' : 'false'
    }
    if (handlesRef.current) applyPose(handlesRef.current, state)
    const key = viewKey(state)
    if (key !== lastKey.current) {
      lastKey.current = key
      setView(state)
    }
  }, [])

  const onReady = useCallback((handles: PoseHandles) => {
    handlesRef.current = handles
  }, [])

  const onPose = useCallback(() => {
    publish(engine.snapshot())
  }, [engine, publish])

  const { status, enable, setLevel } = useTilt(engine, onPose)

  useLayoutEffect(() => {
    publish(engine.snapshot())
  })

  useEffect(() => {
    const loop = { raf: 0, running: false, last: performance.now() }

    const frame = (now: number) => {
      const dt = now - loop.last
      loop.last = now
      publish(engine.tick(dt))
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
    const root = rootRef.current
    if (!root) return

    const move = (event: PointerEvent) => {
      const state = engine.snapshot()
      if (state.sensor || state.reduced) return
      const rect = root.getBoundingClientRect()
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
      const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
      const lean = pointerLean(nx, ny)
      engine.setLeanTarget(lean.x, lean.y)
    }

    const leave = () => {
      if (!engine.snapshot().sensor) engine.setLeanTarget(0, 0)
    }

    root.addEventListener('pointermove', move)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', leave)
    }
  }, [engine])

  useEffect(() => {
    if (!testHookEnabled()) return
    const testWindow = window as Window & { __bramTest?: BramTestApi }
    testWindow.__bramTest = {
      seek: (ms: number) => {
        engine.seek(ms)
        publish(engine.snapshot())
      },
      getState: () => engine.snapshot(),
      setMode: (mode: Mode) => {
        engine.setMode(mode)
        publish(engine.snapshot())
      },
    }
    return () => {
      delete testWindow.__bramTest
    }
  }, [engine, publish])

  const selectMode = (mode: Mode) => {
    engine.setMode(mode)
    publish(engine.snapshot())
  }

  const toggleSway = () => {
    engine.setSway(!engine.snapshot().sway)
    publish(engine.snapshot())
  }

  const swayDisabled = view.reduced || view.sensor || status === 'active'
  const motionDisabled = view.reduced || status === 'waiting' || status === 'active'

  return (
    <main ref={rootRef} className="app" data-motion={status} aria-label="Bram">
      <header className="top">
        <div>
          <p className="eyebrow">Pocket lantern</p>
          <h1>Bram</h1>
        </div>
        <p className="readout" aria-live="polite">
          {readoutLabel(view)}
        </p>
      </header>

      <div className="stage">
        <BramFace onReady={onReady} />
      </div>

      <section className="dock" data-testid="dock" aria-label="Stationary controls">
        <p className="dock-intro">Same lantern, two moods. Auto swaps them slowly.</p>
        <div className="modes" role="group" aria-label="Mood">
          <button type="button" aria-pressed={view.mode === 'auto'} onClick={() => selectMode('auto')}>
            Auto
          </button>
          <button type="button" aria-pressed={view.mode === 'curious'} onClick={() => selectMode('curious')}>
            Curious
          </button>
          <button type="button" aria-pressed={view.mode === 'grumpy'} onClick={() => selectMode('grumpy')}>
            Grumpy
          </button>
        </div>
        <div className="secondary">
          <button type="button" onClick={() => void enable()} disabled={motionDisabled}>
            {motionButtonLabel(status)}
          </button>
          <button type="button" onClick={toggleSway} disabled={swayDisabled} aria-pressed={view.sway}>
            {view.sway ? 'Stop sway' : 'Preview sway'}
          </button>
        </div>
        <p className="motion-note" role="status">
          {motionCopy(status, view.reduced)}
        </p>
        {status === 'active' ? (
          <button type="button" className="level" onClick={setLevel}>
            Set level
          </button>
        ) : null}
      </section>

      <footer className="notes">
        <p>Stationary prototype — set up while parked.</p>
        <p>Screen-on warmth and battery use have not been measured, and are not certified safe.</p>
      </footer>
    </main>
  )
}
