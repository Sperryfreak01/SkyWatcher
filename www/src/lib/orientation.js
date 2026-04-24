import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * React hook to access device orientation (compass heading).
 * Handles iOS permission request logic and Android 'absolute' orientation.
 * Accepts `gpsHeading` as a fallback when native orientation is unavailable.
 */
export function useDeviceOrientation(gpsHeading = null) {
  const [nativeHeading, setNativeHeading] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown') // 'unknown' | 'granted' | 'denied'

  const listenerRef = useRef(null) // { eventName, handler } or null
  const smoothedHeadingRef = useRef(null)

  const ALPHA = 0.15 // smoothing factor: lower = smoother, higher = more responsive

  // handleOrientation must be declared before any useEffect that references it
  const handleOrientation = useCallback((event) => {
    // Use != null so heading=0 (North) is treated as valid, not falsy
    const h = event.webkitCompassHeading != null ? event.webkitCompassHeading : event.alpha
    
    if (h != null) {
      // webkitCompassHeading is already CW from North; standard alpha is CCW so invert it
      const correctedHeading = event.webkitCompassHeading != null ? h : (360 - h) % 360
      
      if (smoothedHeadingRef.current === null) {
        smoothedHeadingRef.current = correctedHeading
      } else {
        const delta = ((correctedHeading - smoothedHeadingRef.current + 540) % 360) - 180
        smoothedHeadingRef.current = (smoothedHeadingRef.current + ALPHA * delta + 360) % 360
      }
      
      console.log(`[orientation] event: ${event.type} | raw: ${h.toFixed(1)} | corrected: ${correctedHeading.toFixed(1)} | smoothed: ${smoothedHeadingRef.current.toFixed(1)}`);
      setNativeHeading(smoothedHeadingRef.current)
    } else {
      console.warn('[orientation] received event but heading data is null', event);
    }
  }, [])

  // Check if API is available; auto-register on Android (no permission dialog needed)
  useEffect(() => {
    const hasApi = window.DeviceOrientationEvent || window.DeviceOrientationAbsoluteEvent
    console.log(`[orientation] init: hasApi=${!!hasApi}`);
    if (!hasApi) return
    setIsSupported(true)

    // iOS requires an explicit user gesture to call requestPermission — skip auto-register
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    console.log(`[orientation] init: needsPermission=${needsPermission}`);
    if (needsPermission) return

    // Android/non-iOS: register immediately without a button tap
    if (listenerRef.current) return
    const eventName = 'ondeviceorientationabsolute' in window
      ? 'deviceorientationabsolute'
      : 'deviceorientation'
    
    console.log(`[orientation] auto-registering: ${eventName}`);
    window.addEventListener(eventName, handleOrientation, true)
    listenerRef.current = { eventName, handler: handleOrientation }
    setPermissionState('granted')
  }, [handleOrientation])

  const requestPermission = async () => {
    console.log('[orientation] requestPermission called');
    // Skip if listener already registered to prevent accumulation
    if (listenerRef.current) {
      console.log('[orientation] already has listener, skipping');
      return true
    }

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        console.log('[orientation] requesting iOS permission...');
        const state = await DeviceOrientationEvent.requestPermission()
        console.log(`[orientation] iOS permission state: ${state}`);
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
      
      console.log(`[orientation] manual-registering: ${eventName}`);
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

  const heading = permissionState === 'granted' ? nativeHeading : (gpsHeading ?? 0)

  return { heading, isSupported, permissionState, requestPermission }
}
