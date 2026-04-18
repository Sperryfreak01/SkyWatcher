import { useContext, useState } from 'react'
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
  const configured = localStorage.getItem('skywatcher-configured') === 'true'
  const [showFirstRun, setShowFirstRun] = useState(!configured)

  if (showFirstRun) {
    return <FirstRun onComplete={() => setShowFirstRun(false)} />
  }

  return <AppShell />
}

function formatDistance(m) {
  if (m == null) return '—'
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
              <div />
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
              <div className="stat">
                <div className="stat-k">AZ</div>
                <div className="stat-v sm accent">
                  {currentAircraft ? `${Math.round(currentAircraft.az)}°` : '—'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-k">EL</div>
                <div className="stat-v sm accent">
                  {currentAircraft ? `${Math.round(currentAircraft.el)}°` : '—'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-k">DIST</div>
                <div className="stat-v sm">
                  {currentAircraft ? formatDistance(currentAircraft.distance3d) : '—'}
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
