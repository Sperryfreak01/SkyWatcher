import { createContext, useState, useEffect } from 'react'
import { useHistory } from '../lib/history'

export const AircraftContext = createContext({
  currentAircraft: null,
  visibleAircraft: [],
  history: [],
  pollingStatus: 'idle',
})

export function AircraftProvider({ children }) {
  const [currentAircraft, setCurrentAircraft] = useState(null)
  const [visibleAircraft, setVisibleAircraft] = useState([])
  const [pollingStatus, setPollingStatus] = useState('idle')

  const { history, addEntry } = useHistory()

  useEffect(() => {
    if (!currentAircraft) return
    addEntry(currentAircraft)
  }, [currentAircraft])

  return (
    <AircraftContext.Provider value={{
      currentAircraft, setCurrentAircraft,
      visibleAircraft, setVisibleAircraft,
      history,
      pollingStatus, setPollingStatus,
    }}>
      {children}
    </AircraftContext.Provider>
  )
}
