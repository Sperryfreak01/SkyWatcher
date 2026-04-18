import { createContext, useState, useEffect } from 'react'
import { enrichAircraft, getQuota } from '../lib/enrichment'
import { useHistory } from '../lib/history'

export const AircraftContext = createContext({
  currentAircraft: null,
  visibleAircraft: [],
  history: [],
  pollingStatus: 'idle',
  enrichment: null,
  quota: null,
})

export function AircraftProvider({ children }) {
  const [currentAircraft, setCurrentAircraft] = useState(null)
  const [visibleAircraft, setVisibleAircraft] = useState([])
  const [pollingStatus, setPollingStatus] = useState('idle')
  const [enrichment, setEnrichment] = useState(null)
  const [quota, setQuota] = useState(null)

  const { history, addEntry } = useHistory()

  useEffect(() => { getQuota().then(setQuota) }, [])

  useEffect(() => {
    if (!currentAircraft) return
    addEntry(currentAircraft)
  }, [currentAircraft])

  const callsign = currentAircraft?.flight?.trim() ?? null

  useEffect(() => {
    if (!callsign) { setEnrichment(null); return }
    let cancelled = false
    setEnrichment(null)
    enrichAircraft(callsign).then((result) => {
      if (cancelled) return
      setEnrichment(result)
      if (result && !result.error) getQuota().then(setQuota)
    })
    return () => { cancelled = true }
  }, [callsign])

  return (
    <AircraftContext.Provider value={{
      currentAircraft, setCurrentAircraft,
      visibleAircraft, setVisibleAircraft,
      history,
      pollingStatus, setPollingStatus,
      enrichment,
      quota,
    }}>
      {children}
    </AircraftContext.Provider>
  )
}
