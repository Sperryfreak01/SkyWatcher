import { useState, useEffect, useRef } from 'react'

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
const POLL_INTERVAL = 3000
const RETRY_DELAYS = [500, 1000]
export const GEOLOCATION_FAILURE_THRESHOLD = 2

/**
 * React hook for live geolocation with retry logic and permission tracking.
 *
 * @param {boolean} enabled  Enable/disable geolocation polling.
 * @returns {{ position: {lat,lon,accuracy}|null, heading: number|null, isSupported: boolean,
 *   isDenied: boolean, consecutiveFailures: number, error: string|null }}
 *
 * Polling interval: 3s. Permission-denied retry: [500ms, 1000ms] backoff.
 * `isDenied` is set permanently after retries are exhausted — UI should hide
 * the Field Mode toggle at that point. Cleanup runs on unmount or disable.
 */
export function useGeolocation(enabled) {
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  const [position, setPosition] = useState(null)
  const [heading, setHeading] = useState(null)
  const [isDenied, setIsDenied] = useState(false)
  const [error, setError] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  const lastPosRef = useRef(null)
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

      const newLat = pos.coords.latitude
      const newLon = pos.coords.longitude
      let calculatedHeading = pos.coords.heading

      // If browser doesn't provide heading but we have movement, calculate it from coordinate delta
      if (calculatedHeading === null && lastPosRef.current && pos.coords.speed > 0.5) {
        const lat1 = lastPosRef.current.lat * Math.PI / 180
        const lon1 = lastPosRef.current.lon * Math.PI / 180
        const lat2 = newLat * Math.PI / 180
        const lon2 = newLon * Math.PI / 180
        
        const y = Math.sin(lon2 - lon1) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
        const brng = Math.atan2(y, x)
        calculatedHeading = (brng * 180 / Math.PI + 360) % 360
      }

      lastPosRef.current = { lat: newLat, lon: newLon }

      setPosition({
        lat: newLat,
        lon: newLon,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        speed: pos.coords.speed
      })
      setHeading(calculatedHeading)
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
    heading,
    isSupported,
    isDenied,
    consecutiveFailures,
    error,
  }
}
