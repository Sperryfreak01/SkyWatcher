import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * React hook to access device orientation (compass heading).
 * Highly verbose version for troubleshooting Tesla sensor issues.
 */
export function useDeviceOrientation(gpsHeading = null) {
  const [nativeHeading, setNativeHeading] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown')

  const smoothedHeadingRef = useRef(null)
  const sensorRef = useRef(null)

  const ALPHA = 0.15

  const updateHeading = useCallback((correctedHeading, type) => {
    if (smoothedHeadingRef.current === null) {
      smoothedHeadingRef.current = correctedHeading
    } else {
      const delta = ((correctedHeading - smoothedHeadingRef.current + 540) % 360) - 180
      smoothedHeadingRef.current = (smoothedHeadingRef.current + ALPHA * delta + 360) % 360
    }
    
    // Log every 100th event to show activity without flooding
    if (Math.random() < 0.01) {
      console.log(`[orientation] DATA: ${type} | current: ${correctedHeading.toFixed(1)} | smoothed: ${smoothedHeadingRef.current.toFixed(1)}`);
    }
    setNativeHeading(smoothedHeadingRef.current)
  }, []);

  const handleOrientation = useCallback((event) => {
    const h = event.webkitCompassHeading != null ? event.webkitCompassHeading : event.alpha
    if (h != null) {
      const correctedHeading = event.webkitCompassHeading != null ? h : (360 - h) % 360
      updateHeading(correctedHeading, event.type);
    } else {
      if (Math.random() < 0.01) {
        const keys = Object.keys(event).filter(k => typeof event[k] !== 'function').join(',');
        console.warn(`[orientation] ${event.type} fire but null. keys: ${keys}`);
      }
    }
  }, [updateHeading])

  const setupGenericSensor = useCallback(async () => {
    if (!window.AbsoluteOrientationSensor) {
      console.warn('[orientation] AbsoluteOrientationSensor API not supported');
      return false;
    }

    try {
      console.log('[orientation] Querying Sensor permissions...');
      const results = await Promise.all([
        navigator.permissions.query({ name: 'accelerometer' }).catch(() => ({ state: 'n/a' })),
        navigator.permissions.query({ name: 'magnetometer' }).catch(() => ({ state: 'n/a' })),
        navigator.permissions.query({ name: 'gyroscope' }).catch(() => ({ state: 'n/a' }))
      ]);
      console.log(`[orientation] Permissions: acc=${results[0].state}, mag=${results[1].state}, gyro=${results[2].state}`);

      const sensor = new window.AbsoluteOrientationSensor({ frequency: 20, referenceFrame: 'screen' });
      
      sensor.addEventListener('reading', () => {
        const q = sensor.quaternion;
        // Basic heading from quaternion
        const heading = Math.atan2(2*q[0]*q[1] + 2*q[2]*q[3], 1 - 2*q[1]*q[1] - 2*q[2]*q[2]) * (180/Math.PI);
        const correctedHeading = (360 - heading) % 360;
        updateHeading(correctedHeading, 'AbsoluteSensor');
      });

      sensor.addEventListener('error', e => {
        console.error(`[orientation] Sensor error: ${e.error.name} - ${e.error.message}`);
      });

      console.log('[orientation] Starting AbsoluteOrientationSensor...');
      sensor.start();
      sensorRef.current = sensor;
      return true;
    } catch (err) {
      console.error('[orientation] Generic Sensor failure:', err);
      return false;
    }
  }, [updateHeading]);

  useEffect(() => {
    const hasOrient = 'DeviceOrientationEvent' in window;
    const hasAbsolute = 'DeviceOrientationAbsoluteEvent' in window;
    const hasSensor = 'AbsoluteOrientationSensor' in window;
    const isSecure = window.isSecureContext;
    
    console.log(`[orientation] init: secure=${isSecure} | orient=${hasOrient} | abs=${hasAbsolute} | sensor=${hasSensor}`);

    if (!hasOrient && !hasAbsolute && !hasSensor) {
      console.error('[orientation] No orientation APIs found');
      return;
    }
    
    setIsSupported(true);

    // If not iOS, start immediately
    const isIOS = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    if (!isIOS) {
      console.log('[orientation] auto-starting listeners');
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      setupGenericSensor();
      setPermissionState('granted');
    } else {
      console.log('[orientation] iOS detected, awaiting user gesture');
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      if (sensorRef.current) sensorRef.current.stop();
    }
  }, [handleOrientation, setupGenericSensor])

  const requestPermission = async () => {
    console.log('[orientation] manual requestPermission triggered');
    const isIOS = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    
    if (isIOS) {
      try {
        const state = await DeviceOrientationEvent.requestPermission();
        console.log(`[orientation] iOS permission: ${state}`);
        setPermissionState(state);
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      } catch (e) { console.error('[orientation] iOS error', e); }
    } else {
      console.log('[orientation] re-checking standard + sensor listeners');
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      setupGenericSensor();
      setPermissionState('granted');
    }
  };

  const heading = (gpsHeading !== null) ? gpsHeading : (permissionState === 'granted' || permissionState === 'unknown') ? nativeHeading : 0
  
  if (gpsHeading !== null && Math.random() < 0.05) {
    console.log(`[orientation] Using GPS/Calculated heading: ${gpsHeading.toFixed(1)}`);
  }

  return { heading, isSupported, permissionState, requestPermission }
}
