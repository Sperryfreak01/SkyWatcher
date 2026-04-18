import { useContext, useState } from 'react'
import { AircraftContext } from './contexts/AircraftContext'
import { SettingsContext } from './contexts/SettingsContext'
import { useAdsbPoller } from './lib/adsb'
import SkyChart from './components/SkyChart'
import WeatherPanel from './components/WeatherPanel'
import FirstRun from './components/FirstRun'

export default function App() {
  const configured = localStorage.getItem('skywatcher-configured') === 'true'
  const [showFirstRun, setShowFirstRun] = useState(!configured)

  if (showFirstRun) {
    return <FirstRun onComplete={() => setShowFirstRun(false)} />
  }

  return <AppShell />
}

function AppShell() {
  useAdsbPoller()

  const { visibleAircraft, pollingStatus } = useContext(AircraftContext)
  const { theme } = useContext(SettingsContext)

  const showWeather = visibleAircraft.length === 0 && pollingStatus === 'active'

  return (
    <div className="app" data-theme={theme === 'auto' ? undefined : theme}>
      {showWeather ? (
        <WeatherPanel />
      ) : (
        <div style={{ width: 300, height: 300 }}>
          <SkyChart
            aircraft={visibleAircraft}
            variant="classic"
            loading={pollingStatus === 'idle'}
          />
        </div>
      )}
    </div>
  )
}
