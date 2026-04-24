import { useState, useEffect, useRef } from 'react'

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
const POLL_INTERVAL = 3000
const RETRY_DELAYS = [500, 1000]
export const GEOLOCATION_FAILURE_THRESHOLD = 2

/**
 * React hook for live geolocation with retry logic and bearing calculation.
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

    function calculateBearing(lat1, lon1, lat2, lon2) {
      const phi1 = lat1 * Math.PI / 180
      const phi2 = lat2 * Math.PI / 180
      const deltaLambda = (lon2 - lon1) * Math.PI / 180
      
      const y = Math.sin(deltaLambda) * Math.cos(phi2)
      const x = Math.cos(phi1) * Math.sin(phi2) -
                Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
      const brng = Math.atan2(y, x)
      return (brng * 180 / Math.PI + 360) % 360
    }

    function handleSuccess(pos) {
      clearRetryTimeout()
      retryCountRef.current = 0
      failuresRef.current = 0
      setConsecutiveFailures(0)
      setError(null)

      const newLat = pos.coords.latitude
      const newLon = pos.coords.longitude
      let finalHeading = pos.coords.heading

      // If browser doesn't provide heading but we have movement, calculate it
      if (finalHeading === null && lastPosRef.current && (pos.coords.speed > 0.5 || !pos.coords.speed)) {
        // Distance check: only update heading if moved enough to overcome jitter
        const dist = Math.sqrt(Math.pow(newLat - lastPosRef.current.lat, 2) + Math.pow(newLon - lastPosRef.current.lon, 2))
        if (dist > 0.0001) { // roughly 10 meters
           finalHeading = calculateBearing(lastPosRef.current.lat, lastPosRef.current.lon, newLat, newLon)
           lastPosRef.current = { lat: newLat, lon: newLon }
        }
      } else {
        lastPosRef.current = { lat: newLat, lon: newLon }
      }

      setPosition({
        lat: newLat,
        lon: newLon,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        speed: pos.coords.speed
      })
      
      if (finalHeading !== null) {
        setHeading(finalHeading)
      }
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

    // Initial check
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, GEO_OPTIONS)

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
