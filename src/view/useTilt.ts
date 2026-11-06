import { useCallback, useEffect, useRef, useState } from 'react'
import { lookFromDegrees, MOTION_EVENT_TIMEOUT_MS, resolveMotionPermission, wakeLevelFromDegrees } from '../logic/motion.ts'

export type MotionUiStatus = 'idle' | 'waiting' | 'active' | 'denied' | 'unavailable' | 'no-events' | 'paused'

export interface TiltSample {
  x: number
  y: number
  level: number
}

export interface SensorSignals {
  tilt: boolean
  movement: boolean
}

/**
 * Listens for device orientation only after a user action.
 * "Active" means numeric orientation events arrived. Permission alone is not enough.
 * The listener is removed while the page is hidden.
 */
export function useTilt(onSample: (sample: TiltSample) => void, onAcceleration: (magnitude: number) => void) {
  const [status, setStatus] = useState<MotionUiStatus>('idle')
  const [signals, setSignals] = useState<SensorSignals>({ tilt: false, movement: false })
  const statusRef = useRef<MotionUiStatus>('idle')
  const enabledRef = useRef(false)
  const orientationRef = useRef<((event: Event) => void) | null>(null)
  const movementRef = useRef<((event: Event) => void) | null>(null)
  const gravityRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const originRef = useRef<{ gamma: number; beta: number } | null>(null)
  const onAccelerationRef = useRef(onAcceleration)
  useEffect(() => {
    onAccelerationRef.current = onAcceleration
  }, [onAcceleration])
  const onSampleRef = useRef(onSample)
  useEffect(() => {
    onSampleRef.current = onSample
  }, [onSample])

  const setMotionStatus = useCallback((next: MotionUiStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const detach = useCallback(() => {
    if (orientationRef.current) {
      window.removeEventListener('deviceorientation', orientationRef.current)
      orientationRef.current = null
    }
    if (movementRef.current) {
      window.removeEventListener('devicemotion', movementRef.current)
      movementRef.current = null
    }
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const noteArrival = useCallback((kind: 'tilt' | 'movement') => {
    setSignals((current) => (current[kind] ? current : { ...current, [kind]: true }))
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (statusRef.current !== 'active') setMotionStatus('active')
  }, [setMotionStatus])

  const beginListening = useCallback(() => {
    detach()
    originRef.current = null
    gravityRef.current = null
    setSignals({ tilt: false, movement: false })
    setMotionStatus('waiting')
    const onOrientation = (event: Event) => {
      const reading = readOrientation(event)
      if (!reading) return
      if (!originRef.current) originRef.current = reading
      const dx = reading.gamma - originRef.current.gamma
      const dy = reading.beta - originRef.current.beta
      onSampleRef.current({
        x: lookFromDegrees(dx),
        y: lookFromDegrees(dy),
        level: wakeLevelFromDegrees(dx, dy),
      })
      noteArrival('tilt')
    }
    const onMovement = (event: Event) => {
      const magnitude = readMovement(event, gravityRef)
      if (magnitude == null) return
      onAccelerationRef.current(magnitude)
      noteArrival('movement')
    }
    orientationRef.current = onOrientation
    movementRef.current = onMovement
    window.addEventListener('deviceorientation', onOrientation)
    window.addEventListener('devicemotion', onMovement)
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      if (statusRef.current === 'waiting') setMotionStatus('no-events')
    }, readTimeout())
  }, [detach, noteArrival, setMotionStatus])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        detach()
        if (enabledRef.current && statusRef.current !== 'idle' && statusRef.current !== 'denied' && statusRef.current !== 'unavailable') {
          setMotionStatus('paused')
        }
        return
      }
      if (enabledRef.current && statusRef.current === 'paused') beginListening()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      detach()
    }
  }, [beginListening, detach, setMotionStatus])

  const enable = useCallback(async () => {
    const decision = await resolveMotionPermission({
      secure: window.isSecureContext,
      hasOrientationEvent: 'DeviceOrientationEvent' in window,
      requestPermission: readPermissionRequest(),
    })
    if (decision !== 'listen') {
      enabledRef.current = false
      detach()
      setMotionStatus(decision)
      return
    }
    enabledRef.current = true
    beginListening()
  }, [beginListening, detach, setMotionStatus])

  return { status, signals, enable }
}

function readMovement(
  event: Event,
  gravityRef: { current: { x: number; y: number; z: number } | null },
): number | null {
  const motion = event as {
    acceleration?: { x?: number | null; y?: number | null; z?: number | null } | null
    accelerationIncludingGravity?: { x?: number | null; y?: number | null; z?: number | null } | null
  }
  const user = axis(motion.acceleration)
  if (user) return Math.hypot(user.x, user.y, user.z)
  const gravity = axis(motion.accelerationIncludingGravity)
  if (!gravity) return null
  const previous = gravityRef.current
  gravityRef.current = gravity
  if (!previous) return null
  return Math.hypot(gravity.x - previous.x, gravity.y - previous.y, gravity.z - previous.z)
}

function axis(value: { x?: number | null; y?: number | null; z?: number | null } | null | undefined) {
  if (!value) return null
  if (typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.z !== 'number') return null
  if (Number.isNaN(value.x) || Number.isNaN(value.y) || Number.isNaN(value.z)) return null
  return { x: value.x, y: value.y, z: value.z }
}

function readPermissionRequest(): (() => Promise<string>) | undefined {
  const orientation = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
  const motion = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
  const requestOrientation = orientation.requestPermission
  if (typeof requestOrientation === 'function') return () => requestOrientation.call(DeviceOrientationEvent)
  const requestMotion = motion.requestPermission
  if (typeof requestMotion === 'function') return () => requestMotion.call(DeviceMotionEvent)
  return undefined
}

function readOrientation(event: Event): { gamma: number; beta: number } | null {
  const reading = event as { gamma?: unknown; beta?: unknown }
  if (typeof reading.gamma !== 'number' || typeof reading.beta !== 'number') return null
  if (Number.isNaN(reading.gamma) || Number.isNaN(reading.beta)) return null
  return { gamma: reading.gamma, beta: reading.beta }
}

function readTimeout(): number {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('e2e')) return MOTION_EVENT_TIMEOUT_MS
  const value = Number(params.get('motionTimeout'))
  if (!Number.isFinite(value) || value <= 0) return MOTION_EVENT_TIMEOUT_MS
  return value
}
