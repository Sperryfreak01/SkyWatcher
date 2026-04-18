import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'
import { SettingsContext } from '../../contexts/SettingsContext'

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
    </svg>
  )
}

function ThemeToggle() {
  const { theme, updateSettings } = useContext(SettingsContext)
  return (
    <div className="theme-toggle">
      {['auto', 'light', 'dark'].map(t => (
        <button
          key={t}
          className={theme === t ? 'active' : ''}
          onClick={() => updateSettings({ theme: t })}
          aria-label={t}
        >
          {t === 'auto' ? <AutoIcon /> : t === 'light' ? <SunIcon /> : <MoonIcon />}
        </button>
      ))}
    </div>
  )
}

export default function StatusBar() {
  const { visibleAircraft, pollingStatus } = useContext(AircraftContext)

  return (
    <div className="statusbar">
      <div className="statusbar-brand">
        <StarIcon />
        <span className="name serif">Skywatcher</span>
      </div>

      <div className="statusbar-center">
        {pollingStatus === 'active' && visibleAircraft.length > 0 && (
          <span className="live-badge">
            <span className="live-dot" />
            {visibleAircraft.length} AIRCRAFT VISIBLE
          </span>
        )}
        {pollingStatus === 'active' && visibleAircraft.length === 0 && (
          <span className="poll-ring">SCANNING…</span>
        )}
        {pollingStatus === 'idle' && (
          <span className="poll-ring">AWAITING CONFIG</span>
        )}
        {pollingStatus === 'error' && (
          <span className="poll-ring" style={{ color: 'var(--warn)' }}>RECEIVER ERROR</span>
        )}
      </div>

      <div className="statusbar-right">
        <ThemeToggle />
      </div>
    </div>
  )
}
