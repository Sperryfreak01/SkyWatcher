import { useContext, useState, useEffect, useRef } from 'react'
import { AircraftContext } from './contexts/AircraftContext'
import { SettingsContext } from './contexts/SettingsContext'
import { useAdsbPoller } from './lib/adsb'
import { useDeviceOrientation } from './lib/orientation'
import SkyChart from './components/SkyChart'
import WeatherPanel from './components/WeatherPanel'
import FirstRun from './components/FirstRun'
import IdentityPanel from './components/IdentityPanel/IdentityPanel'
import RoutePanel from './components/RoutePanel'
import TransponderPanel from './components/TransponderPanel'
import HistoryPanel from './components/HistoryPanel/HistoryPanel'
import StatusBar from './components/StatusBar/StatusBar'
import { useGeolocation, GEOLOCATION_FAILURE_THRESHOLD } from './lib/geolocation'

export default function App() {
  const { observer, updateObserver, captureHomeObserver } = useContext(SettingsContext)
  // null = checking, true = configured, false = needs first-run
  const [configured, setConfigured] = useState(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        const isConfigured = Boolean(cfg.lat && cfg.lon && cfg.adsbUrl)
        setConfigured(isConfigured)

        // If server is configured but local settings are empty, sync them.
        // This handles new browser sessions (incognito, separate device)
        // by inheriting the server's coordinates automatically.
        if (isConfigured && observer.lat === null) {
          updateObserver({
            lat: parseFloat(cfg.lat),
            lon: parseFloat(cfg.lon),
            elev: parseFloat(cfg.elev),
            obstructionAngle: parseFloat(cfg.obstructionAngle ?? 14.2),
          })
          captureHomeObserver()
        }
      })
      .catch(() => setConfigured(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function azToRelative(aircraftAz, userHeading) {
  const rel = (((aircraftAz - userHeading) % 360) + 360) % 360
  const dirs = ['Ahead', 'Ahead-Right', 'Right', 'Behind-Right', 'Behind', 'Behind-Left', 'Left', 'Ahead-Left']
  return dirs[Math.round(rel / 45) % 8]
}

function elToBand(el) {
  if (el >= 75) return 'Overhead'
  if (el >= 45) return 'High'
  if (el >= 20) return 'Mid'
  if (el >= 5) return 'Low'
  return 'Horizon'
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
  const orientation = useDeviceOrientation()
  const { heading, permissionState } = orientation
  // heading drives compass rotation in both Home and Field Mode — no change
  // needed here; Field Mode GPS position is handled via observer in context

  const { visibleAircraft, currentAircraft, pollingStatus } = useContext(AircraftContext)
  const { chartVariant, updateSettings, updateObserver, fieldModeEnabled, homeObserver } = useContext(SettingsContext)
  const geo = useGeolocation(fieldModeEnabled)

  useEffect(() => {
    if (fieldModeEnabled && geo.position) {
      updateObserver({
        lat: geo.position.lat,
        lon: geo.position.lon,
        elev: homeObserver?.elev ?? 0,
        obstructionAngle: homeObserver?.obstructionAngle ?? 14.2,
      })
    } else if (!fieldModeEnabled && homeObserver) {
      // homeObserver guard is intentional — null means first-run setup hasn't
      // completed yet, so there's nothing to restore
      updateObserver(homeObserver)
    }
  }, [fieldModeEnabled, geo.position, homeObserver, updateObserver])

  const hasWarnedRef = useRef(false)

  useEffect(() => {
    if (fieldModeEnabled && geo.consecutiveFailures >= GEOLOCATION_FAILURE_THRESHOLD) {
      if (!hasWarnedRef.current) {
        console.warn('[field-mode] GPS signal lost; reverting to Home Mode')
        hasWarnedRef.current = true
      }
      updateSettings({ fieldModeEnabled: false })
    }
  }, [fieldModeEnabled, geo.consecutiveFailures, updateSettings])

  const showWeather = visibleAircraft.length === 0 && pollingStatus === 'active'
  const variant = chartVariant || 'classic'
  const debugMode = new URLSearchParams(window.location.search).has('debug')

  return (
    <div className="app">
      <StatusBar orientation={orientation} />
      {debugMode && (
        <div style={{
          position: 'fixed', bottom: 12, left: 12, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', color: '#0f0', fontFamily: 'monospace',
          fontSize: 13, padding: '6px 10px', borderRadius: 4, pointerEvents: 'none'
        }}>
          heading: {Math.round(heading)}° | perm: {orientation.permissionState} | supported: {String(orientation.isSupported)}
        </div>
      )}

      {showWeather ? (
        <WeatherPanel />
      ) : (
        <div className="main">
          <div className="left-pane">
            <div className="corners-top">
              {geo.isSupported && !geo.isDenied && (
                <button
                  className={`mode-toggle${fieldModeEnabled ? ' active' : ''}`}
                  onClick={() => updateSettings({ fieldModeEnabled: !fieldModeEnabled })}
                >
                  {fieldModeEnabled ? 'Field' : 'Home'}
                </button>
              )}
              <div>
                <h2 className="section-title">Overhead now</h2>
                <div className="label">Where to look</div>
              </div>
              <div className="chart-toggle">
                <button
                  className={variant === 'classic' ? 'active' : ''}
                  onClick={() => updateSettings({ chartVariant: 'classic' })}
                  title="Classic: top-down polar compass view showing azimuth and elevation rings"
                >
                  Classic
                </button>
                <button
                  className={variant === 'dome' ? 'active' : ''}
                  onClick={() => updateSettings({ chartVariant: 'dome' })}
                  title="Dome: perspective projection showing the sky as a curved bowl"
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
                rotation={heading}
              />
            </div>

            <div className="bearing-strip">
              <div className="stat lg">
                <div className="stat-k" title="Azimuth: compass direction to the aircraft (0°=North, 90°=East, 180°=South)">Azimuth</div>
                <div className="stat-v accent mono">
                  {currentAircraft ? `${Math.round(currentAircraft.az)}°` : '—'}
                </div>
                <div className="stat-sub">
                  {currentAircraft
                    ? permissionState === 'granted'
                      ? azToRelative(currentAircraft.az, heading)
                      : azToCardinal(currentAircraft.az)
                    : ''}
                </div>
              </div>
              <div className="stat lg">
                <div className="stat-k">Elevation</div>
                <div className="stat-v accent mono">
                  {currentAircraft ? `${Math.round(currentAircraft.el)}°` : '—'}
                </div>
                <div className="stat-sub">
                  {currentAircraft ? elToBand(currentAircraft.el) : ''}
                </div>
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
