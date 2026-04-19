import { useState, useEffect, useCallback } from 'react'

/**
 * React hook to access device orientation (compass heading).
 * Handles iOS permission request logic.
 */
export function useDeviceOrientation() {
  const [heading, setHeading] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown') // 'unknown' | 'granted' | 'denied'

  // Check if API is available on mount
  useEffect(() => {
    if (window.DeviceOrientationEvent) {
      setIsSupported(true)
    }
  }, [])

  const handleOrientation = useCallback((event) => {
    // webkitCompassHeading is non-standard but widely supported on iOS Safari
    const h = event.webkitCompassHeading || (360 - event.alpha)
    if (h !== undefined && h !== null) {
      setHeading(h)
    }
  }, [])

  const requestPermission = async () => {
    if (!window.DeviceOrientationEvent) {
      setPermissionState('denied')
      return false
    }

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const state = await DeviceOrientationEvent.requestPermission()
        setPermissionState(state)
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true)
          return true
        }
      } catch (err) {
        console.error('[orientation] Permission request failed:', err)
        setPermissionState('denied')
      }
    } else {
      // Non-iOS or older iOS
      window.addEventListener('deviceorientation', handleOrientation, true)
      setPermissionState('granted')
      return true
    }
    return false
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [handleOrientation])

  return { heading, isSupported, permissionState, requestPermission }
}
