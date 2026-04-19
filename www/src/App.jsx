import { useContext, useState, useEffect } from 'react'
import { AircraftContext } from './contexts/AircraftContext'
import { SettingsContext } from './contexts/SettingsContext'
import { useAdsbPoller } from './lib/adsb'
import SkyChart from './components/SkyChart'
import WeatherPanel from './components/WeatherPanel'
import FirstRun from './components/FirstRun'
import IdentityPanel from './components/IdentityPanel/IdentityPanel'
import RoutePanel from './components/RoutePanel'
import TransponderPanel from './components/TransponderPanel'
import HistoryPanel from './components/HistoryPanel/HistoryPanel'
import StatusBar from './components/StatusBar/StatusBar'

export default function App() {
  // null = checking, true = configured, false = needs first-run
  const [configured, setConfigured] = useState(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => setConfigured(Boolean(cfg.lat && cfg.lon && cfg.adsbUrl)))
      .catch(() => setConfigured(false))
  }, [])

  if (configured === null) return null

  if (!configured) {
    return <FirstRun onComplete={() => setConfigured(true)} />
  }

  return <AppShell />
}

function azToCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

function formatDistanceNm(m) {
  if (m == null) return '—'
  return `${(m / 1852).toFixed(1)} nm`
}

function formatDistanceKm(m) {
  if (m == null) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function AppShell() {
  useAdsbPoller()

  const { visibleAircraft, currentAircraft, pollingStatus } = useContext(AircraftContext)
  const { chartVariant, updateSettings } = useContext(SettingsContext)

  const showWeather = visibleAircraft.length === 0 && pollingStatus === 'active'
  const variant = chartVariant || 'classic'

  return (
    <div className="app">
      <StatusBar />

      {showWeather ? (
        <WeatherPanel />
      ) : (
        <div className="main">
          <div className="left-pane">
            <div className="corners-top">
              <div>
                <h2 className="section-title">Overhead now</h2>
                <div className="label">Where to look</div>
              </div>
              <div className="chart-toggle">
                <button
                  className={variant === 'classic' ? 'active' : ''}
                  onClick={() => updateSettings({ chartVariant: 'classic' })}
                >
                  Classic
                </button>
                <button
                  className={variant === 'dome' ? 'active' : ''}
                  onClick={() => updateSettings({ chartVariant: 'dome' })}
                >
                  Dome
                </button>
              </div>
            </div>

            <div className="chart-wrap">
              <SkyChart
                aircraft={visibleAircraft}
                variant={variant}
                loading={pollingStatus === 'idle'}
              />
            </div>

            <div className="bearing-strip">
              <div className="stat lg">
                <div className="stat-k">Azimuth</div>
                <div className="stat-v accent mono">
                  {currentAircraft ? `${Math.round(currentAircraft.az)}°` : '—'}
                </div>
                <div className="stat-sub">
                  {currentAircraft ? azToCardinal(currentAircraft.az) : ''}
                </div>
              </div>
              <div className="stat lg">
                <div className="stat-k">Elevation</div>
                <div className="stat-v accent mono">
                  {currentAircraft ? `${Math.round(currentAircraft.el)}°` : '—'}
                </div>
                <div className="stat-sub">up from horizon</div>
              </div>
              <div className="stat lg">
                <div className="stat-k">Distance</div>
                <div className="stat-v mono">
                  {currentAircraft ? formatDistanceNm(currentAircraft.distance3d) : '—'}
                </div>
                <div className="stat-sub">
                  {currentAircraft ? formatDistanceKm(currentAircraft.distance3d) : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="right-pane">
            <IdentityPanel />
            <RoutePanel />
            <TransponderPanel />
            <HistoryPanel />
          </div>
        </div>
      )}
    </div>
  )
}
