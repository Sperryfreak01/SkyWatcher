import { useState, useCallback } from 'react'

const SESSION_KEY = 'skywatcher-history'
const MAX_ENTRIES = 50

/**
 * Reads the history array from sessionStorage.
 * @returns {Array<{callsign: string, hex: string, operator: string, aircraftType: string, firstSeen: string, lastSeen: string}>}
 */
export function loadHistory() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Writes the history array to sessionStorage.
 * @param {Array} entries
 */
export function saveHistory(entries) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entries))
  } catch {
    // sessionStorage unavailable (private mode, quota exceeded) — silently skip
  }
}

/**
 * Pure function — returns a new entries array with the given aircraft added or updated.
 * @param {Array} entries - current history entries
 * @param {Object} aircraft - ADS-B + enrichment object with shape { hex, flight, operator, aircraft_type }
 * @returns {Array} updated entries (max 50)
 */
export function addToHistory(entries, aircraft) {
  if (!aircraft || !aircraft.hex) return entries

  const now = new Date().toISOString()
  const existingIndex = entries.findIndex(e => e.hex === aircraft.hex)

  if (existingIndex !== -1) {
    // Update lastSeen only, preserve firstSeen and all other fields
    const updated = [...entries]
    updated[existingIndex] = {
      ...updated[existingIndex],
      lastSeen: now,
    }
    return updated
  }

  // Prepend new entry
  const newEntry = {
    callsign: aircraft.flight ?? null,
    hex: aircraft.hex,
    operator: aircraft.operator ?? null,
    aircraftType: aircraft.aircraft_type ?? null,
    firstSeen: now,
    lastSeen: now,
  }

  return [newEntry, ...entries].slice(0, MAX_ENTRIES)
}

/**
 * React hook that manages the observation history, backed by sessionStorage.
 * @returns {{ history: Array, addEntry: (aircraft: Object) => void }}
 */
export function useHistory() {
  const [history, setHistory] = useState(() => loadHistory())

  const addEntry = useCallback((aircraft) => {
    setHistory(prev => {
      const next = addToHistory(prev, aircraft)
      saveHistory(next)
      return next
    })
  }, [])

  return { history, addEntry }
}
