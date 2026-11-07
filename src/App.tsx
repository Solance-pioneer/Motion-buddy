import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BuddyEngine, type BuddyState, type Presence, type Selection } from './logic/engine.ts'
import type { PoseId, Profile } from './logic/library.ts'
import { applyPose, type FaceHandles, type FaceStyle } from './view/applyPose.ts'
import { FaceBlend } from './view/features.ts'
import { glanceOffset } from './view/glance.ts'
import { accentById, type AccentId } from './view/accents.ts'
import { Controls } from './view/Controls.tsx'
import { Face } from './view/Face.tsx'
import { CountryBackdrop, CountryEagle } from './view/country-art.tsx'
import flagsRaw from './assets/drive-audio-v1/svg/race_flags.svg?raw'
import confettiRaw from './assets/drive-audio-v1/svg/race_confetti.svg?raw'
import { useScreenWakeLock } from './view/useWakeLock.ts'
import { motionNeedsGesture, useTilt, type MotionUiStatus } from './view/useTilt.ts'
import type { ReactionKind, Sensitivity } from './logic/reactions.ts'
import { sampleCandidate } from './logic/catalog.ts'
import { stepOriginalCue, type CueArm } from './logic/originals.ts'
import { advanceSound, claimChirp, contactStatus, endContact, initialMoveClock, initialSoundMemory, initialTapClock, loadSoundPrefs, noteFaceTap, noteMovement, playCountryMusic, playCountrySting, playCue, playDriveCue, playPetNote, playSceneCue, sceneAudioStatus, setSceneGuard, setSoundMuted, soundStatus, stopDriveCue, stopSceneAudio, unlockSound, type MoveClock, type SoundMemory, type TapClock } from './logic/sfx.ts'
import { carFace, carTiltLive, driveCueOnEntry, initialDriveSoundClock, smoothCarTilt, type CarLook, type CarTilt, type DriveSoundClock } from './logic/car-tilt.ts'
import { classifyStroke, cueForGesture } from './logic/pet-play.ts'
import { heroCapePath, nextAmbientScene, sampleScene, SCENE_CUE, SCENE_GAP_MS, type SceneKey } from './logic/scenes.ts'
import { COUNTRY_MUSIC, EGYPT_WONDER_S, sampleCountry, takeCountryTurn, TRANSITION_MS, type CountryKey, type CountryPose } from './logic/countries.ts'
import { clearControl, desiredTravel, placeFace, roomForFeatures, type FacePlace, type PetMode } from './logic/face-room.ts'
import { DOUBLE_MS, initialTouch, touchCancel, touchDown, touchExpire, touchMove, touchUp, type TouchClock } from './logic/touch.ts'

function featureInset(svg: SVGSVGElement, size: number) {
  const glance = svg.querySelector('[data-part="glance"]') as SVGGraphicsElement | null
  const shift = glance?.transform.baseVal.consolidate()?.matrix
  const gx = shift?.e ?? 0
  const gy = shift?.f ?? 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const part of ['eye-l-path', 'eye-r-path', 'mouth']) {
    const node = svg.querySelector(`[data-part="${part}"]`) as SVGGraphicsElement | null
    if (!node) continue
    const box = node.getBBox()
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  const empty = { left: 0, top: 0, right: 0, bottom: 0 }
  if (!(maxX - minX > 4 && maxY - minY > 4)) return empty
  const unit = size / 100
  return {
    left: (minX + gx) * unit,
    top: (minY + gy) * unit,
    right: (100 - (maxX + gx)) * unit,
    bottom: (100 - (maxY + gy)) * unit,
  }
}

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
  contact: () => ReturnType<typeof contactStatus>
  tryCue: (kind: 'chirp' | 'dizzy' | 'scan') => boolean
  playScene: (key: SceneKey) => boolean
  playCountry: (key: CountryKey) => boolean
  showCountry: (key: CountryKey, ms: number) => boolean
  nudgeCountry: () => boolean
  sceneAudio: () => { active: boolean }
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
  const [sceneOn, setSceneOn] = useState(false)
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
  const pet = useRef({ x: 0, y: 0, sx: 1, sy: 1, ox: 0.5, oy: 0.5, tx: 0, ty: 0, tsx: 1, tsy: 1, tox: 0.5, toy: 0.5, nx: 0, ny: 0, px: 0, py: 0, squeeze: 1, wide: 1, onFace: false, mode: 'chase' as PetMode, dragging: false, downAt: 0, sounded: false, tucked: false, boopUntil: 0 })
  const sceneTickRef = useRef<(dt: number) => void>(() => {})
  const sceneRef = useRef<
    | { kind: 'costume'; key: SceneKey; started: number; banked: number; paused: boolean; cueFired: boolean }
    | { kind: 'country'; key: CountryKey; started: number; banked: number; paused: boolean; cueFired: boolean; stingFired: boolean; leadUntil: number; reduced: boolean }
    | null
  >(null)
  const cancelCountryRef = useRef<() => void>(() => {})
  const heldRef = useRef(false)
  const waitRelease = useRef(false)
  const calmRef = useRef(0)
  const lastScene = useRef<SceneKey | null>(null)
  const countryCursor = useRef(0)
  const carTarget = useRef<CarTilt>({ throttle: 0, bank: 0 })
  const carShown = useRef<CarTilt>({ throttle: 0, bank: 0 })
  const driveLook = useRef<CarLook>('neutral')
  const driveClock = useRef<DriveSoundClock>(initialDriveSoundClock())
  const raceWas = useRef<Profile>('desk')
  const raceTimer = useRef(0)
  const tiltStatusRef = useRef<MotionUiStatus>('idle')
  const openRef = useRef(false)
  const damp = (current: number, target: number, dt: number, ms: number) => {
    if (ms <= 0) return target
    return current + (target - current) * (1 - Math.exp(-dt / ms))
  }
  const measureRoom = () => {
    const button = faceButtonRef.current
    const svg = button?.querySelector('svg.face') as SVGSVGElement | null
    if (!button || !svg) return null
    const bounds = button.getBoundingClientRect()
    const style = getComputedStyle(button)
    const face = parseFloat(getComputedStyle(svg).width)
    if (!(face > 0)) return null
    const padL = parseFloat(style.paddingLeft) || 0
    const padR = parseFloat(style.paddingRight) || 0
    const padT = parseFloat(style.paddingTop) || 0
    const padB = parseFloat(style.paddingBottom) || 0
    const left = bounds.left + padL + (bounds.width - padL - padR - face) / 2
    const top = bounds.top + padT + (bounds.height - padT - padB - face) / 2
    const inset = featureInset(svg, face)
    return {
      room: roomForFeatures(window.innerWidth, window.innerHeight, face, left, top, inset, 8),
      left,
      top,
      size: face,
      inset,
      svg,
    }
  }
  const aimPet = (nx: number, ny: number, dragging: boolean) => {
    const p = pet.current
    p.dragging = dragging
    p.nx = nx
    p.ny = ny
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
    const anchor = {
      left: measured.inset.left / measured.size,
      right: 1 - measured.inset.right / measured.size,
      top: measured.inset.top / measured.size,
      bottom: 1 - measured.inset.bottom / measured.size,
    }
    const desired = desiredTravel(nx, ny, measured.room, p.mode)
    const raw: FacePlace = placeFace(desired.x, desired.y, measured.room, anchor)
    const mute = document.querySelector('.mute-chip')?.getBoundingClientRect() ?? null
    const portal = document.querySelector('.portal-chip')?.getBoundingClientRect() ?? null
    const cleared = clearControl(
      raw,
      measured.left,
      measured.top,
      measured.size,
      mute ? { left: mute.left, top: mute.top, right: mute.right, bottom: mute.bottom } : null,
      measured.room,
      measured.inset,
    )
    const placed = clearControl(
      cleared,
      measured.left,
      measured.top,
      measured.size,
      portal ? { left: portal.left, top: portal.top, right: portal.right, bottom: portal.bottom } : null,
      measured.room,
      measured.inset,
    )
    p.tx = placed.x
    p.ty = placed.y
    p.tsx = placed.sx
    p.tsy = placed.sy
    p.tox = placed.originX
    p.toy = placed.originY
  }
  const releasePet = () => {
    pet.current.onFace = false
    aimPet(0, 0, false)
  }
  const drawnCluster = (pad: number) => {
    const svg = faceButtonRef.current?.querySelector('svg.face')
    if (!svg) return null
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const part of ['eye-l-path', 'eye-r-path', 'mouth']) {
      const node = svg.querySelector(`[data-part="${part}"]`)
      const box = node?.getBoundingClientRect()
      if (!box || box.width < 1 || box.height < 1) continue
      left = Math.min(left, box.left)
      top = Math.min(top, box.top)
      right = Math.max(right, box.right)
      bottom = Math.max(bottom, box.bottom)
    }
    if (!(right > left && bottom > top)) return null
    return { left: left - pad, top: top - pad, right: right + pad, bottom: bottom + pad }
  }
  const drawnHit = (x: number, y: number, was: boolean) => {
    const enter = drawnCluster(36)
    const leave = drawnCluster(28)
    const inside = (box: { left: number; top: number; right: number; bottom: number } | null) =>
      Boolean(box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
    if (inside(enter)) return true
    if (!inside(leave)) return false
    return was
  }
  const stepPet = (dt: number) => {
    const p = pet.current
    if (p.dragging) aimPet(p.nx, p.ny, true)
    const reduced = engine.snapshot().reduced
    const touching = p.dragging && drawnHit(p.px, p.py, p.onFace)
    if (touching) p.onFace = true
    const spring = !p.dragging && performance.now() < p.boopUntil
    const squeezeTarget = reduced || !touching ? (spring ? 1.05 : 1) : 0.84
    const wideTarget = reduced || !touching ? (spring ? 0.96 : 1) : 1.12
    const squMs = reduced ? 0 : touching ? 70 : 120
    p.squeeze = damp(p.squeeze, squeezeTarget, dt, squMs)
    p.wide = damp(p.wide, wideTarget, dt, squMs)
    if (!p.dragging && !p.sounded && heldRef.current && performance.now() - p.downAt > 340) {
      p.tucked = true
      p.sounded = true
      playPetNote(cueForGesture('tuck'))
    }
    const posMs = reduced ? 0 : p.dragging ? 70 : 280
    p.x = damp(p.x, reduced ? 0 : p.tx, dt, posMs)
    p.y = damp(p.y, reduced ? 0 : p.ty, dt, posMs)
    p.sx = damp(p.sx, reduced ? 1 : p.tsx, dt, squMs)
    p.sy = damp(p.sy, reduced ? 1 : p.tsy, dt, squMs)
    p.ox = damp(p.ox, p.tox, dt, squMs)
    p.oy = damp(p.oy, p.toy, dt, squMs)
    const showSx = Math.max(0.76, p.sx * p.wide)
    const showSy = Math.max(0.72, p.sy * p.squeeze * (p.tucked && !p.dragging && !reduced ? 0.92 : 1))
    const svg = faceButtonRef.current?.querySelector('svg.face') as HTMLElement | null
    if (svg) {
      svg.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${showSx.toFixed(3)}, ${showSy.toFixed(3)})`
      svg.style.transformOrigin = `${(p.ox * 100).toFixed(1)}% ${(p.oy * 100).toFixed(1)}%`
    }
    const root = rootRef.current
    if (root) {
      root.dataset.pet = `${p.x.toFixed(1)},${p.y.toFixed(1)},${showSx.toFixed(2)},${showSy.toFixed(2)}`
      root.dataset.petMode = p.dragging ? p.mode : 'rest'
      const carOn = engine.snapshot().profile === 'car' && !engine.snapshot().reduced && !sceneRef.current && tiltStatusRef.current === 'active'
      const lean = carFace(carShown.current)
      if (carOn && !p.dragging && svg) {
        svg.style.transform = `translate(${lean.x.toFixed(1)}px, ${lean.y.toFixed(1)}px) rotate(${lean.rotate.toFixed(1)}deg) scale(${lean.sx.toFixed(3)}, ${lean.sy.toFixed(3)})`
      }
      root.dataset.car = carOn ? lean.state : 'off'
      root.dataset.carBank = carShown.current.bank.toFixed(2)
      root.dataset.squeeze = p.squeeze.toFixed(2)
      root.dataset.contact = contactStatus().active ? 'on' : 'off'
    }
  }
  const clearSceneMotion = () => {
    const svg = faceButtonRef.current?.querySelector('svg.face') as HTMLElement | null
    const costume = faceButtonRef.current?.querySelector('[data-part="costume"]') as HTMLElement | null
    const glance = faceButtonRef.current?.querySelector('[data-part="glance"]') as HTMLElement | null
    const cord = rootRef.current?.querySelector('[data-part="costume-cord"]') as HTMLElement | null
    if (costume) {
      costume.style.opacity = '0'
      for (const node of (svg ?? costume).querySelectorAll<HTMLElement>('[data-costume]')) {
        node.style.opacity = '0'
        node.setAttribute('opacity', '0')
      }
    }
    if (glance) {
      glance.style.opacity = '1'
      glance.removeAttribute('transform')
    }
    if (svg) {
      svg.style.overflow = ''
      svg.style.transform = ''
      svg.style.transformOrigin = ''
    }
    if (cord) cord.style.opacity = '0'
    const root = rootRef.current
    if (root) {
      for (const node of root.querySelectorAll<HTMLElement>('[data-country-layer]')) {
        node.style.opacity = '0'
        node.setAttribute('opacity', '0')
      }
      root.querySelector('[data-part="portal-bolt"]')?.setAttribute('data-on', '0')
      root.dataset.scene = ''
      root.dataset.sceneMs = '0'
      root.dataset.sceneHold = '0'
      root.dataset.country = ''
      root.dataset.transition = '0'
      root.dataset.portal = 'ready'
    }
  }
  const finishScene = () => {
    sceneRef.current = null
    setSceneGuard(false)
    stopSceneAudio(130)
    clearSceneMotion()
    releasePet()
    setSceneOn(false)
  }
  cancelCountryRef.current = () => {
    if (sceneRef.current?.kind === 'country') finishScene()
  }
  const applyCountry = (pose: CountryPose) => {
    const root = rootRef.current
    const svg = faceButtonRef.current?.querySelector('svg.face') as HTMLElement | null
    if (!root || !svg) return
    const px = (svg.offsetWidth || 1) / 360
    svg.style.overflow = 'visible'
    svg.style.transformOrigin = '50% 52.78%'
    svg.style.transform = `translate(${(pose.tx * px).toFixed(2)}px, ${(pose.ty * px).toFixed(2)}px) scale(${pose.sx.toFixed(4)}, ${pose.sy.toFixed(4)})`
    for (const [name, layer] of Object.entries(pose.layers)) {
      const node = root.querySelector(`[data-country-layer="${name}"]`) as SVGGElement | null
      if (!node) continue
      node.style.opacity = String(layer.opacity)
      node.setAttribute('opacity', String(layer.opacity))
      if (name === 'prop:us_flag') node.setAttribute('transform', `translate(${layer.tx} ${layer.ty}) scale(${layer.sx})`)
      else if (name === 'prop:us_eagle') node.setAttribute('transform', `translate(${180 + layer.tx - 120} ${190 + layer.ty - 70})`)
      else if (name === 'prop:egypt_pyramids') node.setAttribute('transform', `translate(0 330) scale(1 ${layer.scaleY.toFixed(4)}) translate(0 -330)`)
      else if (name.startsWith('overlay:')) node.setAttribute('transform', `translate(0 ${layer.ty.toFixed(2)})`)
      else node.removeAttribute('transform')
    }
    const glance = svg.querySelector('[data-part="glance"]') as SVGGElement | null
    const uk = pose.layers['overlay:uk_guard']
    const france = pose.layers['overlay:france_cafe']
    const egypt = pose.layers['overlay:egypt_pharaoh']
    const eagle = pose.layers['prop:us_eagle']
    if (glance && uk && uk.opacity > 0.01) {
      const placed = /translate\(\s*(-?\d+(?:\.\d+)?)(?:\s+|,)(-?\d+(?:\.\d+)?)/.exec(glance.getAttribute('transform') || '')
      const gx = placed ? Number(placed[1]) : 0
      const gy = placed ? Number(placed[2]) : 0
      // Approved board: translate(90 102) scale(1.8) in 360 space is half size at (25, 28.333) here.
      glance.setAttribute('transform', `translate(${(25 + gx * 0.5).toFixed(3)} ${(28.333 + gy * 0.5).toFixed(3)}) scale(0.5)`)
    } else if (glance && france && france.opacity > 0.2) {
      glance.setAttribute('transform', 'translate(0 0)')
    } else if (glance && egypt && egypt.opacity > 0.2) {
      glance.setAttribute('transform', 'translate(0 6)')
    } else if (glance && eagle && eagle.opacity > 0.2 && pose.sx < 0.9) {
      glance.setAttribute('transform', 'translate(0 0)')
    }
  }
  const beginScene = (key: SceneKey) => {
    if (sceneRef.current || contactStatus().active || waitRelease.current) return false
    sceneRef.current = { kind: 'costume', key, started: performance.now(), banked: 0, paused: false, cueFired: false }
    setSceneGuard(true)
    endContact(100)
    releasePet()
    lastScene.current = key
    calmRef.current = 0
    setSceneOn(true)
    return true
  }
  const beginCountry = (key: CountryKey) => {
    if (sceneRef.current || contactStatus().active || waitRelease.current) return false
    const reduced = engine.snapshot().reduced
    clearSceneMotion()
    sceneRef.current = {
      kind: 'country',
      key,
      started: 0,
      banked: 0,
      paused: false,
      cueFired: false,
      stingFired: false,
      leadUntil: performance.now() + (reduced ? TRANSITION_MS.reduced : TRANSITION_MS.normal),
      reduced,
    }
    setSceneGuard(true)
    endContact(100)
    releasePet()
    calmRef.current = 0
    setSceneOn(true)
    const root = rootRef.current
    if (root) {
      root.dataset.lead = String(reduced ? TRANSITION_MS.reduced : TRANSITION_MS.normal)
      root.dataset.portal = 'locked'
      root.dataset.country = key
      root.dataset.transition = '1'
      root.dataset.transitionReduced = reduced ? '1' : '0'
    }
    return true
  }
  sceneTickRef.current = (dt: number) => {
    const root = rootRef.current
    const current = sceneRef.current
    if (!current) {
      if (!heldRef.current && !openRef.current && !contactStatus().active) {
        calmRef.current += dt
        if (calmRef.current >= SCENE_GAP_MS) beginScene(nextAmbientScene(lastScene.current))
      }
      return
    }
    if (current.kind === 'country') {
      if (!root) return
      const now = performance.now()
      root.dataset.portal = 'locked'
      root.dataset.country = current.key
      const bolt = root.querySelector('[data-part="portal-bolt"]')
      if (now < current.leadUntil) {
        root.dataset.transition = '1'
        root.dataset.transitionReduced = current.reduced ? '1' : '0'
        root.dataset.scene = ''
        root.dataset.sceneMs = '0'
        root.dataset.sceneHold = '0'
        bolt?.setAttribute('data-on', '1')
        bolt?.setAttribute('data-reduced', current.reduced ? '1' : '0')
        return
      }
      if (!current.cueFired) {
        current.cueFired = true
        current.started = now
        current.banked = 0
        const status = soundStatus()
        if (!status.muted && status.unlocked) playCountryMusic(COUNTRY_MUSIC[current.key])
      }
      const elapsedForSting = current.banked + (current.paused ? 0 : now - current.started)
      const stingDue = current.key === 'uk_guard' || (current.key === 'egypt_pharaoh' && elapsedForSting >= EGYPT_WONDER_S * 1000)
      if (!current.stingFired && stingDue && now >= current.leadUntil) {
        current.stingFired = true
        const status = soundStatus()
        if (!status.muted && status.unlocked) {
          playCountrySting(current.key === 'uk_guard' ? 'uk_soft_march_once' : 'egypt_wonder_once')
        }
      }
      bolt?.setAttribute('data-on', '0')
      const elapsed = current.banked + (current.paused ? 0 : now - current.started)
      const countryPose = sampleCountry(current.key, elapsed, current.reduced)
      if (countryPose.done) {
        finishScene()
        if (heldRef.current) waitRelease.current = true
        return
      }
      applyCountry(countryPose)
      root.dataset.transition = '0'
      root.dataset.scene = current.key
      root.dataset.sceneMs = String(Math.round(elapsed))
      root.dataset.sceneHold = countryPose.hold ? '1' : '0'
      return
    }
    const elapsed = current.banked + (current.paused ? 0 : performance.now() - current.started)
    const pose = sampleScene(current.key, elapsed, engine.snapshot().reduced)
    if (pose.done) {
      finishScene()
      if (heldRef.current) waitRelease.current = true
      return
    }
    if (!current.cueFired && elapsed >= SCENE_CUE[current.key].at) {
      current.cueFired = true
      const status = soundStatus()
      if (!status.muted && status.unlocked) playSceneCue(SCENE_CUE[current.key].key)
    }
    const svg = faceButtonRef.current?.querySelector('svg.face') as HTMLElement | null
    const costume = svg?.querySelector('[data-part="costume"]') as HTMLElement | null
    const glance = svg?.querySelector('[data-part="glance"]') as HTMLElement | null
    if (svg && costume) {
      costume.style.opacity = '1'
      for (const node of svg.querySelectorAll<HTMLElement>('[data-costume]')) {
        const shown = node.dataset.costume === current.key ? String(pose.opacity) : '0'
        node.style.opacity = shown
        node.setAttribute('opacity', shown)
      }
      const wind = costume.querySelector('[data-part="costume-wind"]') as HTMLElement | null
      if (wind) wind.style.opacity = String(pose.wind)
      const cape = costume.querySelector('[data-part="hero-cape"]')
      if (cape && current.key === 'cord_hero') cape.setAttribute('d', heroCapePath(elapsed, engine.snapshot().reduced))
    }
    if (glance) {
      glance.style.opacity = String(pose.face)
      glance.setAttribute('transform', 'translate(0 0)')
    }
    if (svg) {
      svg.style.overflow = current.key === 'cord_hero' ? 'visible' : ''
      svg.style.transform = `translate(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px) rotate(${pose.rotate.toFixed(1)}deg) scale(${pose.sx.toFixed(3)}, ${pose.sy.toFixed(3)})`
      svg.style.transformOrigin = '50% 46%'
    }
    const cord = root?.querySelector('[data-part="costume-cord"]') as SVGLineElement | null
    if (cord) {
      cord.style.opacity = String(pose.cord)
      const mask = svg?.querySelector('[data-costume="cord_hero"]')?.getBoundingClientRect()
      if (mask) {
        const host = faceButtonRef.current?.getBoundingClientRect()
        cord.setAttribute('x1', String((mask.left + mask.right) / 2 - (host?.left ?? 0)))
        cord.setAttribute('y1', '0')
        cord.setAttribute('x2', String((mask.left + mask.right) / 2 - (host?.left ?? 0)))
        cord.setAttribute('y2', String(mask.top - (host?.top ?? 0)))
      }
    }
    if (root) {
      root.dataset.scene = current.key
      root.dataset.sceneMs = String(Math.round(elapsed))
      root.dataset.sceneHold = pose.hold ? '1' : '0'
      root.dataset.portal = 'locked'
      root.dataset.sceneX = pose.x.toFixed(1)
      root.dataset.sceneY = pose.y.toFixed(1)
      root.dataset.pet = '0.0,0.0,1.00,1.00'
      root.dataset.petMode = 'rest'
    }
  }
  const [muteLit, setMuteLit] = useState(false)
  const [soundAvailable, setSoundAvailable] = useState(true)
  const [seenControls, setSeenControls] = useState(false)
  const accentRef = useRef(accent)
  const blendRef = useRef(new FaceBlend())
  const [promptDone, setPromptDone] = useState(false)
  const [raceOn, setRaceOn] = useState(false)
  const [raceMarks, setRaceMarks] = useState(false)

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
    const carVisual = state.profile === 'car' && !state.reduced && !sceneRef.current && tiltStatusRef.current === 'active'
    if (!carVisual) carTarget.current = { throttle: 0, bank: 0 }
    carShown.current = smoothCarTilt(carShown.current, carTarget.current, dt)
    const look = carFace(carShown.current).state
    if (carVisual) {
      const step = driveCueOnEntry(driveLook.current, look, performance.now(), driveClock.current)
      driveClock.current = step.clock
      driveLook.current = look
      if (step.key) playDriveCue(step.key)
    } else if (driveLook.current !== 'neutral') {
      driveLook.current = 'neutral'
      driveClock.current = { ...driveClock.current, neutralSince: performance.now() }
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
      if (state.profile === 'car' && !sceneRef.current) {
        handlesRef.current.speed.setAttribute('opacity', carFace(carShown.current).speed.toFixed(2))
      }
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
    sceneTickRef.current(dt)
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
    (sample: { x: number; y: number; level: number; tiltX: number; tiltY: number }) => {
      if (sceneRef.current?.kind === 'country' || (sceneRef.current?.kind === 'costume' && sceneRef.current.key === 'racer')) return
      const state = engine.snapshot()
      if (state.profile === 'car') {
        const live = !state.reduced && !sceneRef.current && tiltStatusRef.current === 'active'
        const command = carTiltLive(sample.tiltX, sample.tiltY, live)
        carTarget.current = command
        engine.feedLook(command.bank, 0)
        engine.feedMotion(live ? sample.level : 0)
        return
      }
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
    if (!pet.current.sounded) {
      pet.current.sounded = true
      playPetNote(cueForGesture('tap'))
    }
    pet.current.boopUntil = performance.now() + 420
    publish(engine.snapshot())
  }, [engine, publish, soundOn])
  const onAcceleration = useCallback((magnitude: number, lateral: number) => {
    if (sceneRef.current?.kind === 'country' || (sceneRef.current?.kind === 'costume' && sceneRef.current.key === 'racer')) return
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
  tiltStatusRef.current = tilt.status
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
      if (sceneRef.current?.kind === 'country') {
        cancelCountryRef.current()
      } else if (sceneRef.current) {
        sceneRef.current.started = performance.now()
        sceneRef.current.paused = false
      }
      loop.running = true
      engine.setHidden(false)
      loop.last = performance.now()
      loop.raf = requestAnimationFrame(frame)
    }
    const abandonGesture = () => {
      touch.current = touchCancel(touch.current).clock
      releasePet()
      endContact(130)
      engine.feedLook(0, 0)
    }
    const stop = () => {
      if (sceneRef.current?.kind === 'country') {
        cancelCountryRef.current()
        loop.running = false
        engine.setHidden(true)
        abandonGesture()
        cancelAnimationFrame(loop.raf)
        return
      }
      const current = sceneRef.current
      if (current && !current.paused) {
        current.banked += performance.now() - current.started
        current.paused = true
        current.cueFired = true
      }
      stopSceneAudio(130)
      loop.running = false
      engine.setHidden(true)
      abandonGesture()
      cancelAnimationFrame(loop.raf)
    }
    const onBlur = () => {
      if (sceneRef.current?.kind === 'country') {
        cancelCountryRef.current()
        abandonGesture()
        return
      }
      if (sceneRef.current) sceneRef.current.cueFired = true
      stopSceneAudio(130)
      abandonGesture()
    }
    const onLeave = () => {
      if (sceneRef.current?.kind === 'country') cancelCountryRef.current()
      abandonGesture()
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('pagehide', onLeave)
    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pagehide', onLeave)
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
      contact: () => contactStatus(),
      tryCue: (kind) => playCue(kind),
      playScene: (key: SceneKey) => beginScene(key),
      playCountry: (key: CountryKey) => beginCountry(key),
      nudgeCountry: () => {
        const current = sceneRef.current
        if (current?.kind !== 'country') return false
        current.paused = false
        current.started = performance.now()
        current.leadUntil = 0
        return true
      },
      showCountry: (key: CountryKey, ms: number) => {
        const reduced = engine.snapshot().reduced
        sceneRef.current = {
          kind: 'country',
          key,
          started: performance.now(),
          banked: ms,
          paused: true,
          cueFired: true,
          stingFired: true,
          leadUntil: 0,
          reduced,
        }
        setSceneGuard(true)
        setSceneOn(true)
        sceneTickRef.current(0)
        return true
      },
      sceneAudio: () => sceneAudioStatus(),
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

  openRef.current = open
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
          endContact(130)
          releasePet()
          setSeenControls(true)
          setHintOn(false)
          setOpen(true)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          heldRef.current = true
          if (sceneRef.current || waitRelease.current) return
          unlockQuiet()
          setMuteLit(true)
          pet.current.downAt = performance.now()
          pet.current.sounded = false
          pet.current.tucked = false
          const step = touchDown(touch.current, event.clientX, event.clientY, performance.now())
          touch.current = step.clock
          window.clearTimeout(tapTimer.current)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (sceneRef.current || waitRelease.current) return
          const step = touchMove(touch.current, event.clientX, event.clientY, performance.now())
          touch.current = step.clock
          if (!step.dragging) return
          const rect = event.currentTarget.getBoundingClientRect()
          const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
          const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
          pet.current.px = event.clientX
          pet.current.py = event.clientY
          const moved = Math.hypot(event.movementX, event.movementY)
          const fast = moved > 18
          if (step.chirp && !pet.current.sounded) {
            const onFace = drawnHit(event.clientX, event.clientY, false)
            const gesture = classifyStroke(onFace, fast)
            pet.current.mode = gesture === 'dodge' ? 'dodge' : 'chase'
            pet.current.sounded = true
            playPetNote(cueForGesture(gesture))
          }
          const dir = pet.current.mode === 'dodge' ? -1 : 1
          engine.feedLook(Math.max(-1, Math.min(1, nx * dir)), Math.max(-1, Math.min(1, ny * dir * 0.6)))
          aimPet(nx, ny, true)
        }}
        onPointerUp={() => {
          heldRef.current = false
          if (sceneRef.current || waitRelease.current) {
            waitRelease.current = false
            touch.current = touchCancel(touch.current).clock
            return
          }
          const step = touchUp(touch.current, performance.now())
          touch.current = step.clock
          if (pet.current.onFace) pet.current.boopUntil = performance.now() + 480
          pet.current.tucked = false
          releasePet()
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
          heldRef.current = false
          waitRelease.current = false
          if (sceneRef.current) {
            touch.current = touchCancel(touch.current).clock
            return
          }
          touch.current = touchCancel(touch.current).clock
          releasePet()
          endContact(130)
          engine.feedLook(0, 0)
        }}
      >
        <svg className="scene-cord" data-part="costume-cord" aria-hidden="true">
        <line x1="0" y1="0" x2="0" y2="0" stroke="#9b78c5" strokeWidth="3" />
      </svg>
        <div className="face-stack">
          <CountryBackdrop />
          {raceMarks ? (
            <svg className={view.reduced ? 'race-world race-world-still' : 'race-world'} viewBox="0 0 100 100" aria-hidden="true">
              <g dangerouslySetInnerHTML={{ __html: flagsRaw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') }} />
              <g className="race-confetti" dangerouslySetInnerHTML={{ __html: confettiRaw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') }} />
            </svg>
          ) : null}
          <Face onReady={onReady} />
          <CountryEagle />
        </div>
        {showHint ? (
          <span className={askForMotion ? 'hint hint-raised' : 'hint'} data-testid="hint">
            {coarse ? 'Double-tap for controls' : 'Double-tap or press Enter for controls'}
          </span>
        ) : null}
      </button>
      {!open ? (
        <button
          type="button"
          className="portal-chip"
          aria-label="Teleport"
          aria-disabled={sceneOn}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (sceneOn || sceneRef.current || waitRelease.current || contactStatus().active || askForMotion) return
            unlockQuiet()
            const turn = takeCountryTurn(countryCursor.current, true)
            if (!turn.key || !beginCountry(turn.key)) return
            countryCursor.current = turn.cursor
          }}
        >
          <span>Teleport</span>
        </button>
      ) : null}
      {!open ? (
        <div className="portal-bolt" data-part="portal-bolt" data-on="0" data-reduced="0" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <path d="M58 8 L42 46 H54 L40 92 L70 42 H56 Z" fill="#7eb6ff" />
            <path d="M24 30 L16 50 H22 L14 72 L36 46 H28 Z" fill="#9cc7ff" opacity="0.75" />
          </svg>
        </div>
      ) : null}
      {(muteLit || !soundOn || sceneOn) && !open ? (
        <button
          type="button"
          className="mute-chip"
          aria-pressed={!soundOn}
          aria-label={soundOn ? 'Mute' : 'Unmute'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            unlockQuiet()
            const enable = !soundOn
            if (!enable && sceneRef.current) sceneRef.current.cueFired = true
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
          onPlayScene={(key) => {
            beginScene(key)
          }}
          onPresence={(presence) => {
            engine.setPresence(presence)
            publish(engine.snapshot())
          }}
          onProfile={(profile) => {
            if (profile !== 'car') {
              carTarget.current = { throttle: 0, bank: 0 }
              carShown.current = { throttle: 0, bank: 0 }
              setRaceOn(false)
              setRaceMarks(false)
              window.clearTimeout(raceTimer.current)
              stopDriveCue(80)
            }
            engine.setProfile(profile)
            publish(engine.snapshot())
          }}
          raceOn={raceOn}
          onToggleRace={() => {
            if (sceneRef.current) return
            if (raceOn) {
              setRaceOn(false)
              setRaceMarks(false)
              window.clearTimeout(raceTimer.current)
              stopDriveCue(80)
              engine.setProfile(raceWas.current)
              publish(engine.snapshot())
              return
            }
            raceWas.current = engine.snapshot().profile
            engine.setProfile('car')
            setRaceOn(true)
            unlockQuiet()
            setPromptDone(true)
            if (tilt.status !== 'active') void tilt.enable()
            driveClock.current = { ...driveClock.current, lastAny: performance.now() }
            playDriveCue('race_activate_rev')
            setRaceMarks(true)
            raceTimer.current = window.setTimeout(() => setRaceMarks(false), 1_250)
            publish(engine.snapshot())
          }}
          onCarNeutral={() => {
            tilt.recenter()
            carTarget.current = { throttle: 0, bank: 0 }
            carShown.current = { throttle: 0, bank: 0 }
            engine.feedLook(0, 0)
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
            if (!enable && sceneRef.current) sceneRef.current.cueFired = true
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
