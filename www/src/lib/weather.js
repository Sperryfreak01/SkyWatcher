/**
 * Weather utilities for SkyWatcher.
 * Fetches current conditions from Open-Meteo (free, no API key required).
 */

/** @type {Record<number, {condition: string, emoji: string}>} */
const WMO_MAP = {
  0:  { condition: 'Clear sky',    emoji: '\u2600\uFE0F' },
  1:  { condition: 'Cloudy',       emoji: '\u26C5' },
  2:  { condition: 'Cloudy',       emoji: '\u26C5' },
  3:  { condition: 'Cloudy',       emoji: '\u26C5' },
  45: { condition: 'Foggy',        emoji: '\uD83C\uDF2B\uFE0F' },
  48: { condition: 'Foggy',        emoji: '\uD83C\uDF2B\uFE0F' },
  51: { condition: 'Rainy',        emoji: '\uD83C\uDF27\uFE0F' },
  53: { condition: 'Rainy',        emoji: '\uD83C\uDF27\uFE0F' },
  55: { condition: 'Rainy',        emoji: '\uD83C\uDF27\uFE0F' },
  61: { condition: 'Rainy',        emoji: '\uD83C\uDF27\uFE0F' },
  63: { condition: 'Rainy',        emoji: '\uD83C\uDF27\uFE0F' },
  65: { condition: 'Rainy',        emoji: '\uD83C\uDF27\uFE0F' },
  71: { condition: 'Snowy',        emoji: '\uD83C\uDF28\uFE0F' },
  73: { condition: 'Snowy',        emoji: '\uD83C\uDF28\uFE0F' },
  75: { condition: 'Snowy',        emoji: '\uD83C\uDF28\uFE0F' },
  77: { condition: 'Snowy',        emoji: '\uD83C\uDF28\uFE0F' },
  80: { condition: 'Showers',      emoji: '\uD83C\uDF26\uFE0F' },
  81: { condition: 'Showers',      emoji: '\uD83C\uDF26\uFE0F' },
  82: { condition: 'Showers',      emoji: '\uD83C\uDF26\uFE0F' },
  95: { condition: 'Thunderstorm', emoji: '\u26C8\uFE0F' },
  96: { condition: 'Thunderstorm', emoji: '\u26C8\uFE0F' },
  99: { condition: 'Thunderstorm', emoji: '\u26C8\uFE0F' },
}

const DEFAULT_WMO = { condition: 'Unknown', emoji: '\uD83C\uDF21\uFE0F' }

/**
 * Map a WMO weather code to a human-readable condition and emoji.
 * @param {number} code
 * @returns {{ condition: string, emoji: string }}
 */
function decodeWmoCode(code) {
  return WMO_MAP[code] ?? DEFAULT_WMO
}

/**
 * Fetch current weather from Open-Meteo for the given coordinates.
 *
 * @param {number} lat - Observer latitude in decimal degrees
 * @param {number} lon - Observer longitude in decimal degrees
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<{
 *   temperature: number,
 *   windSpeed: number,
 *   weatherCode: number,
 *   condition: string,
 *   emoji: string
 * } | null>}
 */
export async function fetchWeather(lat, lon, signal) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('current', 'temperature_2m,wind_speed_10m,weather_code')

    const res = await fetch(url.toString(), { signal })

    if (!res.ok) {
      return null
    }

    const json = await res.json()
    const current = json?.current

    if (!current) {
      return null
    }

    const tempC = current.temperature_2m
    const windKph = current.wind_speed_10m
    const weatherCode = current.weather_code

    if (tempC == null || windKph == null || weatherCode == null) {
      return null
    }

    // Convert units
    const temperature = Math.round(tempC * 9 / 5 + 32)           // °C → °F
    const windSpeed = Math.round(windKph * 0.621371)              // km/h → mph

    const { condition, emoji } = decodeWmoCode(weatherCode)

    return { temperature, windSpeed, weatherCode, condition, emoji }
  } catch (err) {
    // Swallow AbortError and network errors — never throw
    if (err?.name === 'AbortError') {
      return null
    }
    console.warn('[weather] fetchWeather failed:', err)
    return null
  }
}
