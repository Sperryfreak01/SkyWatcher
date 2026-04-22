import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'

/**
 * HistoryPanel — horizontally scrolling strip of recent overhead observations.
 * Data is sourced from AircraftContext.history (managed by useHistory hook).
 */
export default function HistoryPanel() {
  const { history, currentAircraft, setCurrentAircraft, visibleAircraft } = useContext(AircraftContext)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label">Recent overhead</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>
          {history.length} flight{history.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="history no-sb" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {history.length === 0 && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute-2)', padding: '8px 2px' }}>
            No observations yet this session.
          </div>
        )}
        {history.map((entry) => {
          const isActive = currentAircraft?.hex === entry.hex
          const liveAircraft = visibleAircraft.find(a => a.hex === entry.hex)
          const isLive = Boolean(liveAircraft)

          const handleSelect = () => {
            if (liveAircraft) setCurrentAircraft(liveAircraft)
          }

          return (
            <div
              key={entry.hex}
              role="button"
              tabIndex={isLive ? 0 : -1}
              className={`hist-card${isActive ? ' active' : ''}`}
              onClick={handleSelect}
              onKeyDown={(e) => {
                if (isLive && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleSelect()
                }
              }}
              style={{
                flex: '0 0 auto',
                minWidth: 118,
                padding: '8px 10px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderLeft: `2px solid ${isActive ? 'var(--acc)' : 'var(--line)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                opacity: isLive ? 1 : 0.5,
                cursor: isLive ? 'pointer' : 'default',
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--acc)' : 'var(--ink)' }}
              >
                {entry.callsign ?? entry.hex}
              </div>
              {entry.aircraftType && (
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.05em' }}>
                  {entry.aircraftType}
                </div>
              )}
              {entry.operator && (
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute-2)' }}>
                  {entry.operator}
                </div>
              )}
              <div className="mono" style={{ fontSize: 9, color: 'var(--mute-2)' }}>
                {new Date(entry.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
