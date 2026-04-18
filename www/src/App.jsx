import { useContext } from 'react'
import { AircraftContext } from './contexts/AircraftContext'
import { SettingsContext } from './contexts/SettingsContext'
import { useAdsbPoller } from './lib/adsb'
import SkyChart from './components/SkyChart'
import StatusBar from './components/StatusBar'
import IdentityPanel from './components/IdentityPanel'
import RoutePanel from './components/RoutePanel'
import TransponderPanel from './components/TransponderPanel'
import HistoryPanel from './components/HistoryPanel'

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

function compassDir(az) {
  if (az == null) return ''
  return COMPASS[Math.round(az / 22.5) % 16]
}

function BearingStrip({ aircraft }) {
  if (!aircraft) return null
  const { az, el, distance3d } = aircraft
  const dir = compassDir(az)

  let distValue = '—'
  let distUnit = ''
  if (distance3d != null) {
    if (distance3d >= 10000) {
      distValue = (distance3d / 1000).toFixed(1)
      distUnit = 'km'
    } else {
      distValue = Math.round(distance3d).toLocaleString()
      distUnit = 'm'
    }
  }

  return (
    <div className="bearing-strip">
      <div className="stat lg">
        <span className="stat-k">Azimuth</span>
        <span className="stat-v accent mono">
          {az != null ? Math.round(az) : '—'}
          <span className="unit">°</span>
        </span>
        {dir && <span className="stat-sub">{dir}</span>}
      </div>
      <div className="stat lg">
        <span className="stat-k">Elevation</span>
        <span className="stat-v accent mono">
          {el != null ? Math.round(el) : '—'}
          <span className="unit">°</span>
        </span>
        <span className="stat-sub">up from horizon</span>
      </div>
      <div className="stat lg">
        <span className="stat-k">Distance</span>
        <span className="stat-v mono">
          {distValue}
          {distUnit && <span className="unit"> {distUnit}</span>}
        </span>
        <span className="stat-sub">line of sight</span>
      </div>
    </div>
  )
}

export default function App() {
  useAdsbPoller()

  const { currentAircraft, visibleAircraft, pollingStatus } = useContext(AircraftContext)
  const { theme, chartVariant } = useContext(SettingsContext)

  return (
    <div className="app" data-theme={theme === 'auto' ? undefined : theme}>
      <StatusBar />

      <div className="main">
        {/* Left pane — sky chart */}
        <div className="left-pane">
          <div className="corners-top">
            <div>
              <h2 className="section-title">Overhead now</h2>
              <div className="label" style={{ marginTop: 2 }}>Where to look</div>
            </div>
          </div>

          <div className="chart-wrap">
            <SkyChart
              aircraft={visibleAircraft}
              variant={chartVariant || 'classic'}
              loading={pollingStatus === 'idle'}
            />
          </div>

          <BearingStrip aircraft={currentAircraft} />
        </div>

        {/* Right pane — aircraft data */}
        <div className="right-pane no-sb">
          <IdentityPanel />
          <RoutePanel />
          <TransponderPanel />
          <div style={{ flex: 1, minHeight: 16 }} />
          <HistoryPanel />
        </div>
      </div>
    </div>
  )
}
