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

      if (Math.random() < 0.1) {
        console.log(`[orientation] GPS: lat=${newLat.toFixed(4)}, lon=${newLon.toFixed(4)}, rawHeading=${finalHeading}, speed=${pos.coords.speed}`);
      }

      // If browser doesn't provide heading but we have movement, calculate it
      if (finalHeading === null && lastPosRef.current) {
        const dLat = newLat - lastPosRef.current.lat;
        const dLon = newLon - lastPosRef.current.lon;
        const distSq = dLat*dLat + dLon*dLon;
        
        // roughly 2-3 meters threshold
        if (distSq > 0.0000001) { 
           finalHeading = calculateBearing(lastPosRef.current.lat, lastPosRef.current.lon, newLat, newLon)
           if (Math.random() < 0.5) {
             console.log(`[orientation] Calculated bearing: ${finalHeading.toFixed(1)}°`);
           }
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
        speed: pos.coords.speed,
        heading: finalHeading // Also put in position for convenience
      })
      
      setHeading(finalHeading)
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
        console.warn(`[orientation] GPS error: ${err.message}`);
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
