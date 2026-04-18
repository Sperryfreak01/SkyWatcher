import { createContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'skywatcher-settings'

const defaults = {
  observer: { lat: null, lon: null, elev: null, obstructionAngle: 14.2 },
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

  function updateSettings(patch) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  function updateObserver(patch) {
    setSettings(prev => ({
      ...prev,
      observer: { ...prev.observer, ...patch },
    }))
  }

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings, updateObserver }}>
      {children}
    </SettingsContext.Provider>
  )
}
