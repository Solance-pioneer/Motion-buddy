import { useCallback, useEffect, useRef, useState } from 'react'
import { wakeLockSupported } from '../logic/motion.ts'

export type WakeLockUi = 'unsupported' | 'off' | 'granted' | 'denied'

/**
 * Screen Wake Lock only keeps this visible page from dimming.
 * The browser releases it when the page is hidden. It does not wake a locked phone.
 */
export function useScreenWakeLock() {
  const supported = wakeLockSupported()
  const [status, setStatus] = useState<WakeLockUi>(supported ? 'off' : 'unsupported')
  const wanted = useRef(false)
  const sentinel = useRef<WakeLockSentinel | null>(null)
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  const request = useCallback(async () => {
    if (!wakeLockSupported()) {
      setStatus('unsupported')
      return
    }
    wanted.current = true
    try {
      const lock = await navigator.wakeLock.request('screen')
      sentinel.current = lock
      setStatus('granted')
      lock.addEventListener('release', () => {
        sentinel.current = null
        setStatus('off')
      })
    } catch {
      wanted.current = false
      sentinel.current = null
      setStatus('denied')
    }
  }, [])

  const release = useCallback(async () => {
    wanted.current = false
    const current = sentinel.current
    sentinel.current = null
    try {
      await current?.release()
    } catch {
      /* already released */
    }
    if (wakeLockSupported()) setStatus('off')
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (statusRef.current === 'granted') setStatus('off')
        return
      }
      if (wanted.current && sentinel.current == null) void request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      wanted.current = false
      void sentinel.current?.release()
      sentinel.current = null
    }
  }, [request])

  const toggle = useCallback(() => {
    if (!wakeLockSupported()) {
      setStatus('unsupported')
      return
    }
    if (statusRef.current === 'granted') {
      void release()
      return
    }
    void request()
  }, [release, request])

  return { status, toggle }
}
