/**
 * @fileoverview Planespotters.net aircraft photo fetching with sessionStorage cache.
 *
 * API: GET https://api.planespotters.net/pub/photos/hex/{hex}
 * Response schema: { photos: [{ thumbnail: { src, size: { width, height } }, link, photographer }] }
 * Cache key: "photo:{hex}" (lowercase) — per-session TTL (cleared when tab closes).
 */

const API_BASE = 'https://api.planespotters.net/pub/photos/hex'

/**
 * @typedef {Object} PhotoResult
 * @property {string} src          - Thumbnail image URL.
 * @property {string} link         - Planespotters page URL for the photo.
 * @property {string} photographer - Photographer display name.
 */

/**
 * Fetch the first available Planespotters thumbnail for an aircraft.
 *
 * Results are cached in `sessionStorage` under the key `photo:{hex}` so that
 * repeated renders within a session do not incur additional network requests.
 * The value `"null"` is stored when the API returns no photos so that we do not
 * re-request known-empty results within the same session.
 *
 * @param {string|null|undefined} hex - ICAO 24-bit hex address (e.g. "a1b2c3").
 * @returns {Promise<PhotoResult|null>} Resolved photo data, or null when none exists or on error.
 */
export async function fetchPhoto(hex) {
  if (!hex) return null

  const normalizedHex = hex.toLowerCase()
  const cacheKey = `photo:${normalizedHex}`

  // --- Cache read ---
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached !== null) {
      return JSON.parse(cached)
    }
  } catch {
    // sessionStorage may be unavailable (private browsing restrictions, quota).
    // Fall through to network fetch.
  }

  // --- Network fetch ---
  try {
    const response = await fetch(`${API_BASE}/${normalizedHex}`)

    if (!response.ok) {
      // Do not cache error responses — a transient server error should be
      // retried on the next hex change.
      return null
    }

    const data = await response.json()

    if (!Array.isArray(data?.photos) || data.photos.length === 0) {
      // Cache the known-empty result so we do not hammer the API within the session.
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(null))
      } catch {
        // Ignore storage errors.
      }
      return null
    }

    const first = data.photos[0]
    /** @type {PhotoResult} */
    const result = {
      src: first.thumbnail?.src ?? null,
      link: first.link ?? null,
      photographer: first.photographer ?? null,
    }

    // Cache the successful result.
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result))
    } catch {
      // Ignore storage errors.
    }

    return result
  } catch {
    // Network error, JSON parse failure, etc. — always return null.
    return null
  }
}
