import { createContext, useState } from 'react'

export const AircraftContext = createContext({
  currentAircraft: null,
  visibleAircraft: [],
  history: [],
  pollingStatus: 'idle',
})

export function AircraftProvider({ children }) {
  const [currentAircraft, setCurrentAircraft] = useState(null)
  const [visibleAircraft, setVisibleAircraft] = useState([])
  const [history, setHistory] = useState([])
  const [pollingStatus, setPollingStatus] = useState('idle')

  return (
    <AircraftContext.Provider value={{
      currentAircraft, setCurrentAircraft,
      visibleAircraft, setVisibleAircraft,
      history, setHistory,
      pollingStatus, setPollingStatus,
    }}>
      {children}
    </AircraftContext.Provider>
  )
}
