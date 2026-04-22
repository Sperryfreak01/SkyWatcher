/**
 * Unit conversion and formatting utilities for US Imperial display.
 *
 * @module units
 */

const METERS_PER_MILE = 1609.344
const FEET_PER_METER = 3.28084
const MPH_PER_KNOT = 1.15078

/**
 * Format a distance in meters as miles or feet.
 *
 * Displays miles when the distance is >= 0.1 mi (160.9344 m),
 * otherwise displays feet.
 *
 * @param {number | null | undefined} meters - Distance in metres.
 * @returns {string} Formatted string, e.g. "12.3 mi" or "425 ft". Returns "—" for null/undefined.
 */
export function fmtDist(meters) {
  if (meters == null) return '—'
  const miles = meters / METERS_PER_MILE
  if (miles >= 0.1) {
    return `${miles.toFixed(1)} mi`
  }
  const feet = Math.round(meters * FEET_PER_METER)
  return `${feet.toLocaleString()} ft`
}

/**
 * Format a speed in knots as mph.
 *
 * @param {number | null | undefined} knots - Speed in knots.
 * @returns {string} Formatted string, e.g. "456 mph". Returns "—" for null/undefined.
 */
export function fmtSpeed(knots) {
  if (knots == null) return '—'
  return `${Math.round(knots * MPH_PER_KNOT)} mph`
}

/**
 * Format an altitude in feet with thousands separator.
 *
 * @param {number | string | null | undefined} feet - Altitude in feet, or the
 *   string "ground".
 * @returns {string} Formatted string, e.g. "35,000 ft". Returns "GND" for
 *   ground/null/invalid.
 */
export function fmtAlt(feet) {
  if (feet == null || feet === 'ground') return 'GND'
  const n = typeof feet === 'string' ? parseInt(feet, 10) : feet
  if (isNaN(n)) return '—'
  return `${n.toLocaleString()} ft`
}
