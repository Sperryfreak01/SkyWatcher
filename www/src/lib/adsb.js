/**
 * @fileoverview ADS-B polling module and aircraft visibility filter.
 *
 * Exports:
 *  - computeAzEl(aircraft, observer) → { az, el, distance3d, distanceGround }
 *  - isVisible(aircraft, observer) → boolean
 *  - filterVisible(aircraft, observer) → augmented, sorted array
 *  - useAdsbPoller(intervalMs?) — React hook that drives AircraftContext state
 */

import { useContext, useEffect, useRef } from 'react'
import { AircraftContext } from '../contexts/AircraftContext'
import { SettingsContext } from '../contexts/SettingsContext'

/** Earth radius in metres (IUGG mean) */
const R = 6_371_000

/** Degrees to radians */
const toRad = deg => (deg * Math.PI) / 180

/** Radians to degrees */
const toDeg = rad => (rad * 180) / Math.PI

// ---------------------------------------------------------------------------
// Core geometry
// ---------------------------------------------------------------------------

/**
 * Compute azimuth, elevation, and distances from observer to aircraft.
 *
 * @param {{ lat: number, lon: number, alt_baro: number }} aircraft
 *   Aircraft position — `alt_baro` is in feet (barometric altitude).
 * @param {{ lat: number, lon: number, elev: number }} observer
 *   Observer position — `elev` is in feet.
 * @returns {{ az: number, el: number, distance3d: number, distanceGround: number }}
 *   `az` 0–360° (0=N, 90=E), `el` degrees above horizon,
 *   `distance3d` and `distanceGround` in metres.
 */
export function computeAzEl(aircraft, observer) {
  const lat1 = toRad(observer.lat)
  const lat2 = toRad(aircraft.lat)
  const dLat = lat2 - lat1
  const dLon = toRad(aircraft.lon - observer.lon)

  // Haversine ground distance
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const distanceGround = 2 * R * Math.asin(Math.sqrt(a))

  // Azimuth (bearing) 0–360°
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const az = (toDeg(Math.atan2(y, x)) + 360) % 360

  // Height difference in metres
  const hAircraft = aircraft.alt_baro * 0.3048
  const hObserver = observer.elev * 0.3048
  const hDiff = hAircraft - hObserver

  // Elevation angle above horizon
  const el = toDeg(Math.atan2(hDiff, distanceGround))

  // 3-D slant distance
  const distance3d = Math.sqrt(distanceGround ** 2 + hDiff ** 2)

  return { az, el, distance3d, distanceGround }
}

// ---------------------------------------------------------------------------
// Visibility filter
// ---------------------------------------------------------------------------

/**
 * Determine whether an aircraft is visible from the observer's location.
 *
 * Conditions (all must hold):
 *  1. Aircraft has valid lat, lon, and numeric altitude (not "ground").
 *  2. Elevation angle exceeds `observer.obstructionAngle` (default 14.2°).
 *  3. Aircraft is within the combined geometric horizon of observer + aircraft.
 *
 * @param {object} aircraft  Raw ADS-B aircraft record.
 * @param {{ lat: number, lon: number, elev: number, obstructionAngle?: number }} observer
 * @returns {boolean}
 */
export function isVisible(aircraft, observer) {
  // Condition 1 — position and numeric altitude
  if (
    aircraft.lat == null ||
    aircraft.lon == null ||
    aircraft.alt_baro == null ||
    aircraft.alt_baro === 'ground'
  ) {
    return false
  }

  const { el, distanceGround } = computeAzEl(aircraft, observer)

  // Condition 2 — above obstruction angle
  const obstructionAngle = observer.obstructionAngle ?? 14.2
  if (el <= obstructionAngle) {
    return false
  }

  // Condition 3 — within geometric horizon
  const hObserver = observer.elev * 0.3048
  const hAircraft = aircraft.alt_baro * 0.3048
  const horizonObserver = Math.sqrt(2 * R * hObserver)
  const horizonAircraft = Math.sqrt(2 * R * hAircraft)
  if (distanceGround >= horizonObserver + horizonAircraft) {
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Filter + sort + augment
// ---------------------------------------------------------------------------

/**
 * Filter an array of raw ADS-B aircraft records to those visible from the
 * observer, sort by ascending 3-D distance, and augment each entry with
 * `{ az, el, distance3d, distanceGround }`.
 *
 * @param {object[]} aircraft  Array of raw ADS-B records.
 * @param {object}   observer  Observer position.
 * @returns {object[]} Filtered, augmented, and sorted records.
 */
export function filterVisible(aircraft, observer) {
  const augmented = []

  for (const ac of aircraft) {
    if (!isVisible(ac, observer)) continue
    const { az, el, distance3d, distanceGround } = computeAzEl(ac, observer)
    augmented.push({ ...ac, az, el, distance3d, distanceGround })
  }

  augmented.sort((a, b) => a.distance3d - b.distance3d)
  return augmented
}

// ---------------------------------------------------------------------------
// React polling hook
// ---------------------------------------------------------------------------

/**
 * React hook that polls `/api/aircraft` on a fixed interval and updates
 * `AircraftContext` state via `setVisibleAircraft`, `setCurrentAircraft`,
 * and `setPollingStatus`.
 *
 * Polling only starts once `observer.lat` is non-null (settings configured).
 * Uses an AbortController on each fetch so stale responses are discarded on
 * cleanup.
 *
 * @param {number} [intervalMs=10000]  Poll interval in milliseconds.
 */
export function useAdsbPoller(intervalMs = 10_000) {
  const { setCurrentAircraft, setVisibleAircraft, setPollingStatus } =
    useContext(AircraftContext)
  const { observer } = useContext(SettingsContext)

  // Keep a ref so the interval callback always sees the latest observer
  // without needing to restart the interval on every settings change.
  const observerRef = useRef(observer)
  useEffect(() => {
    observerRef.current = observer
  }, [observer])

  // Stable references from useState — safe to list in deps without churn.
  const setCurrentRef = useRef(setCurrentAircraft)
  const setVisibleRef = useRef(setVisibleAircraft)
  const setStatusRef = useRef(setPollingStatus)

  useEffect(() => {
    // Stay idle until observer coordinates are configured.
    if (observer.lat == null) {
      setPollingStatus('idle')
      return
    }

    setPollingStatus('active')

    let abortController = null

    async function poll() {
      abortController = new AbortController()
      try {
        const response = await fetch('/api/aircraft', {
          signal: abortController.signal,
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        const raw = data?.aircraft ?? []
        const visible = filterVisible(raw, observerRef.current)

        setVisibleRef.current(visible)
        setCurrentRef.current(visible[0] ?? null)
      } catch (err) {
        if (err.name === 'AbortError') return  // Expected on cleanup
        console.error('[adsb] Fetch error:', err)
        setStatusRef.current('error')
      }
    }

    // Fire immediately, then on interval.
    poll()
    const timerId = setInterval(poll, intervalMs)

    return () => {
      clearInterval(timerId)
      abortController?.abort()
    }
    // Restart the effect only when the observer becomes configured (lat flips
    // from null) or the poll interval changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observer.lat, intervalMs])
}

// ---------------------------------------------------------------------------
// Inline verification (dev/test only — tree-shaken in production builds)
// ---------------------------------------------------------------------------

/* @test
 *
 * The block below runs only when Vite's MODE is 'test'.  It exercises the
 * three pure functions with hand-calculated values.
 *
 * Observer (from project defaults):
 *   lat REDACTED_LAT, lon REDACTED_LON, elev 1003 ft, obstruction 14.2°
 */
if (import.meta.env?.MODE === 'test') {
  const OBS = {
    lat: REDACTED_LAT,
    lon: REDACTED_LON,
    elev: 1003,
    obstructionAngle: 14.2,
  }

  // ── Helper ──────────────────────────────────────────────────────────────
  function assert(condition, label) {
    if (!condition) throw new Error(`FAIL: ${label}`)
    console.log(`PASS: ${label}`)
  }

  // ── Test 1 — Aircraft at el≈20° passes isVisible ────────────────────────
  // Place aircraft ~5 km away at 10 000 ft to get high elevation angle.
  const acHighEl = {
    lat: OBS.lat + 0.045,   // ~5 km north
    lon: OBS.lon,
    alt_baro: 10_000,       // ft
  }
  assert(isVisible(acHighEl, OBS), 'Aircraft at high elevation (>14.2°) passes isVisible')

  // ── Test 2 — Aircraft at el≈5° fails condition 2 ────────────────────────
  // Place aircraft ~40 km away at 5 000 ft — low elevation angle.
  const acLowEl = {
    lat: OBS.lat + 0.36,    // ~40 km north
    lon: OBS.lon,
    alt_baro: 5_000,        // ft
  }
  const { el: elLow } = computeAzEl(acLowEl, OBS)
  assert(elLow < 14.2, 'Low-elevation aircraft has el < 14.2°')
  assert(!isVisible(acLowEl, OBS), 'Low-elevation aircraft fails isVisible')

  // ── Test 3 — Aircraft 500 km away fails condition 3 (horizon) ───────────
  const acFar = {
    lat: OBS.lat + 4.5,     // ~500 km north
    lon: OBS.lon,
    alt_baro: 35_000,       // ft (typical cruising altitude)
  }
  assert(!isVisible(acFar, OBS), '500 km aircraft fails horizon check')

  // ── Test 4 — filterVisible returns sorted closest-first ─────────────────
  const acNear = { lat: OBS.lat + 0.045, lon: OBS.lon, alt_baro: 15_000 }
  const acMid  = { lat: OBS.lat + 0.09,  lon: OBS.lon, alt_baro: 15_000 }
  // Pass them in reverse order (far first) to verify sorting.
  const sorted = filterVisible([acMid, acNear], OBS)
  assert(
    sorted.length >= 2 &&
    sorted[0].distance3d <= sorted[1].distance3d,
    'filterVisible returns entries sorted closest-first'
  )
  assert('az' in sorted[0] && 'el' in sorted[0], 'Augmented entries have az and el fields')

  console.log('[adsb] All self-tests passed.')
}
