import { useContext, useEffect, useState } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'
import { SettingsContext } from '../../contexts/SettingsContext'
import { fetchWeather } from '../../lib/weather'

function timeAgo(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function WxTile({ label, value, unit, sub, accent }) {
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
      {sub && (
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.04em', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

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

export default function WeatherPanel() {
  const { observer } = useContext(SettingsContext)
  const { history, pollingStatus } = useContext(AircraftContext)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)

  const lastAircraft = history?.[0] ?? null

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
            Array.from({ length: 8 }, (_, i) => <SkeletonTile key={i} />)
          ) : weather ? (
            <>
              <WxTile
                label="Temperature"
                value={weather.temperature}
                unit="°F"
                sub={weather.apparentTemperature != null ? `feels like ${weather.apparentTemperature}°` : null}
              />
              <WxTile
                label="Sky"
                value={weather.condition}
                sub={weather.cloudCover != null ? `${weather.cloudCover}% cloud cover` : null}
                accent
              />
              <WxTile
                label="Wind"
                value={weather.windSpeed}
                unit="kts"
                sub={weather.windDirection}
              />
              <WxTile
                label="Visibility"
                value={weather.visibility != null ? weather.visibility : '—'}
                unit={weather.visibility != null ? 'mi' : null}
                sub={weather.visibility != null
                  ? (weather.visibility >= 9.9 ? 'unlimited' : weather.visibility >= 5 ? 'good' : weather.visibility >= 3 ? 'moderate' : 'poor')
                  : null}
              />
              <WxTile
                label="Dew point"
                value={weather.dewPoint != null ? weather.dewPoint : '—'}
                unit={weather.dewPoint != null ? '°F' : null}
                sub={weather.dewPoint != null
                  ? (weather.dewPoint < 50 ? 'dry' : weather.dewPoint < 60 ? 'comfortable' : weather.dewPoint < 65 ? 'somewhat humid' : 'humid')
                  : null}
              />
              <WxTile
                label="Pressure"
                value={weather.pressure != null ? weather.pressure : '—'}
                unit={weather.pressure != null ? 'inHg' : null}
                sub="steady"
              />
              <WxTile
                label="Sunset"
                value={weather.sunsetTime ?? '—'}
                unit={weather.sunsetAmpm}
                sub={weather.sunsetCountdown}
              />
              <WxTile
                label="Moon"
                value={weather.moonIllumination != null ? `${weather.moonIllumination}%` : '—'}
                sub={weather.moonPhaseName}
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

      <div className="empty-footer">
        <div>
          <div className="label">Last aircraft seen</div>
          {lastAircraft ? (
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
              {lastAircraft.callsign ?? lastAircraft.hex}
              <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 12 }}>
                {' '}· {timeAgo(lastAircraft.lastSeen)}
              </span>
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 12, marginTop: 4, color: 'var(--mute)' }}>none this session</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div className="label">Receiver</div>
          <div className="mono" style={{ fontSize: 12 }}>
            {pollingStatus === 'active'
              ? <span style={{ color: 'var(--pos)' }}>● active</span>
              : pollingStatus === 'error'
              ? <span style={{ color: 'var(--warn)' }}>● error</span>
              : <span style={{ color: 'var(--mute)' }}>● idle</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
