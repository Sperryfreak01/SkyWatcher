import { createContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'skywatcher-settings'

const defaults = {
  observer: { lat: null, lon: null, elev: null, obstructionAngle: 14.2 },
  homeObserver: null,
  fieldModeEnabled: false,
  theme: 'auto',
  chartVariant: 'classic',
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
}

export const SettingsContext = createContext(defaults)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
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
  const captureHomeObserver = useCallback(() => {
    setSettings(prev => {
      if (prev.homeObserver !== null) return prev
      if (prev.observer.lat === null) return prev
      return { ...prev, homeObserver: { ...prev.observer } }
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings, updateObserver, captureHomeObserver }}>
      {children}
    </SettingsContext.Provider>
  )
}
