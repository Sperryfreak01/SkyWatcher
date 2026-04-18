import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsProvider } from './contexts/SettingsContext'
import { AircraftProvider } from './contexts/AircraftContext'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <AircraftProvider>
        <App />
      </AircraftProvider>
    </SettingsProvider>
  </StrictMode>
)
