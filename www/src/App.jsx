import { useContext } from 'react'
import { AircraftContext } from './contexts/AircraftContext'
import { SettingsContext } from './contexts/SettingsContext'
import { useAdsbPoller } from './lib/adsb'
import SkyChart from './components/SkyChart'

export default function App() {
  useAdsbPoller()

  const { currentAircraft, visibleAircraft, pollingStatus } = useContext(AircraftContext)
  const { theme } = useContext(SettingsContext)

  return (
    <div className="app" data-theme={theme === 'auto' ? undefined : theme}>
      <div style={{ width: 300, height: 300 }}>
        <SkyChart
          aircraft={visibleAircraft}
          variant="classic"
          loading={pollingStatus === 'idle'}
        />
      </div>
    </div>
  )
}
