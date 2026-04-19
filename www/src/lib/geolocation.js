import { useState, useEffect, useRef } from 'react'

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
const POLL_INTERVAL = 3000
const RETRY_DELAYS = [500, 1000]
export const GEOLOCATION_FAILURE_THRESHOLD = 2

/**
 * React hook for live geolocation with retry logic and permission tracking.
 *
 * @param {boolean} enabled  Enable/disable geolocation polling.
 * @returns {{ position: {lat,lon,accuracy}|null, isSupported: boolean,
 *   isDenied: boolean, consecutiveFailures: number, error: string|null }}
 *
 * Polling interval: 3s. Permission-denied retry: [500ms, 1000ms] backoff.
 * `isDenied` is set permanently after retries are exhausted — UI should hide
 * the Field Mode toggle at that point. Cleanup runs on unmount or disable.
 */
export function useGeolocation(enabled) {
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  const [position, setPosition] = useState(null)
  const [isDenied, setIsDenied] = useState(false)
  const [error, setError] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  const failuresRef = useRef(0)
  const deniedRef = useRef(false)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!isSupported || !enabled || deniedRef.current) return

    function clearRetryTimeout() {
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }

    function handleSuccess(pos) {
      clearRetryTimeout()
      retryCountRef.current = 0
      failuresRef.current = 0
      setConsecutiveFailures(0)
      setError(null)
      setPosition({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      })
    }

    function handleError(err) {
      if (err.code === 1) {
        if (retryCountRef.current < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[retryCountRef.current]
          retryCountRef.current += 1
          retryTimeoutRef.current = setTimeout(() => {
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError, GEO_OPTIONS)
          }, delay)
        } else {
          clearRetryTimeout()
          clearInterval(intervalRef.current)
          intervalRef.current = null
          deniedRef.current = true
          setIsDenied(true)
          setError('Location permission denied')
        }
      } else {
        failuresRef.current += 1
        setConsecutiveFailures(failuresRef.current)
        setError(err.message || 'Location unavailable')
      }
    }

    intervalRef.current = setInterval(() => {
      if (deniedRef.current) return
      retryCountRef.current = 0
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, GEO_OPTIONS)
    }, POLL_INTERVAL)

    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      clearRetryTimeout()
      retryCountRef.current = 0
    }
  }, [enabled, isSupported])

  return {
    position,
    isSupported,
    isDenied,
    consecutiveFailures,
    error,
  }
}
