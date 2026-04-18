import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from '../../contexts/SettingsContext'
import { fetchWeather } from '../../lib/weather'

/**
 * A single weather data tile, matching the `.weather-tile` design pattern.
 *
 * @param {{ label: string, value: string|number, unit?: string, accent?: boolean }} props
 */
function WxTile({ label, value, unit, accent }) {
  return (
    <div className="weather-tile">
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: accent ? 'var(--acc)' : 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500, marginLeft: 3 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder tile shown while weather data is loading.
 */
function SkeletonTile() {
  return (
    <div className="weather-tile">
      <div
        style={{
          height: 10,
          width: '40%',
          background: 'var(--surface-2)',
          borderRadius: 2,
          marginBottom: 12,
          animation: 'photo-pulse 1.4s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: 32,
          width: '60%',
          background: 'var(--surface-2)',
          borderRadius: 2,
          animation: 'photo-pulse 1.4s ease-in-out infinite',
        }}
      />
    </div>
  )
}

/**
 * WeatherPanel — displayed in the empty state when no aircraft are visible.
 * Reads observer coordinates from SettingsContext and fetches live weather
 * from Open-Meteo.
 */
export default function WeatherPanel() {
  const { observer } = useContext(SettingsContext)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (observer?.lat == null) {
      setWeather(null)
      setLoading(false)
      return
    }

    const ac = new AbortController()
    setLoading(true)
    setWeather(null)

    fetchWeather(observer.lat, observer.lon, ac.signal).then(data => {
      setWeather(data)
      setLoading(false)
    })

    return () => ac.abort()
  }, [observer?.lat, observer?.lon])

  return (
    <div className="empty-wrap fade-in">
      <div className="empty-hero">
        <div className="label">No aircraft visible</div>
        <div className="h serif">Quiet skies overhead.</div>
        <div className="p">
          Checking your receiver every 10 seconds. Here&rsquo;s what&rsquo;s happening outside.
        </div>
      </div>

      {observer?.lat == null ? (
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--mute)',
            letterSpacing: '0.06em',
            padding: '24px 0',
          }}
        >
          Configure your location in settings
        </div>
      ) : (
        <div className="weather-grid">
          {loading ? (
            <>
              <SkeletonTile />
              <SkeletonTile />
              <SkeletonTile />
            </>
          ) : weather ? (
            <>
              <WxTile
                label="Temperature"
                value={weather.temperature}
                unit="\u00B0F"
              />
              <WxTile
                label="Sky"
                value={weather.emoji}
                accent
              />
              <WxTile
                label="Wind"
                value={weather.windSpeed}
                unit="mph"
              />
            </>
          ) : (
            <div
              className="weather-tile"
              style={{
                gridColumn: '1 / -1',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--mute)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Weather unavailable
            </div>
          )}
        </div>
      )}
    </div>
  )
}
