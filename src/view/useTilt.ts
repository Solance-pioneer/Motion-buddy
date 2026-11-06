import { useCallback, useEffect, useRef, useState } from 'react'
import { lookFromDegrees, MOTION_EVENT_TIMEOUT_MS, resolveMotionPermission, wakeLevelFromDegrees } from '../logic/motion.ts'

export type MotionUiStatus = 'idle' | 'waiting' | 'active' | 'denied' | 'unavailable' | 'no-events' | 'paused'

export interface TiltSample {
  x: number
  y: number
  level: number
}

/**
 * Listens for device orientation only after a user action.
 * "Active" means numeric orientation events arrived. Permission alone is not enough.
 * The listener is removed while the page is hidden.
 */
export function useTilt(onSample: (sample: TiltSample) => void) {
  const [status, setStatus] = useState<MotionUiStatus>('idle')
  const statusRef = useRef<MotionUiStatus>('idle')
  const enabledRef = useRef(false)
  const listenerRef = useRef<((event: Event) => void) | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const originRef = useRef<{ gamma: number; beta: number } | null>(null)
  const onSampleRef = useRef(onSample)
  useEffect(() => {
    onSampleRef.current = onSample
  }, [onSample])

  const setMotionStatus = useCallback((next: MotionUiStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const detach = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('deviceorientation', listenerRef.current)
      listenerRef.current = null
    }
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const beginListening = useCallback(() => {
    detach()
    originRef.current = null
    setMotionStatus('waiting')
    const handler = (event: Event) => {
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
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (statusRef.current !== 'active') setMotionStatus('active')
    }
    listenerRef.current = handler
    window.addEventListener('deviceorientation', handler)
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      if (statusRef.current === 'waiting') setMotionStatus('no-events')
    }, readTimeout())
  }, [detach, setMotionStatus])

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

  return { status, enable }
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
