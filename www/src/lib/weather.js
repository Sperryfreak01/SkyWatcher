/**
 * Weather utilities for SkyWatcher.
 * Fetches current conditions from Open-Meteo (free, no API key required).
 */

/** @type {Record<number, {condition: string, emoji: string}>} */
const WMO_MAP = {
  0:  { condition: 'Clear',        emoji: '\u2600\uFE0F' },
  1:  { condition: 'Mostly clear', emoji: '\uD83C\uDF24\uFE0F' },
  2:  { condition: 'Partly cloudy',emoji: '\u26C5' },
  3:  { condition: 'Overcast',     emoji: '\u2601\uFE0F' },
  45: { condition: 'Foggy',        emoji: '\uD83C\uDF2B\uFE0F' },
  48: { condition: 'Foggy',        emoji: '\uD83C\uDF2B\uFE0F' },
  51: { condition: 'Light drizzle',emoji: '\uD83C\uDF27\uFE0F' },
  53: { condition: 'Drizzle',      emoji: '\uD83C\uDF27\uFE0F' },
  55: { condition: 'Heavy drizzle',emoji: '\uD83C\uDF27\uFE0F' },
  61: { condition: 'Light rain',   emoji: '\uD83C\uDF27\uFE0F' },
  63: { condition: 'Rain',         emoji: '\uD83C\uDF27\uFE0F' },
  65: { condition: 'Heavy rain',   emoji: '\uD83C\uDF27\uFE0F' },
  71: { condition: 'Light snow',   emoji: '\uD83C\uDF28\uFE0F' },
  73: { condition: 'Snow',         emoji: '\uD83C\uDF28\uFE0F' },
  75: { condition: 'Heavy snow',   emoji: '\uD83C\uDF28\uFE0F' },
  77: { condition: 'Snow grains',  emoji: '\uD83C\uDF28\uFE0F' },
  80: { condition: 'Showers',      emoji: '\uD83C\uDF26\uFE0F' },
  81: { condition: 'Showers',      emoji: '\uD83C\uDF26\uFE0F' },
  82: { condition: 'Showers',      emoji: '\uD83C\uDF26\uFE0F' },
  95: { condition: 'Thunderstorm', emoji: '\u26C8\uFE0F' },
  96: { condition: 'Thunderstorm', emoji: '\u26C8\uFE0F' },
  99: { condition: 'Thunderstorm', emoji: '\u26C8\uFE0F' },
}

const DEFAULT_WMO = { condition: 'Unknown', emoji: '\uD83C\uDF21\uFE0F' }

const COMPASS_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
const COMPASS_NAMES = {
  N: 'north', NNE: 'north-northeast', NE: 'northeast', ENE: 'east-northeast',
  E: 'east', ESE: 'east-southeast', SE: 'southeast', SSE: 'south-southeast',
  S: 'south', SSW: 'south-southwest', SW: 'southwest', WSW: 'west-southwest',
  W: 'west', WNW: 'west-northwest', NW: 'northwest', NNW: 'north-northwest',
}

function compassFromDeg(deg) {
  const abbr = COMPASS_DIRS[Math.round(deg / 22.5) % 16]
  return `from the ${COMPASS_NAMES[abbr]}`
}

function dewPointComfort(dp) {
  if (dp < 50) return 'dry'
  if (dp < 60) return 'comfortable'
  if (dp < 65) return 'somewhat humid'
  return 'humid'
}

function visibilitySub(visMi) {
  if (visMi >= 9.9) return 'unlimited'
  if (visMi >= 5) return 'good'
  if (visMi >= 3) return 'moderate'
  return 'poor'
}

function sunsetFormat(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return { time: `${h12}:${String(m).padStart(2, '0')}`, ampm }
}

function sunsetCountdown(isoString) {
  if (!isoString) return null
  const diff = new Date(isoString) - Date.now()
  if (diff < 0) return 'passed'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
}

// Calculates lunar illumination (0–100) and phase name from a Date.
// Reference new moon: 2000-01-06T18:14:00Z, synodic month = 29.53058867 days.
function moonPhase(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z')
  const synodicMonth = 29.53058867
  const elapsed = (date - knownNewMoon) / 86400000
  const phase = ((elapsed % synodicMonth) + synodicMonth) % synodicMonth
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase / synodicMonth)) / 2 * 100)

  let name
  if (phase < 1.85)       name = 'new moon'
  else if (phase < 7.38)  name = 'waxing crescent'
  else if (phase < 9.22)  name = 'first quarter'
  else if (phase < 14.77) name = 'waxing gibbous'
  else if (phase < 16.61) name = 'full moon'
  else if (phase < 22.15) name = 'waning gibbous'
  else if (phase < 23.99) name = 'last quarter'
  else                    name = 'waning crescent'

  return { illumination, name }
}

/**
 * Fetch current weather from Open-Meteo for the given coordinates.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {AbortSignal} [signal]
 * @returns {Promise<object|null>}
 */
export async function fetchWeather(lat, lon, signal) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('current', [
      'temperature_2m',
      'apparent_temperature',
      'wind_speed_10m',
      'wind_direction_10m',
      'weather_code',
      'cloud_cover',
      'visibility',
      'dew_point_2m',
      'surface_pressure',
    ].join(','))
    url.searchParams.set('daily', 'sunset')
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('forecast_days', '1')

    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null

    const json = await res.json()
    const current = json?.current

    if (!current) return null

    const tempC          = current.temperature_2m
    const feelsC         = current.apparent_temperature
    const windKph        = current.wind_speed_10m
    const windDeg        = current.wind_direction_10m
    const weatherCode    = current.weather_code
    const cloudCoverPct  = current.cloud_cover
    const visM           = current.visibility
    const dewC           = current.dew_point_2m
    const pressHpa       = current.surface_pressure
    const sunsetISO      = json?.daily?.sunset?.[0] ?? null

    if (tempC == null || windKph == null || weatherCode == null) return null

    const temperature         = Math.round(tempC * 9 / 5 + 32)
    const apparentTemperature = feelsC != null ? Math.round(feelsC * 9 / 5 + 32) : null
    const windSpeedKts        = Math.round(windKph * 0.539957)
    const windDirection       = windDeg != null ? compassFromDeg(windDeg) : null
    const visMi               = visM != null ? Math.round(visM / 1609.34 * 10) / 10 : null
    const dewPoint            = dewC != null ? Math.round(dewC * 9 / 5 + 32) : null
    const pressureInHg        = pressHpa != null ? (pressHpa * 0.02953).toFixed(2) : null
    const sunsetInfo          = sunsetFormat(sunsetISO)
    const { condition, emoji } = WMO_MAP[weatherCode] ?? DEFAULT_WMO
    const { illumination: moonIllumination, name: moonPhaseName } = moonPhase(new Date())

    return {
      temperature,
      apparentTemperature,
      windSpeed: windSpeedKts,
      windDirection,
      weatherCode,
      condition,
      emoji,
      cloudCover: cloudCoverPct,
      visibility: visMi,
      dewPoint,
      pressure: pressureInHg,
      sunsetTime: sunsetInfo?.time ?? null,
      sunsetAmpm: sunsetInfo?.ampm ?? null,
      sunsetCountdown: sunsetCountdown(sunsetISO),
      moonIllumination,
      moonPhaseName,
    }
  } catch (err) {
    if (err?.name === 'AbortError') return null
    console.warn('[weather] fetchWeather failed:', err)
    return null
  }
}
