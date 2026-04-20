import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * React hook to access device orientation (compass heading).
 * Handles iOS permission request logic and Android 'absolute' orientation.
 */
export function useDeviceOrientation() {
  const [heading, setHeading] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown') // 'unknown' | 'granted' | 'denied'

  const listenerRef = useRef(null) // { eventName, handler } or null

  // Check if API is available on mount
  useEffect(() => {
    if (window.DeviceOrientationEvent || window.DeviceOrientationAbsoluteEvent) {
      setIsSupported(true)
    }
  }, [])

  const handleOrientation = useCallback((event) => {
    // Use != null so heading=0 (North) is treated as valid, not falsy
    const h = event.webkitCompassHeading != null ? event.webkitCompassHeading : event.alpha
    if (h != null) {
      // webkitCompassHeading is already CW from North; standard alpha is CCW so invert it
      const correctedHeading = event.webkitCompassHeading != null ? h : (360 - h) % 360
      setHeading(correctedHeading)
    }
  }, [])

  const requestPermission = async () => {
    // Skip if listener already registered to prevent accumulation
    if (listenerRef.current) return true

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const state = await DeviceOrientationEvent.requestPermission()
        setPermissionState(state)
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true)
          listenerRef.current = { eventName: 'deviceorientation', handler: handleOrientation }
          return true
        }
      } catch (err) {
        console.error('[orientation] Permission request failed:', err)
        setPermissionState('denied')
      }
    } else {
      // Non-iOS: prefer absolute orientation (Android), fall back to relative
      const eventName = 'ondeviceorientationabsolute' in window
        ? 'deviceorientationabsolute'
        : 'deviceorientation'
      window.addEventListener(eventName, handleOrientation, true)
      listenerRef.current = { eventName, handler: handleOrientation }
      setPermissionState('granted')
      return true
    }
    return false
  }

  // Remove only the event type that was actually registered
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener(listenerRef.current.eventName, listenerRef.current.handler, true)
        listenerRef.current = null
      }
    }
  }, [])

  return { heading, isSupported, permissionState, requestPermission }
}
