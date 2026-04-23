import { createContext, useState, useEffect } from 'react'
import { enrichAircraft, getQuota } from '../lib/enrichment'
import { useHistory } from '../lib/history'

export const AircraftContext = createContext({
  currentAircraft: null,
  visibleAircraft: [],
  allAircraft: [],
  history: [],
  pollingStatus: 'idle',
  enrichment: null,
  quota: null,
})

export function AircraftProvider({ children }) {
  const [currentAircraft, setCurrentAircraft] = useState(null)
  const [visibleAircraft, setVisibleAircraft] = useState([])
  const [allAircraft, setAllAircraft] = useState([])
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
      // Discard the sentinel so a skipped fetch doesn't clobber prior enrichment.
      if (result?.skipped) return
      setEnrichment(result)
      if (result && !result.error) getQuota().then(setQuota)
    })
    return () => { cancelled = true }
  }, [callsign])

  // Re-trigger enrichment when the tab becomes visible again so we catch up
  // on any callsign that was skipped while the tab was hidden.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (!callsign) return
      enrichAircraft(callsign).then((result) => {
        if (result?.skipped || result?.error) return
        setEnrichment(result)
        getQuota().then(setQuota)
      })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [callsign])

  return (
    <AircraftContext.Provider value={{
      currentAircraft, setCurrentAircraft,
      visibleAircraft, setVisibleAircraft,
      allAircraft, setAllAircraft,
      history,
      pollingStatus, setPollingStatus,
      enrichment,
      quota,
    }}>
      {children}
    </AircraftContext.Provider>
  )
}
