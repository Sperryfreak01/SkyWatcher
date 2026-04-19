import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'
import AircraftPhoto from './AircraftPhoto'

function statusColor(s) {
  const n = (s ?? '').toUpperCase().replace(/_/g, ' ')
  if (n === 'IN FLIGHT') return 'var(--pos)'
  if (n === 'CANCELLED' || n === 'DELAYED') return 'var(--warn)'
  return 'var(--mute)'
}

export default function IdentityPanel() {
  const { currentAircraft, enrichment } = useContext(AircraftContext)

  if (!currentAircraft) {
    return (
      <div className="identity-head" style={{ justifyContent: 'center', minHeight: 80, padding: '24px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: 4 }}>No aircraft selected</div>
          <div style={{ fontSize: 13, color: 'var(--mute)' }}>Waiting for signal…</div>
        </div>
      </div>
    )
  }

  const callsign = currentAircraft.flight?.trim() || currentAircraft.hex
  const registration = currentAircraft.registration || null
  const aircraftType = currentAircraft.aircraft_type || null
  const operator = currentAircraft.operator || null
  const status = enrichment?.status || null
  const metaParts = [operator, aircraftType].filter(Boolean)

  return (
    <div>
      <div className="label" style={{ marginBottom: 2 }}>Closest visible aircraft</div>
      <div className="identity-head">
        <div>
          <div className="cs">{callsign}</div>
          {metaParts.length > 0 && (
            <div className="meta">{metaParts.join(' · ')}</div>
          )}
          {registration && (
            <div className="meta" style={{ marginTop: 2, fontSize: 12 }}>{registration}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {status && (
            <span className="tag" style={{ background: statusColor(status) }}>
              {status.toUpperCase().replace(/_/g, ' ')}
            </span>
          )}
          <span className="icao">
            ICAO {currentAircraft.hex?.toUpperCase()}
            {registration && ` · ${registration}`}
          </span>
        </div>
      </div>

      {/* Photo slot — AircraftPhoto handles loading/empty/loaded states (Issue #7) */}
      <div style={{ marginTop: 12 }}>
        <AircraftPhoto hex={currentAircraft.hex} />
      </div>
    </div>
  )
}
