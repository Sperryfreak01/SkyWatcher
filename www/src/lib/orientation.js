import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * React hook to access device orientation (compass heading).
 * Handles iOS permission request logic, Android 'absolute' orientation,
 * and falls back to the Generic Sensor API (AbsoluteOrientationSensor) for modern browsers.
 */
export function useDeviceOrientation(gpsHeading = null) {
  const [nativeHeading, setNativeHeading] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown') // 'unknown' | 'granted' | 'denied'

  const listenerRef = useRef(null) 
  const smoothedHeadingRef = useRef(null)
  const sensorRef = useRef(null)

  const ALPHA = 0.15 // smoothing factor

  const updateHeading = useCallback((correctedHeading, type) => {
    if (smoothedHeadingRef.current === null) {
      smoothedHeadingRef.current = correctedHeading
    } else {
      const delta = ((correctedHeading - smoothedHeadingRef.current + 540) % 360) - 180
      smoothedHeadingRef.current = (smoothedHeadingRef.current + ALPHA * delta + 360) % 360
    }
    
    if (Math.random() < 0.05) {
      console.log(`[orientation] DATA: ${type} | smoothed: ${smoothedHeadingRef.current.toFixed(1)}`);
    }
    setNativeHeading(smoothedHeadingRef.current)
  }, []);

  const handleOrientation = useCallback((event) => {
    const availableKeys = [];
    if (event.webkitCompassHeading != null) availableKeys.push('webkitCompassHeading');
    if (event.alpha != null) availableKeys.push('alpha');
    if (event.beta != null) availableKeys.push('beta');
    if (event.gamma != null) availableKeys.push('gamma');

    const h = event.webkitCompassHeading != null ? event.webkitCompassHeading : event.alpha
    
    if (h != null) {
      const correctedHeading = event.webkitCompassHeading != null ? h : (360 - h) % 360
      updateHeading(correctedHeading, event.type);
    } else {
      // Only log the null data once every few seconds to avoid spamming the UI log
      if (Math.random() < 0.01) {
        console.warn(`[orientation] ${event.type} null. Keys: ${Object.keys(event).filter(k => typeof event[k] !== 'function').join(',')}`);
      }
    }
  }, [updateHeading])

  // Try Generic Sensor API (Modern Chrome/Tesla)
  const setupGenericSensor = useCallback(() => {
    if (window.AbsoluteOrientationSensor) {
      try {
        console.log('[orientation] Attempting AbsoluteOrientationSensor...');
        const options = { frequency: 10, referenceFrame: 'screen' };
        const sensor = new window.AbsoluteOrientationSensor(options);
        
        sensor.addEventListener('reading', () => {
          // Convert quaternion to Euler heading (simplified for yaw)
          const q = sensor.quaternion;
          const heading = Math.atan2(2*q[0]*q[1] + 2*q[2]*q[3], 1 - 2*q[1]*q[1] - 2*q[2]*q[2]) * (180/Math.PI);
          const correctedHeading = (360 - heading) % 360;
          updateHeading(correctedHeading, 'AbsoluteOrientationSensor');
        });

        sensor.addEventListener('error', (error) => {
          if (error.name === 'NotAllowedError') {
            console.warn('[orientation] Sensor API NotAllowed');
          } else {
            console.error('[orientation] Sensor API error:', error.name);
          }
        });

        sensor.start();
        sensorRef.current = sensor;
        console.log('[orientation] AbsoluteOrientationSensor started');
        return true;
      } catch (err) {
        console.error('[orientation] Failed to setup AbsoluteOrientationSensor:', err);
      }
    }
    return false;
  }, [updateHeading]);

  useEffect(() => {
    const hasApi = !!(window.DeviceOrientationEvent || window.DeviceOrientationAbsoluteEvent || window.AbsoluteOrientationSensor)
    const isSecure = window.isSecureContext;
    console.log(`[orientation] init: hasApi=${hasApi} | isSecure=${isSecure} | ua=${navigator.userAgent}`);
    
    if (!hasApi) return
    setIsSupported(true)

    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    
    if (needsPermission) return

    // Auto-register standard events
    console.log('[orientation] auto-registering standard listeners');
    window.addEventListener('deviceorientation', handleOrientation, true)
    window.addEventListener('deviceorientationabsolute', handleOrientation, true)
    
    // Also try generic sensor
    setupGenericSensor();
    
    setPermissionState('granted')

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true)
      if (sensorRef.current) sensorRef.current.stop();
    }
  }, [handleOrientation, setupGenericSensor])

  const requestPermission = async () => {
    console.log('[orientation] requestPermission triggered');

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const state = await DeviceOrientationEvent.requestPermission()
        setPermissionState(state)
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true)
          return true
        }
      } catch (err) {
        console.error('[orientation] Permission error:', err)
        setPermissionState('denied')
      }
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true)
      window.addEventListener('deviceorientationabsolute', handleOrientation, true)
      setupGenericSensor();
      setPermissionState('granted')
      return true
    }
    return false
  }

  const heading = permissionState === 'granted' ? nativeHeading : (gpsHeading ?? 0)

  return { heading, isSupported, permissionState, requestPermission }
}
