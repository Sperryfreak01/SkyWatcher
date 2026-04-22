/**
 * FlightAware enrichment utilities.
 *
 * Provides per-callsign enrichment data fetched through the backend proxy
 * at /api/enrich/:callsign, with a 24-hour localStorage cache keyed as
 * `fa:{CALLSIGN}`.
 *
 * @module enrichment
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const CACHE_TTL_PREFLIGHT_MS = 5 * 60 * 1000 // 5 min — status may change soon

const PRE_DEPARTURE_STATUSES = new Set([
  'SCHEDULED', 'FILED', 'PREDICTED',
])
const CACHE_PREFIX = 'fa:'

/**
 * Read a cached enrichment entry from localStorage.
 *
 * @param {string} callsign - Normalised (uppercase, trimmed) callsign.
 * @returns {{ data: object, expiresAt: number } | null} Parsed entry, or null on
 *   miss, expiry, or parse error.
 */
function readCache(callsign) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + callsign)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || typeof entry.expiresAt !== 'number') return null
    if (entry.expiresAt <= Date.now()) {
      localStorage.removeItem(CACHE_PREFIX + callsign)
      return null
    }
    return entry
  } catch {
    return null
  }
}

/**
 * Write an enrichment result to localStorage with a 24-hour TTL.
 *
 * @param {string} callsign - Normalised callsign.
 * @param {object} data - Enrichment data to persist.
 */
function writeCache(callsign, data) {
  try {
    const status = (data?.status ?? '').toUpperCase().replace(/_/g, ' ')
    const ttl = PRE_DEPARTURE_STATUSES.has(status) ? CACHE_TTL_PREFLIGHT_MS : CACHE_TTL_MS
    const entry = { data, expiresAt: Date.now() + ttl }
    localStorage.setItem(CACHE_PREFIX + callsign, JSON.stringify(entry))
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded, etc.)
    // Fail silently — enrichment still works, just without caching.
  }
}

/**
 * Fetch FlightAware enrichment data for the given callsign.
 *
 * Checks localStorage first.  On a cache miss, calls the backend proxy.
 * Special backend status codes are translated to typed error objects:
 *   - HTTP 429 → `{ error: 'quota_exhausted' }`
 *   - HTTP 503 → `{ error: 'fa_key_not_configured' }`
 *
 * Successful results are cached for 24 hours before being returned.
 *
 * @param {string} callsign - Raw callsign string (will be normalised internally).
 * @returns {Promise<object>} Enrichment data or an error descriptor object.
 */
export async function enrichAircraft(callsign) {
  // Skip API calls when the browser tab is not visible to preserve daily quota.
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return { skipped: true }
  }

  const normalised = callsign.trim().toUpperCase()

  const cached = readCache(normalised)
  if (cached) return cached.data

  const response = await fetch(`/api/enrich/${encodeURIComponent(normalised)}`)

  if (response.status === 429) return { error: 'quota_exhausted' }
  if (response.status === 503) return { error: 'fa_key_not_configured' }

  if (!response.ok) {
    return { error: `http_${response.status}` }
  }

  const data = await response.json()
  writeCache(normalised, data)
  return data
}

/**
 * Retrieve current FlightAware API quota information from the backend proxy.
 *
 * @returns {Promise<{ used: number, remaining: number, limit: number, resetsAt: string } | null>}
 *   Quota object, or null if the request fails.
 */
export async function getQuota() {
  try {
    const response = await fetch('/api/quota')
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Remove all FlightAware enrichment entries (`fa:*`) from localStorage.
 */
export function clearEnrichmentCache() {
  const keysToRemove = Object.keys(localStorage).filter((k) =>
    k.startsWith(CACHE_PREFIX)
  )
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}
