import { useState, useEffect, useCallback } from 'react'

/**
 * React hook to access device orientation (compass heading).
 * Handles iOS permission request logic and Android 'absolute' orientation.
 */
export function useDeviceOrientation() {
  const [heading, setHeading] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown') // 'unknown' | 'granted' | 'denied'

  // Check if API is available on mount
  useEffect(() => {
    if (window.DeviceOrientationEvent || window.DeviceOrientationAbsoluteEvent) {
      setIsSupported(true)
    }
  }, [])

  const handleOrientation = useCallback((event) => {
    // 1. iOS Safari non-standard property
    // 2. Android absolute alpha (if available)
    // 3. Standard alpha (may be relative to load direction)
    const h = event.webkitCompassHeading || event.alpha
    if (h !== undefined && h !== null) {
      // For standard/absolute alpha, we need to invert to get CW rotation from North
      const correctedHeading = event.webkitCompassHeading ? h : (360 - h)
      setHeading(correctedHeading)
    }
  }, [])

  const requestPermission = async () => {
    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
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
      // Non-iOS or older iOS: listen for absolute first (Android), then fallback
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true)
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true)
      }
      setPermissionState('granted')
      return true
    }
    return false
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true)
    }
  }, [handleOrientation])

  return { heading, isSupported, permissionState, requestPermission }
}
