import { createContext, useState, useEffect } from 'react'
import { enrichAircraft, getQuota } from '../lib/enrichment'

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
  const [history, setHistory] = useState([])
  const [pollingStatus, setPollingStatus] = useState('idle')
  const [enrichment, setEnrichment] = useState(null)
  const [quota, setQuota] = useState(null)

  // Fetch quota once on mount.
  useEffect(() => {
    getQuota().then(setQuota)
  }, [])

  // Enrich the current aircraft whenever its callsign changes.
  // Uses a cancellation flag to discard stale responses when the aircraft
  // changes while a previous fetch is still in flight.
  const callsign = currentAircraft?.flight?.trim() ?? null

  useEffect(() => {
    if (!callsign) {
      setEnrichment(null)
      return
    }

    let cancelled = false

    // Clear stale enrichment immediately so the UI does not show the previous
    // aircraft's data during the in-flight window.
    setEnrichment(null)

    enrichAircraft(callsign).then((result) => {
      if (cancelled) return
      setEnrichment(result)

      // Refresh quota only after a real (non-error, non-cached) network call.
      // We detect a real call by the absence of an `error` key — the cache path
      // returns data directly and quota is unaffected, but since we cannot
      // distinguish cache hit vs network hit here we refresh on every non-error
      // result.  This keeps quota fresh without burning extra API calls on
      // errors.
      if (result && !result.error) {
        getQuota().then(setQuota)
      }
    })

    return () => {
      cancelled = true
    }
  }, [callsign])

  return (
    <AircraftContext.Provider value={{
      currentAircraft, setCurrentAircraft,
      visibleAircraft, setVisibleAircraft,
      history, setHistory,
      pollingStatus, setPollingStatus,
      enrichment,
      quota,
    }}>
      {children}
    </AircraftContext.Provider>
  )
}
