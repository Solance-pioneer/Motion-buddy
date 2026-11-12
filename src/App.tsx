import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BuddyEngine, type BuddyState, type Presence, type Selection } from './logic/engine.ts'
import type { PoseId, Profile } from './logic/library.ts'
import { applyPose, type FaceHandles, type FaceStyle } from './view/applyPose.ts'
import { FaceBlend, oohFeatures } from './view/features.ts'
import { glanceOffset } from './view/glance.ts'
import { accentById, type AccentId } from './view/accents.ts'
import { Controls } from './view/Controls.tsx'
import { AdminMenu } from './view/AdminMenu.tsx'
import { Face } from './view/Face.tsx'
import { CountryBackdrop, CountryEagle } from './view/country-art.tsx'
import flagsRaw from './assets/drive-audio-v1/svg/race_flags.svg?raw'
import confettiRaw from './assets/drive-audio-v1/svg/race_confetti.svg?raw'
import { useScreenWakeLock } from './view/useWakeLock.ts'
import { motionNeedsGesture, useTilt, type MotionUiStatus } from './view/useTilt.ts'
import type { ReactionKind, Sensitivity } from './logic/reactions.ts'
import { sampleCandidate } from './logic/catalog.ts'
import { stepOriginalCue, type CueArm } from './logic/originals.ts'
import { advanceSound, beginContact, claimChirp, contactStatus, endContact, initialMoveClock, initialSoundMemory, initialTapClock, loadSoundPrefs, noteFaceTap, noteMovement, playBleep, playCountryMusic, playCountrySting, playCue, playDriveCue, playPetNote, playRaceActivate, playSceneCue, raceActivateMs, sceneAudioStatus, setSceneGuard, setSoundMuted, soundStatus, stopDriveCue, stopRaceActivate, stopSceneAudio, unlockSound, type MoveClock, type SoundMemory, type TapClock } from './logic/sfx.ts'
import { carFace, carTiltLive, driveCueOnEntry, initialDriveSoundClock, smoothCarTilt, type CarLook, type CarTilt, type DriveSoundClock } from './logic/car-tilt.ts'
import { choosePetNote, nextCodedIdle, noteOohRun, OOH_FACE_MS, oohIdleDue } from './logic/ooh.ts'
import { classifyStroke } from './logic/pet-play.ts'
import { heroCapePath, menuCostumeAction, nextAmbientScene, sampleScene, SCENE_CUE, type SceneKey } from './logic/scenes.ts'
import { COUNTRY_MUSIC, EGYPT_WONDER_S, sampleCountry, takeCountryTurn, TRANSITION_MS, type CountryKey, type CountryPose } from './logic/countries.ts'
import { beginSceneClip, endSceneClip, initialClipClock, type SceneClip } from './logic/scene-clip.ts'
import { readAdminEnabled, readBeatFeel, readGenre, readHeadbang, readIdleGapSeconds, readIdlePrefs, readMorningDay, readSpeechEnabled, readTheme, readWeatherMoods, writeAdminEnabled, writeBeatFeel, writeGenre, writeHeadbang, writeIdleGapSeconds, writeIdlePrefs, writeMorningDay, writeSpeechEnabled, writeTheme, writeWeatherMoods } from './logic/clip-memory.ts'
import { bassEnergy, initialBeatClock, stepBeat, type BeatFeel } from './logic/beat.ts'
import { genreById, headbangTilt, highBandEnergy, initialGenreHitClock, isHighNote, planGenreHit, shownGenre, spectralCentroid, type GenreId, type HeadbangSpeed } from './logic/genres.ts'
import { playGenreSting } from './logic/genre-sound.ts'
import { openBeatMic } from './logic/mic-beat.ts'
import { activeTheme, themeOpen, type ThemeId } from './logic/themes.ts'
import { allIdleOn, enabledClipIds, enabledCodedIds, enabledIdleIds, idleChoices, toggleIdlePref } from './logic/idle-prefs.ts'
import { adminFromSearch } from './logic/admin-flag.ts'
import { initialSpeechClock, offerSpeech, SPEECH_VISIBLE_MS, type SpeechKind } from './logic/speech.ts'
import {
  activeWeather,
  carClipFor,
  advanceIdleWait,
  chooseIdleAction,
  chooseScheduledClip,
  clampIdleGapSeconds,
  classifyCarMotion,
  clipById,
  CLIP_ROWS,
  costumeClipId,
  driveWasReal,
  idleGapMs,
  jamDue,
  localYmd,
  nextRaceFilm,
  noteInteraction,
  portalPlan,
  previewDate,
  tunnelRoll,
  type ClipGuard,
  type DateMode,
} from './logic/clip-table.ts'
import { isUnlocked } from './logic/entitlements.ts'
import { chooseSynthCue, initialSynthClock } from './logic/synth-cues.ts'
import { CALIBRATE_NOTE, CALIBRATE_NOTE_MS } from './logic/calibrate.ts'
import { initialBatteryClock, stepBattery, takeLowBatteryClip, watchBattery, webBatteryProvider, type BatteryClock } from './logic/battery.ts'
import { loadConditions } from './logic/weather/cache.ts'
import type { WeatherOverride } from './logic/weather/conditions.ts'
import { requestRoundedFix } from './logic/weather/locate.ts'
import type { WeatherConditions } from './logic/weather/types.ts'
import { loadClipUrl } from './view/clip-urls.ts'
import { CLIP_WIDTHS } from 'virtual:clip-widths'
import { clipDefinition } from './logic/clip-definition.ts'
import { CLIP_PLAY_TIMEOUT_MS, activationFilmMuted, afterPlayRejection, clipFadeMs, clipMayUnmute, clipOverlayRevealed, clipShouldStartMuted } from './logic/clip-playback.ts'
import raceRushUrl from './assets/scene-clips-v1/buddy-anime-speed-rush-v2.mp4'
import brakeSurpriseUrl from './assets/scene-clips-v1/buddy-brake-surprised-v1.mp4'
import { clearControl, desiredTravel, placeFace, roomForFeatures, type FacePlace, type PetMode } from './logic/face-room.ts'
import { initialTouch, touchCancel, touchDown, touchMove, touchUp, type TouchClock } from './logic/touch.ts'
import { CONTROLS_IDLE_MS } from './logic/controls-chrome.ts'

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
  const [adminOn] = useState(() => {
    const stored = readAdminEnabled()
    const decided = adminFromSearch(window.location.search, stored)
    if (decided.persist) writeAdminEnabled(decided.on)
    return decided.on
  })
  const [adminOpen, setAdminOpen] = useState(false)
  const [idlePrefs, setIdlePrefs] = useState(() => readIdlePrefs())
  const idlePrefsRef = useRef(idlePrefs)
  idlePrefsRef.current = idlePrefs
  const [chromeOn, setChromeOn] = useState(true)
  const [chromePulse, setChromePulse] = useState(0)
  const wakeChrome = () => setChromePulse((n) => n + 1)
  const [soundOn, setSoundOn] = useState(true)
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn
  const [idleGapSeconds, setIdleGapSeconds] = useState(() => readIdleGapSeconds())
  const idleGapRef = useRef(idleGapSeconds)
  idleGapRef.current = idleGapSeconds
  const [speechOn, setSpeechOn] = useState(() => readSpeechEnabled())
  const speechOnRef = useRef(speechOn)
  speechOnRef.current = speechOn
  const speechClock = useRef(initialSpeechClock())
  const speechTimer = useRef(0)
  const [speechLine, setSpeechLine] = useState<string | null>(null)
  const [soundReady, setSoundReady] = useState(false)
  const heard = useRef<SoundMemory>(initialSoundMemory())
  const synthClock = useRef(initialSynthClock())
  const synthFace = useRef('')
  const moves = useRef<MoveClock>(initialMoveClock())
  const faceTaps = useRef<TapClock>(initialTapClock())
  const touch = useRef<TouchClock>(initialTouch())
  const originalArm = useRef<CueArm | null>(null)
  const pet = useRef({ x: 0, y: 0, sx: 1, sy: 1, ox: 0.5, oy: 0.5, tx: 0, ty: 0, tsx: 1, tsy: 1, tox: 0.5, toy: 0.5, nx: 0, ny: 0, px: 0, py: 0, squeeze: 1, wide: 1, onFace: false, mode: 'chase' as PetMode, dragging: false, downAt: 0, sounded: false, tucked: false, boopUntil: 0 })
  const oohRun = useRef(0)
  const sceneTickRef = useRef<(dt: number) => void>(() => {})
  const batchHold = useRef({
    guard: null as ClipGuard,
    suppressUntil: 0,
    playedSeason: [] as string[],
    goodnight: false,
    readyAt: {} as Record<string, number>,
    lastIdle: null as string | null,
    lastCoded: null as string | null,
    lastOohAt: -100_000,
    oohUntil: 0,
    lastCarAt: -100_000,
    carOnAt: 0,
    carSawMotion: false,
    carStillSince: 0,
    lastSchedule: 0,
    token: 0,
    idleFirst: true,
    raceTurn: 0,
    startMuted: true,
    raceRevUntil: 0,
    raceFilmSilent: false,
    follow: null as null | { onEnd?: () => void; onFail?: () => void },
  })
  const startBatchRef = useRef<(id: string, gallery?: boolean, follow?: { onEnd?: () => void; onFail?: () => void }) => boolean>(() => false)
  const dateModeRef = useRef<DateMode>('normal')
  const weatherModeRef = useRef<WeatherOverride>('none')
  const weatherRef = useRef<WeatherConditions | null>(null)
  const weatherOnRef = useRef(false)
  const batteryRef = useRef<BatteryClock>(initialBatteryClock())
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
  const blinkEdge = useRef(0)
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
  const playChosenPet = () => {
    const choice = choosePetNote(Math.random(), oohRun.current)
    oohRun.current = noteOohRun(oohRun.current, choice)
    if (choice === 'ooh') {
      beginContact()
      return
    }
    playPetNote(choice)
  }
  const say = (kind: SpeechKind) => {
    const step = offerSpeech(speechClock.current, kind, performance.now(), speechOnRef.current, Math.random())
    speechClock.current = step.clock
    if (!step.line) return
    setSpeechLine(step.line)
    window.clearTimeout(speechTimer.current)
    speechTimer.current = window.setTimeout(() => setSpeechLine(null), SPEECH_VISIBLE_MS)
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
      playChosenPet()
      say('pet')
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
    const nod = !reduced && engine.snapshot().profile !== 'car' && performance.now() < bopUntil.current ? bopSize.current : 0
    const svg = faceButtonRef.current?.querySelector('svg.face') as HTMLElement | null
    if (svg) {
      svg.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y + nod).toFixed(1)}px) scale(${showSx.toFixed(3)}, ${showSy.toFixed(3)})`
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
    svg.style.transformOrigin = pose.origin === '46' ? '50% 46%' : '50% 52.78%'
    svg.style.transform = `translate(${(pose.tx * px).toFixed(2)}px, ${(pose.ty * px).toFixed(2)}px) scale(${pose.sx.toFixed(4)}, ${pose.sy.toFixed(4)})`
    for (const [name, layer] of Object.entries(pose.layers)) {
      const node = root.querySelector(`[data-country-layer="${name}"]`) as SVGGElement | null
      if (!node) continue
      node.style.opacity = String(layer.opacity)
      node.setAttribute('opacity', String(layer.opacity))
      if (name === 'prop:us_flag') node.setAttribute('transform', `translate(${layer.tx} ${layer.ty}) scale(${layer.sx})`)
      else if (name === 'prop:us_eagle') node.setAttribute('transform', `translate(${180 + layer.tx - 120} ${190 + layer.ty - 70})`)
      else if (name === 'prop:egypt_pyramids') node.setAttribute('transform', `translate(0 330) scale(1 ${layer.scaleY.toFixed(4)}) translate(0 -330)`)
      else if (name === 'prop:australia_kangaroo') node.setAttribute('transform', `translate(0 ${layer.ty.toFixed(2)})`)
      else if (name === 'overlay:australia_cork_hat') node.setAttribute('transform', `translate(0 ${layer.ty.toFixed(2)}) scale(3.6)`)
      else if (name.startsWith('overlay:')) node.setAttribute('transform', `translate(0 ${layer.ty.toFixed(2)})`)
      else node.removeAttribute('transform')
    }
    const glance = svg.querySelector('[data-part="glance"]') as SVGGElement | null
    const uk = pose.layers['overlay:uk_guard']
    const france = pose.layers['overlay:france_cafe']
    const egypt = pose.layers['overlay:egypt_pharaoh']
    const japan = pose.layers['overlay:japan_kabuto']
    const australia = pose.layers['overlay:australia_cork_hat']
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
    } else if (glance && ((japan && japan.opacity > 0.2) || (australia && australia.opacity > 0.2))) {
      glance.setAttribute('transform', 'translate(0 0)')
    }
  }
  const beginScene = (key: SceneKey, fromMenu = false) => {
    if (contactStatus().active || waitRelease.current) return false
    if (!fromMenu && sceneRef.current) return false
    if (sceneRef.current) finishScene()
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
      const quiet = !heldRef.current && !openRef.current && !contactStatus().active
      const hold = batchHold.current
      if (quiet && !hold.guard) {
        const now = performance.now()
        if (now - hold.lastSchedule >= 1_000) {
          hold.lastSchedule = now
          const sky = activeWeather(weatherModeRef.current, weatherRef.current, weatherOnRef.current)
          const id = chooseScheduledClip({
            now,
            date: previewDate(new Date(), dateModeRef.current),
            reduced: engine.snapshot().reduced,
            guard: hold.guard,
            suppressUntil: hold.suppressUntil,
            playedSeason: hold.playedSeason,
            goodnightPlayed: hold.goodnight,
            morningStored: readMorningDay(),
            readyAt: hold.readyAt,
            weather: sky.weather,
            weatherEnabled: sky.enabled,
          })
          if (id) startBatchRef.current(id)
          else if (!engine.snapshot().reduced && engine.snapshot().profile === 'car') {
            const still = now - hold.carStillSince
            const jam = jamDue(still) ? carClipFor('jam', hold.readyAt, now, hold.lastCarAt, hold.suppressUntil) : null
            const tunnel = !jam && tunnelRoll(Math.random(), still) ? carClipFor('tunnel', hold.readyAt, now, hold.lastCarAt, hold.suppressUntil) : null
            const carId = jam ?? tunnel
            if (carId) startBatchRef.current(carId)
          }
        }
      }
      if (quiet && !hold.guard) {
        const now = performance.now()
        const stepped = advanceIdleWait(
          { elapsed: calmRef.current, first: hold.idleFirst },
          dt,
          idleGapMs(idleGapRef.current),
          hold.suppressUntil,
          now,
        )
        calmRef.current = stepped.clock.elapsed
        hold.idleFirst = stepped.clock.first
        if (stepped.due) {
          const reduced = engine.snapshot().reduced
          const battery = takeLowBatteryClip(batteryRef.current, {
            reduced,
            guard: hold.guard,
            touching: heldRef.current,
            suppressUntil: hold.suppressUntil,
            now,
            unlocked: isUnlocked('low-battery-recharge'),
          })
          batteryRef.current = battery.clock
          if (battery.id) {
            const started = startBatchRef.current(battery.id)
            if (started) return
            batteryRef.current = { ...battery.clock, pending: true }
          }
          const clipsOn = enabledClipIds(idlePrefsRef.current)
          const codedOn = enabledCodedIds(idlePrefsRef.current)
          const action = chooseIdleAction(Math.random(), reduced, hold.lastIdle, Math.random(), clipsOn)
          if (action.kind === 'clip') {
            const key = nextAmbientScene(lastScene.current, codedOn)
            const ok = startBatchRef.current(action.id, false, { onFail: () => { if (key) beginScene(key) } })
            if (ok) {
              hold.lastIdle = action.id
              return
            }
          }
          if (!hold.guard) {
            const coded = nextCodedIdle(hold.lastCoded, codedOn)
            if (coded) hold.lastCoded = coded
            if (coded === 'ooh') {
              if (!reduced && oohIdleDue(hold.lastOohAt, now)) {
                hold.lastOohAt = now
                hold.oohUntil = now + OOH_FACE_MS
                beginContact()
                return
              }
            }
            const key = coded && coded !== 'ooh' ? coded : nextAmbientScene(lastScene.current, codedOn)
            const film = key && !reduced ? costumeClipId(key) : null
            const clipId = film && clipsOn.has(film) ? film : null
            if (key && clipId) {
              const started = startBatchRef.current(clipId, false, { onFail: () => beginScene(key) })
              if (started) {
                lastScene.current = key
                hold.lastIdle = clipId
              } else beginScene(key)
            } else if (key) beginScene(key)
          }
        }
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
  const [chosenTheme, setChosenTheme] = useState<ThemeId>(() => readTheme())
  const [beatOn, setBeatOn] = useState(() => readBeatFeel().on)
  const [beatFeel, setBeatFeel] = useState<BeatFeel>(() => readBeatFeel().feel)
  const [genre, setGenre] = useState<GenreId>(() => readGenre())
  const [genrePop, setGenrePop] = useState(false)
  const [genreWide, setGenreWide] = useState(false)
  const [genreFlash, setGenreFlash] = useState(false)
  const [headbang, setHeadbang] = useState<HeadbangSpeed>(() => readHeadbang())
  const genreHit = useRef(initialGenreHitClock())
  const genreRef = useRef(genre)
  genreRef.current = genre
  const headbangRef = useRef(headbang)
  headbangRef.current = headbang
  const beatClock = useRef(initialBeatClock())
  const bopUntil = useRef(0)
  const bopSize = useRef(5)
  const [calNote, setCalNote] = useState<string | null>(null)
  const pendingCal = useRef(false)
  const [raceMarks, setRaceMarks] = useState(false)
  const [sceneClip, setSceneClip] = useState<SceneClip | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchUrl, setBatchUrl] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [dateMode, setDateMode] = useState<DateMode>('normal')
  const [weatherMode, setWeatherMode] = useState<WeatherOverride>('none')
  const [weatherOn, setWeatherOn] = useState(() => readWeatherMoods())
  const [weather, setWeather] = useState<WeatherConditions | null>(null)
  const clipClock = useRef(initialClipClock())
  const clipVideo = useRef<HTMLVideoElement | null>(null)
  const clipGen = useRef(0)
  const clipPrimed = useRef(false)
  const clipFadeTimer = useRef(0)
  const [clipShown, setClipShown] = useState(false)
  const clipShownRef = useRef(false)
  const [clipDismiss, setClipDismiss] = useState<'none' | 'cancel'>('none')
  const [clipMuted, setClipMuted] = useState(true)
  clipShownRef.current = clipShown
  const endClipRef = useRef(() => {})
  dateModeRef.current = dateMode
  weatherModeRef.current = weatherMode
  weatherRef.current = weather
  weatherOnRef.current = weatherOn
  const releaseClip = () => {
    clipClock.current = endSceneClip(clipClock.current)
    setSceneClip(null)
    setBatchId(null)
    setBatchUrl(null)
    setClipShown(false)
    setClipDismiss('none')
    setClipMuted(true)
    clipShownRef.current = false
    batchHold.current.raceFilmSilent = false
  }
  const finishClip = (reason: 'end' | 'cancel' | 'error') => {
    window.clearTimeout(clipFadeTimer.current)
    clipGen.current += 1
    const epoch = clipGen.current
    const follow = batchHold.current.follow
    batchHold.current.follow = null
    batchHold.current.token += 1
    batchHold.current.guard = null
    const video = clipVideo.current
    if (video) {
      video.pause()
      video.style.pointerEvents = 'none'
    }
    const reduced = engine.snapshot().reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = clipShownRef.current ? clipFadeMs(reason, reduced) : 0
    if (reason === 'cancel') setClipDismiss('cancel')
    const settle = () => {
      if (clipGen.current !== epoch) return
      releaseClip()
      if (reason === 'end') follow?.onEnd?.()
      if (reason === 'error') follow?.onFail?.()
    }
    if (ms === 0) {
      settle()
      return
    }
    setClipShown(false)
    clipShownRef.current = false
    clipFadeTimer.current = window.setTimeout(settle, ms)
  }
  endClipRef.current = () => finishClip('cancel')
  startBatchRef.current = (id: string, gallery = false, follow) => {
    const row = clipById(id)
    if (!row?.file || !isUnlocked(id)) return false
    if (batchHold.current.guard) return false
    window.clearTimeout(clipFadeTimer.current)
    if (engine.snapshot().reduced && !gallery) return false
    const now = performance.now()
    batchHold.current.guard = 'batch'
    batchHold.current.follow = follow ?? null
    batchHold.current.token += 1
    const token = batchHold.current.token
    if (row.trigger === 'season' && !batchHold.current.playedSeason.includes(id)) {
      batchHold.current.playedSeason = [...batchHold.current.playedSeason, id]
    }
    if (row.trigger === 'goodnight') batchHold.current.goodnight = true
    if (row.trigger === 'morning') writeMorningDay(localYmd(new Date()))
    if (row.cooldownMs > 0) batchHold.current.readyAt[id] = now + row.cooldownMs
    if (row.trigger.startsWith('car-')) batchHold.current.lastCarAt = now
    if (row.trigger === 'idle') batchHold.current.lastIdle = id
    batchHold.current.startMuted = clipShouldStartMuted({
      fromGallery: gallery,
      soundOn: soundOnRef.current,
      gestureUnlocked: soundStatus().unlocked,
    })
    setGalleryOpen(false)
    setBatchId(id)
    setClipShown(false)
    setClipMuted(true)
    void loadClipUrl(row.file).then(
      (url) => {
        if (batchHold.current.token !== token) return
        setClipShown(false)
        setClipMuted(true)
        setBatchUrl(url)
      },
      () => {
        if (batchHold.current.token !== token) return
        console.warn('Motion Buddy clip did not play: the file did not load')
        finishClip('error')
      },
    )
    return true
  }

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
    if (carVisual && performance.now() >= batchHold.current.raceRevUntil) {
      const step = driveCueOnEntry(driveLook.current, look, performance.now(), driveClock.current)
      driveClock.current = step.clock
      driveLook.current = look
      if (step.key) {
        const filmBusy = Boolean(clipClock.current.playing) || batchHold.current.guard != null
        const brake = step.key === 'car_brake_soft_a' || step.key === 'car_brake_soft_b'
        if (brake && !filmBusy) {
          const started = beginSceneClip(clipClock.current, 'brake-surprise', performance.now(), state.reduced)
          clipClock.current = started.clock
          if (started.play) {
            window.clearTimeout(clipFadeTimer.current)
            batchHold.current.guard = 'brake'
            batchHold.current.startMuted = true
            setClipShown(false)
            setClipDismiss('none')
            setClipMuted(true)
            setSceneClip(started.play)
          } else if (!clipClock.current.playing) playDriveCue(step.key)
        } else if (!filmBusy && (step.key === 'car_accel_rev_a' || step.key === 'car_accel_rev_b')) {
          const cue = step.key
          const now = performance.now()
          const accelId = carClipFor('accel', batchHold.current.readyAt, now, batchHold.current.lastCarAt, batchHold.current.suppressUntil)
          const played = accelId ? startBatchRef.current(accelId, false, { onFail: () => playDriveCue(cue) }) : false
          if (!played) playDriveCue(cue)
        } else if (!filmBusy) {
          playDriveCue(step.key)
        }
      }
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
    const oohFace = !state.reduced && !sceneRef.current && performance.now() < batchHold.current.oohUntil
    if (handlesRef.current) {
      applyPose(handlesRef.current, oohFace ? oohFeatures() : features, state.blink, colors.face, state.gazeX, state.gazeY)
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
    const clipBusy = clipClock.current.playing != null
    let faceSound = false
    if (!clipBusy && !sceneRef.current && state.blink >= 0.45 && blinkEdge.current < 0.45) {
      const blink = chooseSynthCue(synthClock.current, {
        cue: 'blink',
        now: performance.now(),
        hasExisting: true,
        reduced: state.reduced,
        muted: soundStatus().muted || !soundOnRef.current,
        unlocked: soundStatus().unlocked,
        blocked: false,
      })
      synthClock.current = blink.clock
      if (blink.choice === 'synth') faceSound = playCue('blink')
      else if (blink.choice === 'existing') faceSound = playBleep('blink')
    }
    blinkEdge.current = state.blink
    if (!faceSound && !clipBusy && !sceneRef.current && !state.hidden && !state.reduced && state.presence === 'awake' && !contactStatus().active) playBleep('idle')
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
    if (claimed.ok) {
      playCue('chirp')
      playBleep('ack')
    }
  }, [soundOn])
  const confirmSingle = useCallback(() => {
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
      say('shake')
      publish(engine.snapshot())
      if (tap.cue && playCue('disapprove')) heard.current = { ...heard.current, voiceUntil: performance.now() + 120 }
      return
    }
    if (!state.reduced) engine.requestGreeting()
    if (!pet.current.sounded) {
      pet.current.sounded = true
      playChosenPet()
      say('pet')
    }
    playBleep('tap')
    pet.current.boopUntil = performance.now() + 420
    publish(engine.snapshot())
  }, [engine, publish, soundOn])
  const onAcceleration = useCallback((magnitude: number, lateral: number) => {
    if (sceneRef.current?.kind === 'country' || (sceneRef.current?.kind === 'costume' && sceneRef.current.key === 'racer')) return
    engine.feedAcceleration(magnitude, lateral)
    if (engine.snapshot().profile === 'car') {
      const now = performance.now()
      if (magnitude > 1.2 || Math.abs(lateral) > 0.25) {
        batchHold.current.carSawMotion = true
        batchHold.current.carStillSince = now
      }
      const kind = classifyCarMotion(magnitude, lateral)
      if (kind && !batchHold.current.guard && !sceneRef.current && !engine.snapshot().reduced) {
        const id = carClipFor(kind, batchHold.current.readyAt, now, batchHold.current.lastCarAt, batchHold.current.suppressUntil)
        if (id) startBatchRef.current(id)
      }
    }
    const status = soundStatus()
    const state = engine.snapshot()
    const now = performance.now()
    const movesBefore = moves.current.moves
    const next = noteMovement(moves.current, {
      now,
      magnitude,
      reduced: state.reduced,
      muted: status.muted || !soundOn,
      unlocked: status.unlocked,
      allowDizzy: state.allowDizzy,
      allowGrumpy: state.autoSet.includes('grumpy'),
      busyUntil: heard.current.voiceUntil,
    })
    const distinct = next.clock.moves > movesBefore
    moves.current = next.clock
    const clipHere = Boolean(batchHold.current.guard) || clipClock.current.playing != null
    if (next.cue === 'grumpy') {
      const scolded = engine.requestScold()
      if (scolded) say('shake')
      if (scolded && playCue('disapprove')) heard.current = { ...heard.current, voiceUntil: now + 120 }
      publish(engine.snapshot())
    } else if (next.cue === 'dizzy') {
      const already = state.reaction === 'dizzy'
      engine.previewReaction('dizzy')
      publish(engine.snapshot())
      const step = chooseSynthCue(synthClock.current, {
        cue: 'movement',
        now,
        hasExisting: true,
        reduced: state.reduced,
        muted: status.muted || !soundOn,
        unlocked: status.unlocked,
        blocked: clipHere,
      })
      synthClock.current = step.clock
      if (step.choice === 'synth') playCue('movement')
      else if (step.choice === 'existing' && already && playCue('dizzy')) heard.current = { ...heard.current, voiceUntil: now + 1_200 }
    } else if (distinct) {
      const step = chooseSynthCue(synthClock.current, {
        cue: 'movement',
        now,
        hasExisting: next.cue === 'chirp',
        reduced: state.reduced,
        muted: status.muted || !soundOn,
        unlocked: status.unlocked,
        blocked: clipHere || now < batchHold.current.suppressUntil,
      })
      synthClock.current = step.clock
      if (step.choice === 'synth') playCue('movement')
      else if (step.choice === 'existing') {
        const claimed = claimChirp(heard.current, now, { unlocked: true, muted: false, explicit: true })
        heard.current = claimed.memory
        if (claimed.ok) playCue('chirp')
      }
    }
  }, [engine, publish, soundOn])

  const tilt = useTilt(onSample, onAcceleration)
  tiltStatusRef.current = tilt.status
  useEffect(() => {
    if (!pendingCal.current || tilt.status !== 'active') return
    pendingCal.current = false
    tilt.recenter()
    carTarget.current = { throttle: 0, bank: 0 }
    carShown.current = { throttle: 0, bank: 0 }
    engine.feedLook(0, 0)
    publish(engine.snapshot())
    setCalNote(CALIBRATE_NOTE)
  }, [engine, publish, tilt])
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
      endClipRef.current()
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
      endClipRef.current()
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
    const video = clipVideo.current
    if ((!sceneClip && !batchUrl) || !video) return
    const generation = clipGen.current
    let stopped = false
    let revealed = false
    let sawStall = false
    let timer = 0
    const alive = () => !stopped && clipGen.current === generation
    const fail = (reason: string) => {
      if (!alive()) return
      console.warn(`Motion Buddy clip did not play: ${reason}`)
      finishClip('error')
    }
    const revealIfReady = (presentedFrame: boolean) => {
      if (!alive() || revealed) return
      if (!clipOverlayRevealed(video.currentTime, presentedFrame)) return
      revealed = true
      window.clearTimeout(timer)
      video.style.pointerEvents = ''
      clipShownRef.current = true
      setClipDismiss('none')
      setClipShown(true)
    }
    const frameVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
      cancelVideoFrameCallback?: (id: number) => void
    }
    let frameId = 0
    const watchFrame = () => {
      if (!alive()) return
      revealIfReady(true)
      if (!revealed && frameVideo.requestVideoFrameCallback) frameId = frameVideo.requestVideoFrameCallback(watchFrame)
    }
    const onTime = () => revealIfReady(false)
    const onStall = () => {
      sawStall = true
    }
    const onMediaError = () => fail('media element error')
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('playing', onTime)
    video.addEventListener('stalled', onStall)
    video.addEventListener('error', onMediaError)
    if (frameVideo.requestVideoFrameCallback) frameId = frameVideo.requestVideoFrameCallback(watchFrame)
    timer = window.setTimeout(() => {
      if (!alive() || revealed) return
      fail(sawStall ? 'stalled before a frame' : 'timed out before a frame')
    }, CLIP_PLAY_TIMEOUT_MS)
    const prepare = (muted: boolean) => {
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', 'true')
      video.defaultMuted = muted
      video.muted = muted
      if (muted) video.setAttribute('muted', '')
      else video.removeAttribute('muted')
      setClipMuted(muted)
    }
    const playWith = async (attempt: 'unmuted' | 'muted') => {
      prepare(attempt === 'muted')
      const pending = video.play()
      if (pending) await pending
    }
    const run = async () => {
      let attempt: 'unmuted' | 'muted' = batchHold.current.startMuted ? 'muted' : 'unmuted'
      try {
        await playWith(attempt)
      } catch (error) {
        if (!alive()) return
        if (afterPlayRejection(attempt) === 'retry-muted') {
          attempt = 'muted'
          try {
            await playWith('muted')
          } catch (retryError) {
            const detail = retryError instanceof Error ? retryError.message : 'play() rejected'
            fail(detail)
            return
          }
        } else {
          const detail = error instanceof Error ? error.message : 'play() rejected'
          fail(detail)
          return
        }
      }
      if (!alive()) return
      const holdFilmMute = activationFilmMuted(batchHold.current.raceFilmSilent)
      if (video.muted && !holdFilmMute && performance.now() >= batchHold.current.raceRevUntil && clipMayUnmute({ soundOn: soundOnRef.current, userMuted: soundStatus().muted, primed: clipPrimed.current })) {
        try {
          prepare(false)
          if (video.paused) await video.play()
        } catch {
          if (!alive()) return
          try {
            await playWith('muted')
          } catch {
            // The muted playback already started.
          }
        }
      }
    }
    void run()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('playing', onTime)
      video.removeEventListener('stalled', onStall)
      video.removeEventListener('error', onMediaError)
      if (frameId && frameVideo.cancelVideoFrameCallback) frameVideo.cancelVideoFrameCallback(frameId)
    }
  }, [sceneClip, batchUrl])

  useEffect(() => watchBattery(webBatteryProvider, (sample) => {
    batteryRef.current = stepBattery(batteryRef.current, sample)
  }), [])

  useEffect(() => {
    if (!weatherOn || !isUnlocked('weather-moods')) return
    let cancel = false
    const run = () => {
      void requestRoundedFix().then((fix) => {
        if (!fix || cancel) return null
        return loadConditions(fix.lat, fix.lon)
      }).then((conditions) => {
        if (!cancel && conditions) setWeather(conditions)
      })
    }
    run()
    const id = window.setInterval(run, 3_600_000)
    return () => {
      cancel = true
      window.clearInterval(id)
    }
  }, [weatherOn])

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
    if (!beatOn) return
    let stop = () => {}
    let closed = false
    bopSize.current = beatFeel === 'party' ? 8 : 5
    void openBeatMic((bins, sampleRate, fftSize) => {
      const normal = new Float32Array(bins.length)
      for (let i = 0; i < bins.length; i += 1) normal[i] = bins[i] / 255
      const now = performance.now()
      const step = stepBeat(beatClock.current, bassEnergy(normal, sampleRate, fftSize), now, beatFeel)
      beatClock.current = step.clock
      const state = engine.snapshot()
      const look = genreById(genreRef.current)
      const gaps = step.clock.gaps
      const meanGap = gaps.length === 0 ? 0 : gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
      const high = isHighNote(spectralCentroid(normal, sampleRate, fftSize), highBandEnergy(normal, sampleRate, fftSize))
      const planned = planGenreHit(genreHit.current, {
        now,
        onset: step.beat,
        meanGap,
        grid: look?.grid ?? 'onset',
        reduced: state.reduced,
        high,
        hearsHigh: look?.reaction === 'shiver',
        strobe: look?.strobe,
      })
      genreHit.current = planned.clock
      const nod = (look ? planned.hit : step.beat) && !state.reduced && state.profile !== 'car'
      if (nod) {
        const metal = look?.reaction === 'headbang' ? headbangTilt(look.beat.tilt, headbangRef.current, beatFeel === 'party') : 0
        const breath = look?.grid === 'breath'
        bopUntil.current = now + (breath ? 700 : look?.reaction === 'headbang' ? (headbangRef.current === 'fast' ? 100 : headbangRef.current === 'slow' ? 220 : 150) : beatFeel === 'party' ? 220 : 160)
        bopSize.current = breath ? 2 : metal > 0 ? metal * 0.5 : beatFeel === 'party' ? 8 : 5
      }
      if (planned.hit) {
        setGenrePop(true)
        setGenreWide(planned.wide)
        setGenreFlash(planned.flash)
        window.setTimeout(() => {
          setGenrePop(false)
          setGenreWide(false)
          setGenreFlash(false)
        }, look?.grid === 'breath' ? 900 : 160)
        if (look && isUnlocked(look.feature)) playGenreSting(look.sound, beatFeel === 'party', { muted: soundStatus().muted || !soundOnRef.current, unlocked: soundStatus().unlocked, reduced: state.reduced })
      }
    }).then((end) => {
      if (closed) end()
      else stop = end
    })
    return () => {
      closed = true
      stop()
    }
  }, [beatOn, beatFeel, engine])

  useEffect(() => {
    if (!calNote) return
    const id = window.setTimeout(() => setCalNote(null), CALIBRATE_NOTE_MS)
    return () => window.clearTimeout(id)
  }, [calNote])

  useEffect(() => {
    if (!muteLit || !soundOn) return
    const id = window.setTimeout(() => setMuteLit(false), 2_800)
    return () => window.clearTimeout(id)
  }, [muteLit, soundOn])

  useEffect(() => {
    if (open) return
    setChromeOn(true)
    const id = window.setTimeout(() => setChromeOn(false), CONTROLS_IDLE_MS)
    return () => window.clearTimeout(id)
  }, [chromePulse, open])

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
    const faceId = view.showcase?.id ?? view.expression
    const entered = faceId !== synthFace.current
    synthFace.current = faceId
    const synthCue = faceId === 'scan' || faceId === 'curious' ? 'curious' : faceId === 'happy' ? 'happy' : null
    if (synthCue && entered) {
      const step = chooseSynthCue(synthClock.current, {
        cue: synthCue,
        now: performance.now(),
        hasExisting: Boolean(next.cue),
        reduced: view.reduced,
        muted: status.muted || !soundOn,
        unlocked: status.unlocked,
        blocked: false,
      })
      synthClock.current = step.clock
      if (step.choice === 'synth') playCue(synthCue)
      else if (step.choice === 'existing' && next.cue) playCue(next.cue)
    } else if (next.cue) playCue(next.cue)
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
    setAdminOpen(false)
    requestAnimationFrame(() => faceButtonRef.current?.focus())
  }, [])

  const menuOpen = open || adminOpen
  const showHint = hintOn && !seenControls && !menuOpen
  const live = view.reaction !== 'none'
    ? `Motion Buddy looks ${view.reaction}.`
    : view.presence === 'rest' && view.wakefulness < 0.5
      ? 'Motion Buddy is resting.'
      : `Motion Buddy looks ${view.expression}.`

  openRef.current = menuOpen
  const shownClipGen = clipGen.current
  const primeClipVideo = () => {
    const video = clipVideo.current
    if (!video || batchHold.current.guard) return
    clipPrimed.current = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', 'true')
    video.defaultMuted = true
    video.muted = true
    video.setAttribute('muted', '')
    const generation = clipGen.current
    const pending = video.play()
    void pending?.then(() => {
      if (clipGen.current !== generation || video.currentSrc) return
      video.pause()
    }).catch(() => {
      // The element stays primed. Idle clips still start muted.
    })
  }
  return (
      <main
        ref={rootRef}
        className="app"
        data-theme={activeTheme({ race: raceOn, chosen: chosenTheme }, isUnlocked)}
        data-controls={menuOpen ? 'open' : 'closed'}
        data-chrome={chromeOn ? 'on' : 'off'}
        data-motion={tilt.status}
        data-tilt={tilt.signals.tilt ? 'live' : 'off'}
        data-movement={tilt.signals.movement ? 'live' : 'off'}
        data-wake-lock={wakeLock.status}
        onPointerDownCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-clip-gallery], [data-menu-panel]')) return
          const step = noteInteraction({ guard: batchHold.current.guard, suppressUntil: batchHold.current.suppressUntil }, performance.now(), false)
          batchHold.current.suppressUntil = step.hold.suppressUntil
          if (step.cancel) endClipRef.current()
          else batchHold.current.guard = step.hold.guard
        }}
        onTouchStartCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-clip-gallery], [data-menu-panel]')) return
          const step = noteInteraction({ guard: batchHold.current.guard, suppressUntil: batchHold.current.suppressUntil }, performance.now(), false)
          batchHold.current.suppressUntil = step.hold.suppressUntil
          if (step.cancel) endClipRef.current()
          else batchHold.current.guard = step.hold.guard
        }}
      >
      <div className="edge-layer" data-theme={activeTheme({ race: raceOn, chosen: chosenTheme }, isUnlocked)} />
      {raceOn && !view.reduced ? (
        <svg className="race-lines" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M8 20 H28 M6 32 H24 M10 78 H30 M70 18 H94 M74 30 H96 M72 80 H92" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ) : null}
      <button
        ref={faceButtonRef}
        type="button"
        className="face-button"
        aria-label={openerName(coarse)}
        aria-expanded={menuOpen}
        aria-controls="buddy-controls"
        aria-haspopup="dialog"
        tabIndex={menuOpen ? -1 : 0}
        inert={menuOpen}
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
          wakeChrome()
          primeClipVideo()
          heldRef.current = true
          if (sceneRef.current || waitRelease.current) return
          unlockQuiet()
          setMuteLit(true)
          pet.current.downAt = performance.now()
          pet.current.sounded = false
          pet.current.tucked = false
          const step = touchDown(touch.current, event.clientX, event.clientY, performance.now())
          touch.current = step.clock
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
            beginContact()
            say('pet')
          }
          const dir = pet.current.mode === 'dodge' ? -1 : 1
          engine.feedLook(Math.max(-1, Math.min(1, nx * dir)), Math.max(-1, Math.min(1, ny * dir * 0.6)))
          aimPet(nx, ny, true)
        }}
        onPointerUp={() => {
          const wasDrag = pet.current.dragging
          heldRef.current = false
          if (wasDrag) endContact(130)
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
          if (step.singleTap) confirmSingle()
          if (step.openMenu) {
            setSeenControls(true)
            setHintOn(false)
            setAdminOpen(false)
            setOpen(true)
          }
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
          <Face onReady={onReady} genre={shownGenre(genre, isUnlocked)} pulse={genrePop} party={beatFeel === 'party'} reduced={view.reduced} wide={genreWide} bang={headbang} flash={genreFlash} />
          <p className="speech-bubble" aria-live="polite" data-on={speechLine ? '1' : '0'} data-reduced={view.reduced ? '1' : '0'}>
            {speechLine}
          </p>
          <CountryEagle />
        </div>
        {showHint ? (
          <span className={askForMotion ? 'hint hint-raised' : 'hint'} data-testid="hint">
            {coarse ? 'Double-tap for controls' : 'Double-tap or press Enter for controls'}
          </span>
        ) : null}
      </button>
      {!menuOpen ? (
        <div className="screen-chips" data-car={view.profile === 'car' ? '1' : '0'}>
        <button
          type="button"
          className="screen-chip portal-chip"
          aria-label="Teleport"
          aria-disabled={sceneOn}
          onPointerDown={(event) => {
            event.stopPropagation()
            wakeChrome()
          }}
          onClick={() => {
            if (sceneOn || sceneRef.current || waitRelease.current || contactStatus().active || askForMotion || batchHold.current.guard) return
            unlockQuiet()
            const turn = takeCountryTurn(countryCursor.current, true)
            if (!turn.key) return
            const key = turn.key
            const plan = portalPlan(key, engine.snapshot().reduced)
            let accepted = false
            const accept = () => {
              if (accepted) return
              accepted = true
              countryCursor.current = turn.cursor
            }
            const playScene = () => {
              if (beginCountry(key)) accept()
            }
            const playAt = (index: number) => {
              if (index >= plan.clips.length) {
                if (plan.sceneAfter) playScene()
                else accept()
                return
              }
              const ok = startBatchRef.current(plan.clips[index], false, {
                onEnd: () => playAt(index + 1),
                onFail: playScene,
              })
              if (ok) accept()
              else playScene()
            }
            playAt(0)
          }}
        >
          <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Teleport</span>
        </button>
        <button
          type="button"
          className="screen-chip mute-chip"
          aria-pressed={!soundOn}
          aria-label={soundOn ? 'Mute' : 'Unmute'}
          onPointerDown={(event) => {
            event.stopPropagation()
            wakeChrome()
          }}
          onClick={() => {
            unlockQuiet()
            const enable = !soundOn
            if (!enable && sceneRef.current) sceneRef.current.cueFired = true
            setSoundMuted(!enable)
            setSoundOn(enable)
            if (enable) playChirp()
          }}
        >
          <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 10h3l4-4v12l-4-4H4z" fill="currentColor" />
            {soundOn ? <path d="M16 9a5 5 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2" /> : <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="2" />}
          </svg>
          <span>{soundOn ? 'Mute' : 'Unmute'}</span>
        </button>
        {view.profile === 'car' ? (
          <button
            type="button"
            className="screen-chip calibrate-chip"
            aria-label="Calibrate"
            onPointerDown={(event) => {
              event.stopPropagation()
              wakeChrome()
            }}
            onClick={() => {
              unlockQuiet()
              if (tilt.status === 'active') {
                pendingCal.current = false
                tilt.recenter()
                carTarget.current = { throttle: 0, bank: 0 }
                carShown.current = { throttle: 0, bank: 0 }
                engine.feedLook(0, 0)
                publish(engine.snapshot())
                setCalNote(CALIBRATE_NOTE)
                return
              }
              pendingCal.current = true
              void tilt.enable()
            }}
          >
            <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>Calibrate</span>
          </button>
        ) : null}
        </div>
      ) : null}
      {calNote ? <p className="cal-note" role="status">{calNote}</p> : null}
      {!menuOpen ? (
        <div className="portal-bolt" data-part="portal-bolt" data-on="0" data-reduced="0" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <path d="M58 8 L42 46 H54 L40 92 L70 42 H56 Z" fill="#7eb6ff" />
            <path d="M24 30 L16 50 H22 L14 72 L36 46 H28 Z" fill="#9cc7ff" opacity="0.75" />
          </svg>
        </div>
      ) : null}
      {askForMotion && !menuOpen ? (
        <div className="launch">
          <button
            type="button"
            className="allow-motion"
onClick={() => {
          unlockQuiet()
          primeClipVideo()
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
          showAdmin={adminOn}
          onOpenAdmin={() => {
            setOpen(false)
            setAdminOpen(true)
          }}
          onPresence={(presence) => {
            engine.setPresence(presence)
            publish(engine.snapshot())
          }}
          onProfile={(profile) => {
            if (profile !== 'car') {
              const now = performance.now()
              const drove = driveWasReal(now - batchHold.current.carOnAt, batchHold.current.carSawMotion)
              carTarget.current = { throttle: 0, bank: 0 }
              carShown.current = { throttle: 0, bank: 0 }
              setRaceOn(false)
              setRaceMarks(false)
              window.clearTimeout(raceTimer.current)
              stopDriveCue(80)
              if (drove && !batchHold.current.guard && !sceneRef.current && !engine.snapshot().reduced) {
                const arrived = carClipFor('arrived', batchHold.current.readyAt, now, batchHold.current.lastCarAt, batchHold.current.suppressUntil)
                if (arrived) startBatchRef.current(arrived)
              }
            } else {
              batchHold.current.carOnAt = performance.now()
              batchHold.current.carSawMotion = false
              batchHold.current.carStillSince = performance.now()
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
              stopRaceActivate(80)
              batchHold.current.raceRevUntil = 0
              batchHold.current.raceFilmSilent = false
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
            const revAt = performance.now()
            if (playRaceActivate()) batchHold.current.raceRevUntil = revAt + raceActivateMs()
            const reducedNow = engine.snapshot().reduced
            const film = nextRaceFilm(batchHold.current.raceTurn)
            batchHold.current.raceTurn += 1
            const playRush = () => {
              const started = beginSceneClip(clipClock.current, 'race-rush', performance.now(), reducedNow)
              clipClock.current = started.clock
              if (started.play && !batchHold.current.guard) {
                window.clearTimeout(clipFadeTimer.current)
                batchHold.current.guard = 'rush'
                batchHold.current.raceFilmSilent = true
                batchHold.current.startMuted = true
                setClipShown(false)
                setClipDismiss('none')
                setClipMuted(true)
                setSceneClip(started.play)
              }
            }
            if (film === 'race-start' && !reducedNow) {
              const row = clipById('race-start')
              const played = row ? startBatchRef.current(row.id, false, { onFail: playRush }) : false
              if (played) batchHold.current.raceFilmSilent = true
              else playRush()
            } else playRush()
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
            setCalNote(CALIBRATE_NOTE)
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
          onEnableMotion={() => {
            setPromptDone(true)
            void tilt.enable()
          }}
          onStopMotion={() => {
            setPromptDone(true)
            tilt.stop()
          }}
          onToggleWakeLock={wakeLock.toggle}
          weatherOn={weatherOn && isUnlocked('weather-moods')}
          onToggleWeather={() => {
            if (!isUnlocked('weather-moods')) return
            const next = !weatherOn
            setWeatherOn(next)
            writeWeatherMoods(next)
            if (!next) setWeather(null)
          }}
          theme={chosenTheme}
          themeOpen={(id) => themeOpen(id, isUnlocked)}
          onTheme={(id) => {
            setChosenTheme(id)
            writeTheme(id)
          }}
          beatOn={beatOn}
          beatFeel={beatFeel}
          onToggleBeat={() => {
            unlockQuiet()
            const next = !beatOn
            setBeatOn(next)
            writeBeatFeel(next, beatFeel)
          }}
          onBeatFeel={(feel) => {
            setBeatFeel(feel)
            writeBeatFeel(beatOn, feel)
          }}
          genre={genre}
          genreOpen={isUnlocked('genre-looks')}
          packOpen={(feature) => isUnlocked(feature)}
          onGenre={(id) => {
            const look = id === 'none' ? undefined : genreById(id)
            if (look && (!isUnlocked('genre-looks') || !isUnlocked(look.feature))) return
            setGenre(id)
            writeGenre(id)
          }}
          headbang={headbang}
          onHeadbang={(speed) => {
            setHeadbang(speed)
            writeHeadbang(speed)
          }}
          idleGapSeconds={idleGapSeconds}
          onIdleGap={(seconds) => {
            const next = clampIdleGapSeconds(seconds)
            setIdleGapSeconds(next)
            idleGapRef.current = next
            writeIdleGapSeconds(next)
          }}
          idleChoices={idleChoices()}
          idleOn={enabledIdleIds(idlePrefs)}
          onToggleIdle={(id, on) => {
            const next = toggleIdlePref(idlePrefs, id, on)
            setIdlePrefs(next)
            writeIdlePrefs(next)
          }}
          onSelectAllIdle={() => {
            const next = allIdleOn()
            setIdlePrefs(next)
            writeIdlePrefs(next)
          }}
          onResetIdle={() => {
            const next = allIdleOn()
            setIdlePrefs(next)
            writeIdlePrefs(next)
          }}
          speechOn={speechOn}
          onToggleSpeech={() => {
            const next = !speechOn
            setSpeechOn(next)
            speechOnRef.current = next
            writeSpeechEnabled(next)
            if (!next) {
              setSpeechLine(null)
              window.clearTimeout(speechTimer.current)
            }
          }}
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
              if (claimed.ok) {
                playCue('chirp')
                playBleep('ack')
              }
            }
          }}
        />
      ) : null}
      {adminOpen ? (
        <AdminMenu
          presence={view.presence}
          allowStartled={view.allowStartled}
          allowDizzy={view.allowDizzy}
          onClose={closeControls}
          onOpenClips={() => {
            setOpen(false)
            setAdminOpen(false)
            setGalleryOpen(true)
          }}
          onPlayScene={(key) => {
            const action = menuCostumeAction(key, { contactActive: contactStatus().active, waitRelease: waitRelease.current })
            if (!action) return
            endClipRef.current()
            setOpen(false)
            setAdminOpen(false)
            beginScene(action.play, true)
          }}
          onPreviewWake={() => {
            engine.previewWake()
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
        />
      ) : null}
      <video
        ref={clipVideo}
        className="scene-clip"
        data-scene-clip={sceneClip ?? batchId ?? ''}
        data-revealed={clipShown ? '1' : '0'}
        data-dismiss={clipDismiss}
        style={{ ['--clip-fade' as string]: `${clipFadeMs(clipDismiss === 'cancel' ? 'cancel' : 'show', view.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches)}ms` }}
        src={sceneClip === 'race-rush' ? raceRushUrl : sceneClip === 'brake-surprise' ? brakeSurpriseUrl : batchUrl ?? undefined}
        playsInline
        muted={clipMuted}
        preload="auto"
        onPointerDown={(event) => {
          if (!clipShown) return
          event.stopPropagation()
          finishClip('cancel')
        }}
        onEnded={() => {
          if (clipGen.current !== shownClipGen) return
          finishClip('end')
        }}
      />
      {isUnlocked('clip-gallery') && galleryOpen ? (
        <div className="clip-gallery" data-clip-gallery>
            <div className="clip-gallery-panel">
              <button type="button" className="close" onClick={() => setGalleryOpen(false)}>Close</button>
              <p>Date</p>
              <div className="choice-row">
                {(['normal', 'festive', 'new-year'] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={dateMode === mode} onClick={() => setDateMode(mode)}>
                    {mode === 'normal' ? 'Normal' : mode === 'festive' ? 'Halloween/Christmas' : 'New Year'}
                  </button>
                ))}
              </div>
              <p>Weather</p>
              <div className="choice-row">
                {(['none', 'rain', 'snow', 'rainbow', 'hot', 'windy'] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={weatherMode === mode} onClick={() => setWeatherMode(mode)}>
                    {mode === 'none' ? 'None' : mode === 'rainbow' ? 'Rainbow' : mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <div className="clip-gallery-list">
                {CLIP_ROWS.map((row) => {
                  const width = row.file ? CLIP_WIDTHS[row.file] : undefined
                  const definition = width ? clipDefinition(width) : null
                  return (
                  <button key={row.id} type="button" disabled={!row.file} onClick={() => {
                    primeClipVideo()
                    startBatchRef.current(row.id, true)
                  }}>
                    {definition ? <span className="clip-badge" data-def={definition}>{definition}</span> : null}
                    {row.number}. {row.label ?? row.id.replaceAll('-', ' ')}{row.file ? '' : ' unavailable'}
                  </button>
                  )
                })}
              </div>
            </div>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </main>
  )
}
