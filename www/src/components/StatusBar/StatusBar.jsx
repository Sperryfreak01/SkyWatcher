import { useContext, useEffect, useState } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'
import { SettingsContext } from '../../contexts/SettingsContext'
import { getQuota } from '../../lib/enrichment'

function LiveDot() {
  return <span className="live-dot" />
}

function PollRing() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5" fill="none" stroke="var(--line)" strokeWidth="1.25" />
      <circle
        cx="7" cy="7" r="5"
        fill="none" stroke="var(--pos)" strokeWidth="1.25"
        strokeDasharray="31.4" strokeDashoffset="7.85" strokeLinecap="round"
        transform="rotate(-90 7 7)"
      >
        <animate attributeName="stroke-dashoffset" from="31.4" to="0" dur="10s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function ThemeToggle({ theme, setTheme }) {
  const opts = [
    {
      k: 'light',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
        </svg>
      ),
    },
    {
      k: 'auto',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18" />
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 0 0 18" fill="currentColor" />
        </svg>
      ),
    },
    {
      k: 'dark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ),
    },
  ]
  return (
    <div className="theme-toggle">
      {opts.map((o) => (
        <button
          key={o.k}
          className={theme === o.k ? 'active' : ''}
          onClick={() => setTheme(o.k)}
          aria-label={o.k}
          title={o.k}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}

function formatLocation(lat, lon) {
  if (lat == null || lon == null) return null
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`
}

function formatAge(ts) {
  if (!ts) return null
  const secs = Math.round((Date.now() - ts) / 1000)
  if (secs < 60) return `updated ${secs}s ago`
  const mins = Math.round(secs / 60)
  return `updated ${mins}m ago`
}

export default function StatusBar() {
  const { visibleAircraft, pollingStatus, currentAircraft } = useContext(AircraftContext)
  const { observer, theme, updateSettings } = useContext(SettingsContext)

  const [lastUpdated, setLastUpdated] = useState(null)
  const [quota, setQuota] = useState(null)

  // Record timestamp whenever aircraft data changes
  useEffect(() => {
    if (pollingStatus === 'active' || currentAircraft) {
      setLastUpdated(Date.now())
    }
  }, [currentAircraft, visibleAircraft, pollingStatus])

  // Fetch quota once on mount
  useEffect(() => {
    getQuota().then((q) => {
      if (q) setQuota(q)
    })
  }, [])

  const location = formatLocation(observer?.lat, observer?.lon)
  const age = formatAge(lastUpdated)
  const centerParts = [location, age].filter(Boolean)

  const isError = pollingStatus === 'error'
  const isActive = pollingStatus === 'active'

  return (
    <div className="statusbar">
      <div className="statusbar-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
        </svg>
        <span className="name">Skywatcher</span>
      </div>

      <div className="statusbar-center">
        {centerParts.join(' · ')}
        {visibleAircraft.length > 0 && (
          <span style={{ marginLeft: centerParts.length ? 8 : 0 }}>
            {visibleAircraft.length} visible
          </span>
        )}
        {quota && (
          <span style={{ marginLeft: 8, color: 'var(--mute)' }}>
            · FA {quota.used}/{quota.limit}
          </span>
        )}
      </div>

      <div className="statusbar-right">
        {isError ? (
          <span
            className="poll-ring"
            style={{ color: 'var(--warn)' }}
            title="Polling error"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="5" fill="none" stroke="var(--warn)" strokeWidth="1.25" />
              <line x1="7" y1="4" x2="7" y2="8" stroke="var(--warn)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="10" r="0.75" fill="var(--warn)" />
            </svg>
            ERROR
          </span>
        ) : (
          <span className="poll-ring">
            <PollRing /> 10s
          </span>
        )}

        {isActive && (
          <span className="live-badge">
            <LiveDot /> LIVE
          </span>
        )}

        <ThemeToggle theme={theme} setTheme={(t) => updateSettings({ theme: t })} />
      </div>
    </div>
  )
}
