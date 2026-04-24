import { createContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'skywatcher-settings'

const defaults = {
  observer: { lat: null, lon: null, elev: null, obstructionAngle: 14.2 },
  homeObserver: null,
  workObserver: null,
  locationMode: 'home', // 'home' | 'work' | 'field'
  theme: 'auto',
  chartVariant: 'classic',
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? JSON.parse(raw) : null
    const settings = { ...defaults, ...(stored ?? {}) }

    // Back-compat: migrate legacy fieldModeEnabled → locationMode
    if (stored && stored.locationMode === undefined) {
      settings.locationMode = stored.fieldModeEnabled === true ? 'field' : 'home'
    }

    // No stored mode preference + Tesla browser → default to field mode
    const noStoredMode = !stored || stored.locationMode === undefined
    if (noStoredMode && navigator.userAgent.toLowerCase().includes('tesla')) {
      settings.locationMode = 'field'
    }

    // workObserver is never persisted — always hydrated from the server on load
    settings.workObserver = null

    return settings
  } catch {
    return defaults
  }
}

export const SettingsContext = createContext(defaults)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    // Persist everything except workObserver (server-sourced, not user-editable)
    const { workObserver: _w, ...persistable } = settings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
  }, [settings])

  useEffect(() => {
    const el = document.documentElement
    if (settings.theme === 'auto') {
      el.removeAttribute('data-theme')
    } else {
      el.setAttribute('data-theme', settings.theme)
    }
  }, [settings.theme])

  const updateSettings = useCallback((patch) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  const updateObserver = useCallback((patch) => {
    setSettings(prev => ({
      ...prev,
      observer: { ...prev.observer, ...patch },
    }))
  }, [])

  // Set once on initial server sync — never overwritten after that.
  const captureHomeObserver = useCallback((explicitHome = null) => {
    setSettings(prev => {
      if (prev.homeObserver !== null) return prev
      if (explicitHome && explicitHome.lat !== null) {
        return { ...prev, homeObserver: { ...explicitHome } }
      }
      if (prev.observer.lat === null) return prev
      return { ...prev, homeObserver: { ...prev.observer } }
    })
  }, [])

  // Accept a full work observer object from /api/config. No-ops when null.
  const updateWorkObserver = useCallback((workObserver) => {
    setSettings(prev => ({ ...prev, workObserver }))
  }, [])

  // Derive fieldModeEnabled so existing consumers need no changes
  const fieldModeEnabled = settings.locationMode === 'field'

  return (
    <SettingsContext.Provider value={{
      ...settings,
      fieldModeEnabled,
      updateSettings,
      updateObserver,
      captureHomeObserver,
      updateWorkObserver,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}
