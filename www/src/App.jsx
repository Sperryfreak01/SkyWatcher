import { useContext } from 'react'
import { AircraftContext } from './contexts/AircraftContext'
import { SettingsContext } from './contexts/SettingsContext'

export default function App() {
  const { pollingStatus } = useContext(AircraftContext)
  const { theme } = useContext(SettingsContext)

  return (
    <div className="app" data-theme={theme === 'auto' ? undefined : theme}>
      <p>SkyWatcher loading… (status: {pollingStatus})</p>
    </div>
  )
}
