// DEPLOY_FORCE_BUILD_2026_04_22_1800
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
import EngineRoom from './components/EngineRoom/EngineRoom'
import { useGeolocation, GEOLOCATION_FAILURE_THRESHOLD } from './lib/geolocation'
import { fmtDist } from './lib/units'

export default function App() {
  const { observer, updateObserver, captureHomeObserver, updateWorkObserver, locationMode, updateSettings } = useContext(SettingsContext)
  // null = checking, true = configured, false = needs first-run
  const [configured, setConfigured] = useState(null)

  useAdsbPoller()

  const debugMode = new URLSearchParams(window.location.search).has('debug')

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        const isConfigured = Boolean(cfg.lat && cfg.lon && cfg.adsbUrl)
        setConfigured(isConfigured)

        if (isConfigured && observer.lat === null) {
          updateObserver({
            lat: parseFloat(cfg.lat),
            lon: parseFloat(cfg.lon),
            elev: parseFloat(cfg.elev),
            obstructionAngle: parseFloat(cfg.obstructionAngle ?? 14.2),
          })
          captureHomeObserver()
        }

        if (cfg.workLat && cfg.workLon && cfg.workElev) {
          updateWorkObserver({
            lat: parseFloat(cfg.workLat),
            lon: parseFloat(cfg.workLon),
            elev: parseFloat(cfg.workElev),
            obstructionAngle: parseFloat(cfg.obstructionAngle ?? 14.2),
          })
        } else {
          updateWorkObserver(null)
          if (locationMode === 'work') {
            updateSettings({ locationMode: 'home' })
          }
        }
      })
      .catch(() => setConfigured(false))
  }, [])

  if (debugMode) {
    return (
      <div className="app is-debug">
        <EngineRoom />
      </div>
    )
  }

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

function AppShell() {
  const orientation = useDeviceOrientation()
  const { heading, permissionState } = orientation

  const { visibleAircraft, currentAircraft, setCurrentAircraft, pollingStatus } = useContext(AircraftContext)
  const { chartVariant, updateSettings, updateObserver, locationMode, homeObserver, workObserver } = useContext(SettingsContext)
  const fieldModeEnabled = locationMode === 'field'
  const geo = useGeolocation(fieldModeEnabled)

  useEffect(() => {
    if (!homeObserver) return

    if (locationMode === 'field' && geo.position) {
      updateObserver({
        lat: geo.position.lat,
        lon: geo.position.lon,
        elev: homeObserver.elev ?? 0,
        obstructionAngle: homeObserver.obstructionAngle ?? 14.2,
      })
    } else if (locationMode === 'work' && workObserver) {
      updateObserver(workObserver)
    } else if (locationMode === 'home') {
      updateObserver(homeObserver)
    }
  }, [locationMode, geo.position, homeObserver, workObserver, updateObserver])

  const hasWarnedRef = useRef(false)

  useEffect(() => {
    if (locationMode === 'field' && geo.consecutiveFailures >= GEOLOCATION_FAILURE_THRESHOLD) {
      if (!hasWarnedRef.current) {
        console.warn('[field-mode] GPS signal lost; reverting to Home Mode')
        hasWarnedRef.current = true
      }
      updateSettings({ locationMode: 'home' })
    }
  }, [locationMode, geo.consecutiveFailures, updateSettings])

  const showWeather = visibleAircraft.length === 0 && pollingStatus === 'active'
  const variant = chartVariant || 'classic'

  return (
    <div className="app">
      <StatusBar orientation={orientation} />

      {showWeather ? (
        <WeatherPanel />
      ) : (
        <div className="main">
          <div className="left-pane">
            <div className="corners-top">
              <div className="mode-selector">
                <button
                  className={locationMode === 'home' ? 'active' : ''}
                  onClick={() => updateSettings({ locationMode: 'home' })}
                >
                  Home
                </button>
                <button
                  className={locationMode === 'work' ? 'active' : ''}
                  disabled={!workObserver}
                  onClick={() => updateSettings({ locationMode: 'work' })}
                >
                  Work
                </button>
                {geo.isSupported && !geo.isDenied && (
                  <button
                    className={locationMode === 'field' ? 'active' : ''}
                    onClick={() => updateSettings({ locationMode: 'field' })}
                  >
                    Field
                  </button>
                )}
              </div>
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
                variant={variant}
                loading={pollingStatus === 'idle'}
                rotation={heading}
                compassActive={permissionState === 'granted'}
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
                  {currentAircraft ? fmtDist(currentAircraft.distance3d) : '—'}
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
