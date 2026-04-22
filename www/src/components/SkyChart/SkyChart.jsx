import { useState, useEffect } from 'react'
import { useMonotonicRotation } from '../../lib/rotation'

// Props: { aircraft: Array<{az, el, hex, callsign, distance3d, track}>, variant: 'classic'|'dome', loading: bool, rotation: number, compassActive: bool }
export default function SkyChart({ aircraft = [], variant = 'classic', loading = false, rotation = 0, compassActive = false }) {
  if (loading) {
    return <LoadingSweep />
  }

  if (aircraft.length === 0) {
    return <EmptyChart variant={variant} rotation={rotation} compassActive={compassActive} />
  }

  return variant === 'dome' ? (
    <DomeChart aircraft={aircraft} rotation={rotation} compassActive={compassActive} />
  ) : (
    <ClassicChart aircraft={aircraft} rotation={rotation} compassActive={compassActive} />
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
function ClassicChart({ aircraft, rotation = 0, compassActive = false }) {
  const cards = [
    { a: 0, l: 'N' }, { a: 45, l: 'NE' }, { a: 90, l: 'E' }, { a: 135, l: 'SE' },
    { a: 180, l: 'S' }, { a: 225, l: 'SW' }, { a: 270, l: 'W' }, { a: 315, l: 'NW' },
  ]
  const displayRot = useMonotonicRotation(rotation)

  return (
    <svg
      className="sky-chart sky-chart--classic"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <g style={{ transform: `rotate(${displayRot}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.5s ease' }}>
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
          const labelY = CY - rr + 2
          return (
            <g key={deg}>
              <rect x={CX - 10} y={CY - rr - 6} width="20" height="10" fill="var(--surface)"
                transform={`rotate(${-displayRot}, ${CX}, ${labelY})`} />
              <text
                x={CX} y={labelY}
                textAnchor="middle"
                transform={`rotate(${-displayRot}, ${CX}, ${labelY})`}
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
              transform={`rotate(${-displayRot}, ${tx}, ${ty + 3})`}
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
              track={ac.track}
              isPrimary={isPrimary}
              rotation={-displayRot}
            />
          )
        })}
      </g>
      {compassActive && <ViewingWedge cx={CX} cy={CY} r={R} />}
    </svg>
  )
}

// ─── Dome chart (visual tweak: darker toward edges, radial gradient) ─────────
function DomeChart({ aircraft, rotation = 0, compassActive = false }) {
  const cards = [
    { a: 0, l: 'N' }, { a: 45, l: 'NE' }, { a: 90, l: 'E' }, { a: 135, l: 'SE' },
    { a: 180, l: 'S' }, { a: 225, l: 'SW' }, { a: 270, l: 'W' }, { a: 315, l: 'NW' },
  ]
  const displayRot = useMonotonicRotation(rotation)

  return (
    <svg
      className="sky-chart sky-chart--dome"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <g style={{ transform: `rotate(${displayRot}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.5s ease' }}>
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
          const labelY = CY - rr + 2
          return (
            <g key={deg}>
              <rect x={CX - 10} y={CY - rr - 6} width="20" height="10" fill="var(--surface)"
                transform={`rotate(${-displayRot}, ${CX}, ${labelY})`} />
              <text
                x={CX} y={labelY}
                textAnchor="middle"
                transform={`rotate(${-displayRot}, ${CX}, ${labelY})`}
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
              transform={`rotate(${-displayRot}, ${tx}, ${ty + 3})`}
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
              track={ac.track}
              isPrimary={isPrimary}
              rotation={-displayRot}
            />
          )
        })}
      </g>
      {compassActive && <ViewingWedge cx={CX} cy={CY} r={R} />}
    </svg>
  )
}

// ─── Aircraft marker sub-component ──────────────────────────────────────────
function AircraftMarker({ px, py, callsign, track, isPrimary, rotation = 0 }) {
  const transition = 'cx 0.5s ease, cy 0.5s ease'
  const labelW = (callsign ? callsign.length * 7 + 10 : 50)

  // Chevron points in direction of travel (track degrees true, 0=North CW).
  // rotation counter-rotates to stay oriented with true North in chart space.
  const hasTrack = track != null
  const chevronRot = hasTrack ? (track + rotation) : rotation

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

      {/* Direction-of-travel chevron — rotated to match track */}
      {isPrimary && hasTrack && (
        <g transform={`translate(${px}, ${py}) rotate(${chevronRot})`}>
          <path
            d="M 0 -11 L -5 -3 L 0 -6 L 5 -3 Z"
            fill="var(--acc)"
            opacity="0.9"
          />
        </g>
      )}

      {/* Callsign label tag */}
      {callsign && (
        <g
          className="sky-chart__callsign"
          transform={`translate(${px + 10}, ${py - 12}) rotate(${rotation}, ${labelW / 2}, 7)`}
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
    </g>
  )
}

// ─── Viewing-angle wedge overlay ─────────────────────────────────────────────
// Draws a 120° wedge centered on az=0 (North/up) in the rotating chart group.
// Because the parent <g> already rotates by the compass heading, this wedge
// always visually points in the direction the user is facing.
function ViewingWedge({ cx, cy, r }) {
  const halfAngle = 60 // degrees — 120° total FOV
  const startRad = (-halfAngle * Math.PI) / 180
  const endRad = (halfAngle * Math.PI) / 180

  // Arc on the sky-disk rim; tip at center.
  // azimuth 0 = North = -Y axis in SVG, so angles are measured from -Y.
  const x1 = cx + r * Math.sin(startRad)
  const y1 = cy - r * Math.cos(startRad)
  const x2 = cx + r * Math.sin(endRad)
  const y2 = cy - r * Math.cos(endRad)

  const wedgePath = [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 0 1 ${x2} ${y2}`,
    'Z',
  ].join(' ')

  return (
    <g className="sky-chart__fov-wedge">
      <defs>
        <radialGradient id="sc-fov-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      <path
        d={wedgePath}
        fill="url(#sc-fov-grad)"
        stroke="var(--acc)"
        strokeWidth="0.75"
        strokeOpacity="0.25"
        strokeLinejoin="round"
      />
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
function EmptyChart({ variant, rotation = 0, compassActive = false }) {
  const chartClass = `sky-chart sky-chart--${variant} sky-chart--empty`
  const displayRot = useMonotonicRotation(rotation)

  return (
    <svg
      className={chartClass}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <g style={{ transform: `rotate(${displayRot}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.5s ease' }}>
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
              transform={`rotate(${-displayRot}, ${tx}, ${ty + 3})`}
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
          transform={`rotate(${-displayRot}, ${CX}, ${CY + 20})`}
          style={{
            fontSize: 11,
            fontFamily: 'var(--mono)',
            fill: 'var(--mute)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >No aircraft</text>
      </g>
      {compassActive && <ViewingWedge cx={CX} cy={CY} r={R} />}
    </svg>
  )
}
