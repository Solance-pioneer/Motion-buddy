import { useCallback, useEffect, useRef, useState } from 'react'
import type { CompanionEngine } from '../logic/engine.ts'
import { mapTilt, MOTION_EVENT_TIMEOUT_MS, resolveMotionPermission } from '../logic/motion.ts'

export type MotionUiStatus = 'idle' | 'waiting' | 'active' | 'denied' | 'unavailable' | 'no-events'

/**
 * Orientation only. Device acceleration is intentionally unused so braking
 * and bumps do not yank the companion. "Active" is set only after a real
 * orientation event arrives with numeric angles.
 */
export function useTilt(engine: CompanionEngine, onPose: () => void) {
  const [status, setStatus] = useState<MotionUiStatus>('idle')
  const statusRef = useRef<MotionUiStatus>('idle')
  const listenerRef = useRef<((event: Event) => void) | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const originRef = useRef<{ gamma: number; beta: number } | null>(null)
  const lastRef = useRef<{ gamma: number; beta: number } | null>(null)

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

  useEffect(() => {
    return () => detach()
  }, [detach])

  const enable = useCallback(async () => {
    const decision = await resolveMotionPermission({
      secure: window.isSecureContext,
      hasOrientationEvent: 'DeviceOrientationEvent' in window,
      requestPermission: readPermissionRequest(),
    })
    if (decision !== 'listen') {
      detach()
      engine.setSensorActive(false)
      setMotionStatus(decision)
      onPose()
      return
    }

    detach()
    originRef.current = null
    lastRef.current = null
    setMotionStatus('waiting')

    const handler = (event: Event) => {
      const reading = readOrientation(event)
      if (!reading) return
      if (!originRef.current) originRef.current = reading
      lastRef.current = reading
      engine.setSensorActive(true)
      engine.setLeanTarget(
        mapTilt(reading.gamma - originRef.current.gamma),
        mapTilt(reading.beta - originRef.current.beta),
      )
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (statusRef.current !== 'active') setMotionStatus('active')
      onPose()
    }

    listenerRef.current = handler
    window.addEventListener('deviceorientation', handler)
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      if (statusRef.current === 'waiting') setMotionStatus('no-events')
    }, readTimeout())
  }, [detach, engine, onPose, setMotionStatus])

  const setLevel = useCallback(() => {
    if (lastRef.current) originRef.current = { ...lastRef.current }
    engine.setLeanTarget(0, 0)
    onPose()
  }, [engine, onPose])

  return { status, enable, setLevel }
}

function readPermissionRequest(): (() => Promise<string>) | undefined {
  const orientation = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  const motion = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  const requestOrientation = orientation.requestPermission
  if (typeof requestOrientation === 'function') {
    return () => requestOrientation.call(DeviceOrientationEvent)
  }
  const requestMotion = motion.requestPermission
  if (typeof requestMotion === 'function') {
    return () => requestMotion.call(DeviceMotionEvent)
  }
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
