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

function CompassIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l2 5-2 5-2-5 2-5z" fill="currentColor" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
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

function OrientationToggle({ orientation }) {
  const { isSupported, permissionState, requestPermission } = orientation

  if (!isSupported) return null

  return (
    <button
      className={`orientation-btn ${permissionState === 'granted' ? 'active' : ''}`}
      onClick={requestPermission}
      title="Enable Compass"
      style={{
        width: 28, height: 24, border: '1px solid var(--line)',
        background: permissionState === 'granted' ? 'var(--ink)' : 'var(--surface-2)',
        color: permissionState === 'granted' ? 'var(--surface)' : 'var(--mute)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 3, cursor: 'pointer', padding: 0
      }}
    >
      <CompassIcon />
    </button>
  )
}

export default function StatusBar({ orientation }) {
  const { visibleAircraft, pollingStatus, quota } = useContext(AircraftContext)

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
        {quota && (() => {
          const limit = quota.softLimit ?? quota.limit
          const pct = limit > 0 ? quota.used / limit : 0
          if (pct >= 1) {
            return (
              <span className="quota-badge" style={{ color: 'var(--warn)' }}
                title={`FlightAware quota full (${quota.used}/${limit} calls used today)`}>
                FA quota full
              </span>
            )
          }
          if (pct >= 0.8) {
            return (
              <span className="quota-badge" style={{ color: 'var(--warn)' }}
                title={`FlightAware quota low (${quota.used}/${limit} calls used today)`}>
                FA quota low
              </span>
            )
          }
          return (
            <span className="quota-badge"
              title={`FlightAware enrichment active (${quota.used}/${limit} calls used today)`}>
              FA
            </span>
          )
        })()}
      </div>

      <div className="statusbar-right">
        <OrientationToggle orientation={orientation} />
        <ThemeToggle />
      </div>
    </div>
  )
}
