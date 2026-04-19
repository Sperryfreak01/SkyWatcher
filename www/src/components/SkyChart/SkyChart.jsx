import { useState, useEffect } from 'react'

// Props: { aircraft: Array<{az, el, hex, callsign, distance3d}>, variant: 'classic'|'dome', loading: bool, rotation: number }
export default function SkyChart({ aircraft = [], variant = 'classic', loading = false, rotation = 0 }) {
  if (loading) {
    return <LoadingSweep />
  }

  if (aircraft.length === 0) {
    return <EmptyChart variant={variant} rotation={rotation} />
  }

  return variant === 'dome' ? (
    <DomeChart aircraft={aircraft} rotation={rotation} />
  ) : (
    <ClassicChart aircraft={aircraft} rotation={rotation} />
  )
}

// ─── Shared constants ───────────────────────────────────────────────────────
const VIEW = 300
const CX = VIEW / 2
const CY = VIEW / 2
// r_max leaves ~18px for cardinal labels (placed at R+16)
const R = 120

// Maps az (0=North, clockwise) + el (0=horizon, 90=zenith) to SVG coords
function azElToXY(az, el, cx, cy, r) {
  const rr = r * (1 - el / 90)
  const rad = (az * Math.PI) / 180
  const x = cx + rr * Math.sin(rad)
  const y = cy - rr * Math.cos(rad)
  return [x, y]
}

// ─── Classic polar chart ─────────────────────────────────────────────────────
function ClassicChart({ aircraft, rotation = 0 }) {
  const cards = [
    { a: 0, l: 'N' }, { a: 45, l: 'NE' }, { a: 90, l: 'E' }, { a: 135, l: 'SE' },
    { a: 180, l: 'S' }, { a: 225, l: 'SW' }, { a: 270, l: 'W' }, { a: 315, l: 'NW' },
  ]

  return (
    <svg
      className="sky-chart sky-chart--classic"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.5s ease' }}>
        <defs>
          <radialGradient id="sc-classic-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
          </radialGradient>
        </defs>

        {/* Sky disk */}
        <circle cx={CX} cy={CY} r={R} fill="url(#sc-classic-bg)" stroke="var(--line)" strokeWidth="1" />

        {/* Elevation rings at 30° and 60° — dashed */}
        {[30, 60].map((deg) => {
          const rr = R * (1 - deg / 90)
          return (
            <circle
              key={deg}
              cx={CX} cy={CY} r={rr}
              fill="none"
              stroke="var(--line-2)"
              strokeWidth="0.75"
              strokeDasharray="3 4"
            />
          )
        })}

        {/* Tick marks around rim */}
        {Array.from({ length: 36 }, (_, i) => i * 10).map((a) => {
          const rad = (a * Math.PI) / 180
          const long = a % 30 === 0
          const r1 = R - (long ? 8 : 4)
          const x1 = CX + Math.sin(rad) * r1
          const y1 = CY - Math.cos(rad) * r1
          const x2 = CX + Math.sin(rad) * R
          const y2 = CY - Math.cos(rad) * R
          return (
            <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--mute-2)" strokeWidth={long ? 1 : 0.5} opacity={long ? 0.7 : 0.4} />
          )
        })}

        {/* Cross-hair lines (N-S and E-W axes) — dashed */}
        {[0, 90].map((a) => {
          const rad = (a * Math.PI) / 180
          return (
            <line key={a}
              x1={CX + Math.sin(rad) * R} y1={CY - Math.cos(rad) * R}
              x2={CX - Math.sin(rad) * R} y2={CY + Math.cos(rad) * R}
              stroke="var(--line-2)" strokeWidth="0.75" strokeDasharray="2 4"
            />
          )
        })}

        {/* Elevation labels */}
        {[30, 60].map((deg) => {
          const rr = R * (1 - deg / 90)
          return (
            <g key={deg}>
              <rect x={CX - 10} y={CY - rr - 6} width="20" height="10" fill="var(--surface)" />
              <text
                x={CX} y={CY - rr + 2}
                textAnchor="middle"
                style={{ fontSize: 8, fontFamily: 'var(--mono)', fill: 'var(--mute-2)', letterSpacing: '0.05em' }}
              >{deg}°</text>
            </g>
          )
        })}

        {/* Cardinal labels */}
        {cards.map(({ a, l }) => {
          const [tx, ty] = azElToXY(a, 0, CX, CY, R + 16)
          const isMajor = l.length === 1
          return (
            <text
              key={l}
              x={tx} y={ty + 3}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: isMajor ? 11 : 9,
                fontFamily: 'var(--mono)',
                fill: isMajor ? 'var(--ink-2)' : 'var(--mute)',
                fontWeight: isMajor ? 700 : 500,
                letterSpacing: '0.08em',
              }}
            >{l}</text>
          )
        })}

        {/* Center zenith marker */}
        <circle cx={CX} cy={CY} r="3" fill="var(--ink)" />
        <circle cx={CX} cy={CY} r="7" fill="none" stroke="var(--ink)" strokeWidth="0.5" opacity="0.4" />

        {/* Aircraft: render all, closest (index 0) gets primary accent */}
        {aircraft.map((ac, i) => {
          const [px, py] = azElToXY(ac.az, ac.el, CX, CY, R)
          const isPrimary = i === 0
          return (
            <AircraftMarker
              key={ac.hex || ac.callsign || i}
              px={px} py={py}
              callsign={ac.callsign}
              az={ac.az} el={ac.el}
              isPrimary={isPrimary}
            />
          )
        })}
      </g>
    </svg>
  )
}

// ─── Dome chart (visual tweak: darker toward edges, radial gradient) ─────────
function DomeChart({ aircraft, rotation = 0 }) {
  const cards = [
    { a: 0, l: 'N' }, { a: 45, l: 'NE' }, { a: 90, l: 'E' }, { a: 135, l: 'SE' },
    { a: 180, l: 'S' }, { a: 225, l: 'SW' }, { a: 270, l: 'W' }, { a: 315, l: 'NW' },
  ]

  return (
    <svg
      className="sky-chart sky-chart--dome"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.5s ease' }}>
        <defs>
          <radialGradient id="sc-dome-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="75%" stopColor="var(--surface-2)" />
            <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.9" />
          </radialGradient>
          {/* Dome overlay: darker at horizon (edge), lighter at zenith (center) */}
          <radialGradient id="sc-dome-overlay" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="transparent" stopOpacity="0" />
            <stop offset="70%" stopColor="var(--bg)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.32" />
          </radialGradient>
        </defs>

        {/* Sky disk */}
        <circle cx={CX} cy={CY} r={R} fill="url(#sc-dome-bg)" stroke="var(--line)" strokeWidth="1.25" />
        {/* Dome depth overlay */}
        <circle cx={CX} cy={CY} r={R} fill="url(#sc-dome-overlay)" />

        {/* Elevation rings at 30° and 60° — dashed */}
        {[30, 60].map((deg) => {
          const rr = R * (1 - deg / 90)
          return (
            <circle
              key={deg}
              cx={CX} cy={CY} r={rr}
              fill="none"
              stroke="var(--line-2)"
              strokeWidth="0.75"
              strokeDasharray="3 4"
            />
          )
        })}

        {/* Cross-hair lines — dashed */}
        {[0, 90].map((a) => {
          const rad = (a * Math.PI) / 180
          return (
            <line key={a}
              x1={CX + Math.sin(rad) * R} y1={CY - Math.cos(rad) * R}
              x2={CX - Math.sin(rad) * R} y2={CY + Math.cos(rad) * R}
              stroke="var(--line-2)" strokeWidth="0.75" strokeDasharray="2 4"
            />
          )
        })}

        {/* Elevation labels */}
        {[30, 60].map((deg) => {
          const rr = R * (1 - deg / 90)
          return (
            <g key={deg}>
              <rect x={CX - 10} y={CY - rr - 6} width="20" height="10" fill="var(--surface)" />
              <text
                x={CX} y={CY - rr + 2}
                textAnchor="middle"
                style={{ fontSize: 8, fontFamily: 'var(--mono)', fill: 'var(--mute-2)', letterSpacing: '0.05em' }}
              >{deg}°</text>
            </g>
          )
        })}

        {/* Cardinal labels */}
        {cards.map(({ a, l }) => {
          const [tx, ty] = azElToXY(a, 0, CX, CY, R + 16)
          const isMajor = l.length === 1
          return (
            <text
              key={l}
              x={tx} y={ty + 3}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: isMajor ? 11 : 9,
                fontFamily: 'var(--mono)',
                fill: isMajor ? 'var(--ink-2)' : 'var(--mute)',
                fontWeight: isMajor ? 700 : 500,
                letterSpacing: '0.08em',
              }}
            >{l}</text>
          )
        })}

        {/* Center zenith marker */}
        <circle cx={CX} cy={CY} r="3" fill="var(--ink)" />
        <circle cx={CX} cy={CY} r="7" fill="none" stroke="var(--ink)" strokeWidth="0.5" opacity="0.4" />

        {/* Aircraft */}
        {aircraft.map((ac, i) => {
          const [px, py] = azElToXY(ac.az, ac.el, CX, CY, R)
          const isPrimary = i === 0
          return (
            <AircraftMarker
              key={ac.hex || ac.callsign || i}
              px={px} py={py}
              callsign={ac.callsign}
              az={ac.az} el={ac.el}
              isPrimary={isPrimary}
            />
          )
        })}
      </g>
    </svg>
  )
}

// ─── Aircraft marker sub-component ──────────────────────────────────────────
function AircraftMarker({ px, py, callsign, az, el, isPrimary }) {
  const transition = 'cx 0.5s ease, cy 0.5s ease'
  const labelW = (callsign ? callsign.length * 7 + 10 : 50)

  return (
    <g className="sky-chart__aircraft">
      {/* Sight line from center */}
      {isPrimary && (
        <line
          x1={CX} y1={CY} x2={px} y2={py}
          stroke="var(--acc)" strokeWidth="1" strokeDasharray="3 3"
          opacity="0.5"
        />
      )}

      {/* Pulse glow */}
      <circle
        cx={px} cy={py} r={isPrimary ? 14 : 10}
        fill="var(--acc)"
        opacity={isPrimary ? 0.18 : 0.1}
        style={{ transition }}
      />

      {/* Aircraft dot */}
      <circle
        cx={px} cy={py} r={isPrimary ? 6 : 4}
        fill="var(--acc)"
        opacity={isPrimary ? 1 : 0.6}
        style={{ transition }}
      />

      {/* Inner dot */}
      <circle
        cx={px} cy={py} r={isPrimary ? 2.5 : 1.5}
        fill="var(--surface)"
        style={{ transition }}
      />

      {/* Callsign label tag */}
      {callsign && (
        <g
          className="sky-chart__callsign"
          transform={`translate(${px + 10}, ${py - 12})`}
          style={{ transition: 'transform 0.5s ease' }}
        >
          <rect
            x="0" y="0"
            width={labelW} height="14"
            fill="var(--surface)"
            stroke="var(--acc)"
            strokeWidth={isPrimary ? 0.75 : 0.5}
            opacity={isPrimary ? 1 : 0.7}
          />
          <text
            x="5" y="10"
            style={{
              fontSize: 9,
              fontFamily: 'var(--mono)',
              fill: isPrimary ? 'var(--ink)' : 'var(--ink-2)',
              fontWeight: isPrimary ? 700 : 500,
              letterSpacing: '0.05em',
            }}
          >{callsign}</text>
        </g>
      )}

      {/* AZ/EL sub-label for primary aircraft */}
      {isPrimary && (
        <text
          x={px + 10} y={py + 15}
          style={{
            fontSize: 8,
            fontFamily: 'var(--mono)',
            fill: 'var(--mute)',
            letterSpacing: '0.05em',
          }}
        >AZ {Math.round(az)}° · EL {Math.round(el)}°</text>
      )}
    </g>
  )
}

// ─── Loading sweep animation ─────────────────────────────────────────────────
function LoadingSweep() {
  const [t, setT] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      setT(((now - start) / 3000) % 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const sweep = t * 360
  const size = VIEW
  const cx = size / 2, cy = size / 2
  // r_max same as chart R so it looks consistent
  const r = R

  return (
    <svg
      className="sky-chart sky-chart--loading"
      width="100%"
      height="100%"
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="sc-load-bg">
          <stop offset="0%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--surface-2)" />
        </radialGradient>
        <linearGradient id="sc-sweep-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--acc)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Sky disk */}
      <circle cx={cx} cy={cy} r={r} fill="url(#sc-load-bg)" stroke="var(--line)" strokeWidth="1" />

      {/* Elevation rings */}
      {[30, 60].map((d) => {
        const rr = r * (1 - d / 90)
        return (
          <circle key={d} cx={cx} cy={cy} r={rr}
            fill="none" stroke="var(--line)" strokeDasharray="1 3" strokeWidth="0.75" />
        )
      })}

      {/* Cardinal labels */}
      {['N', 'E', 'S', 'W'].map((l, i) => {
        const a = i * 90
        const [tx, ty] = azElToXY(a, 0, cx, cy, r + 16)
        return (
          <text key={l} x={tx} y={ty + 3} textAnchor="middle"
            style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, fill: 'var(--mute)' }}
          >{l}</text>
        )
      })}

      {/* Rotating sweep — starts pointing East (0°) then rotates clockwise */}
      <g transform={`rotate(${sweep} ${cx} ${cy})`}>
        <path
          d={`M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx + r * Math.cos(-Math.PI / 4)} ${cy + r * Math.sin(-Math.PI / 4)} Z`}
          fill="url(#sc-sweep-grad)"
        />
        <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="var(--acc)" strokeWidth="1.5" />
      </g>

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="3" fill="var(--ink)" />
    </svg>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyChart({ variant, rotation = 0 }) {
  const chartClass = `sky-chart sky-chart--${variant} sky-chart--empty`

  return (
    <svg
      className={chartClass}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.5s ease' }}>
        <defs>
          <radialGradient id="sc-empty-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
          </radialGradient>
        </defs>

        {/* Sky disk */}
        <circle cx={CX} cy={CY} r={R} fill="url(#sc-empty-bg)" stroke="var(--line)" strokeWidth="1" />

        {/* Elevation rings */}
        {[30, 60].map((deg) => {
          const rr = R * (1 - deg / 90)
          return (
            <circle key={deg} cx={CX} cy={CY} r={rr}
              fill="none" stroke="var(--line-2)" strokeWidth="0.75" strokeDasharray="3 4" />
          )
        })}

        {/* Cross-hairs */}
        {[0, 90].map((a) => {
          const rad = (a * Math.PI) / 180
          return (
            <line key={a}
              x1={CX + Math.sin(rad) * R} y1={CY - Math.cos(rad) * R}
              x2={CX - Math.sin(rad) * R} y2={CY + Math.cos(rad) * R}
              stroke="var(--line-2)" strokeWidth="0.75" strokeDasharray="2 4"
            />
          )
        })}

        {/* Cardinal labels */}
        {['N', 'E', 'S', 'W'].map((l, i) => {
          const a = i * 90
          const [tx, ty] = azElToXY(a, 0, CX, CY, R + 16)
          return (
            <text key={l} x={tx} y={ty + 3} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 11, fontFamily: 'var(--mono)', fill: 'var(--ink-2)', fontWeight: 700 }}
            >{l}</text>
          )
        })}

        {/* Center */}
        <circle cx={CX} cy={CY} r="3" fill="var(--ink)" opacity="0.3" />

        {/* No aircraft text */}
        <text
          x={CX} y={CY + 20}
          textAnchor="middle"
          style={{
            fontSize: 11,
            fontFamily: 'var(--mono)',
            fill: 'var(--mute)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >No aircraft</text>
      </g>
    </svg>
  )
}
