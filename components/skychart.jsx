// skychart.jsx — the hero sky chart (POLAR / DOME), Instrument-panel aesthetic.
// Renders aircraft position as az/el with smooth transitions.

function polar(az, r, cx, cy, R) {
  const rad = ((az - 90) * Math.PI) / 180;
  return [cx + Math.cos(rad) * r * R, cy + Math.sin(rad) * r * R];
}

// Curved aircraft-label text on path
function LabelArc({ cx, cy, r, text, id }) {
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <g>
      <path id={id} d={path} fill="none" />
      <text style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', fill: 'var(--mute)' }}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
      </text>
    </g>
  );
}

function ChartClassic({ size = 440, az = 110, el = 42, callsign = 'UAL482' }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 32;
  const r = 1 - el / 90;
  const [px, py] = polar(az, r, cx, cy, R);
  const rings = [0, 15, 30, 45, 60, 75];
  const cards = [
    { a: 0, l: 'N' }, { a: 45, l: 'NE' }, { a: 90, l: 'E' }, { a: 135, l: 'SE' },
    { a: 180, l: 'S' }, { a: 225, l: 'SW' }, { a: 270, l: 'W' }, { a: 315, l: 'NW' },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block', maxWidth: '100%' }}>
      <defs>
        <radialGradient id="sky-grad-c" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--surface)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--surface-2)" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#sky-grad-c)" stroke="var(--line)" strokeWidth="1" />
      {rings.map(deg => {
        if (deg === 0) return null;
        const rr = (1 - deg / 90) * R;
        return <circle key={deg} cx={cx} cy={cy} r={rr} fill="none" stroke="var(--line-2)" strokeWidth="0.75" strokeDasharray={deg % 30 === 0 ? '0' : '1.5 3'} />;
      })}
      {/* tick marks around rim */}
      {Array.from({ length: 72 }).map((_, i) => {
        const a = i * 5, big = a % 30 === 0, mid = a % 15 === 0;
        const rad = ((a - 90) * Math.PI) / 180;
        const r1 = big ? R - 10 : mid ? R - 6 : R - 3;
        const x1 = cx + Math.cos(rad) * r1, y1 = cy + Math.sin(rad) * r1;
        const x2 = cx + Math.cos(rad) * R, y2 = cy + Math.sin(rad) * R;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--mute-2)" strokeWidth={big ? 1 : 0.5} />;
      })}
      {/* crosshairs — subtle */}
      {[0, 90].map(a => {
        const rad = (a * Math.PI) / 180;
        return <line key={a} x1={cx + Math.cos(rad) * R} y1={cy + Math.sin(rad) * R}
          x2={cx - Math.cos(rad) * R} y2={cy - Math.sin(rad) * R}
          stroke="var(--line-2)" strokeWidth="0.75" />;
      })}
      {/* elevation labels */}
      {[30, 60].map(deg => {
        const rr = (1 - deg / 90) * R;
        return <text key={deg} x={cx + 5} y={cy - rr + 3} style={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--mute-2)', letterSpacing: '0.05em' }}>{deg}°</text>;
      })}
      {/* cardinal letters */}
      {cards.map(({ a, l }) => {
        const [tx, ty] = polar(a, 1.08, cx, cy, R);
        const isCardinal = ['N', 'E', 'S', 'W'].includes(l);
        return <text key={l} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
          style={{
            fontSize: isCardinal ? 13 : 10,
            fontFamily: 'var(--mono)',
            fill: isCardinal ? 'var(--ink)' : 'var(--mute)',
            fontWeight: isCardinal ? 700 : 500,
            letterSpacing: '0.08em',
          }}>{l}</text>;
      })}
      {/* zenith marker */}
      <circle cx={cx} cy={cy} r="2.5" fill="var(--acc-2)" />
      <circle cx={cx} cy={cy} r="5" fill="none" stroke="var(--acc-2)" strokeWidth="0.75" strokeDasharray="1 1.5" />
      {/* sight line */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--acc)" strokeWidth="1" strokeDasharray="3 3" style={{ transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
      {/* aircraft pulse */}
      <circle cx={px} cy={py} r="14" fill="var(--acc)" opacity="0.18"
        style={{ animation: 'sw-aircraft-pulse 2s cubic-bezier(0.4,0,0.2,1) infinite', transition: 'cx 1s cubic-bezier(0.22, 1, 0.36, 1), cy 1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
      <circle cx={px} cy={py} r="5" fill="var(--acc)"
        style={{ transition: 'cx 1s cubic-bezier(0.22, 1, 0.36, 1), cy 1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
      <circle cx={px} cy={py} r="2" fill="var(--surface)"
        style={{ transition: 'cx 1s cubic-bezier(0.22, 1, 0.36, 1), cy 1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
      {/* callsign label */}
      <text x={px + 12} y={py - 10}
        style={{ fontSize: 11, fontFamily: 'var(--mono)', fill: 'var(--ink)', fontWeight: 700, letterSpacing: '0.05em', transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)' }}>{callsign}</text>
      <text x={px + 12} y={py + 2}
        style={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--mute)', letterSpacing: '0.05em', transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)' }}>AZ {Math.round(az)}° · EL {Math.round(el)}°</text>
    </svg>
  );
}

function ChartDome({ size = 440, az = 110, el = 42, callsign = 'UAL482' }) {
  const W = size, H = size * 0.7;
  const cx = W / 2, cy = H - 18, R = W / 2 - 32;
  // Project az onto dome centered on S (180). Works for any az 0-360 via horizontal offset.
  const azRad = ((az - 180) * Math.PI) / 180;
  const elRad = (el * Math.PI) / 180;
  const px = cx + Math.sin(azRad) * R * Math.cos(elRad);
  const py = cy - Math.sin(elRad) * R;

  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} width={size} height={size * 0.78} style={{ display: 'block', maxWidth: '100%' }}>
      <defs>
        <linearGradient id="dome-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--surface-2)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--surface)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill="url(#dome-grad)" stroke="var(--line)" strokeWidth="1" />
      {/* elevation arcs */}
      {[15, 30, 45, 60, 75].map(d => {
        const rr = R * Math.cos((d * Math.PI) / 180);
        const hh = R * Math.sin((d * Math.PI) / 180);
        return <ellipse key={d} cx={cx} cy={cy} rx={rr} ry={hh}
          fill="none" stroke="var(--line-2)" strokeDasharray={d % 30 === 0 ? '0' : '1.5 3'} strokeWidth="0.75" />;
      })}
      {/* azimuth lines */}
      {[-90, -60, -30, 0, 30, 60, 90].map(a => {
        const rad = (a * Math.PI) / 180;
        const x = cx + Math.sin(rad) * R;
        const y = cy - Math.cos(rad) * R;
        return <line key={a} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-2)" strokeWidth="0.5" />;
      })}
      {/* horizon ground */}
      <line x1="0" y1={cy} x2={W} y2={cy} stroke="var(--ink)" strokeWidth="1.25" />
      {/* house silhouettes */}
      <path d={`M 0 ${cy} L 0 ${cy - 8} L 22 ${cy - 14} L 44 ${cy - 8} L 44 ${cy} Z`} fill="var(--line)" opacity="0.9" />
      <path d={`M 60 ${cy} L 60 ${cy - 6} L 80 ${cy - 10} L 100 ${cy - 6} L 100 ${cy} Z`} fill="var(--line)" opacity="0.9" />
      <path d={`M ${W - 90} ${cy} L ${W - 90} ${cy - 6} L ${W - 70} ${cy - 11} L ${W - 50} ${cy - 6} L ${W - 50} ${cy} Z`} fill="var(--line)" opacity="0.9" />
      <path d={`M ${W - 40} ${cy} L ${W - 40} ${cy - 10} L ${W - 18} ${cy - 16} L ${W} ${cy - 10} L ${W} ${cy} Z`} fill="var(--line)" opacity="0.9" />
      {/* horizon labels */}
      {[['E', cx - R], ['SE', cx - R * 0.7], ['S', cx], ['SW', cx + R * 0.7], ['W', cx + R]].map(([l, x], i) => {
        const main = l.length === 1;
        return <text key={i} x={x} y={cy + 16} textAnchor="middle"
          style={{ fontSize: main ? 13 : 10, fontFamily: 'var(--mono)', fill: main ? 'var(--ink)' : 'var(--mute)', fontWeight: main ? 700 : 500, letterSpacing: '0.08em' }}>{l}</text>;
      })}
      {/* elevation tick */}
      <text x={cx + 4} y={cy - R * 0.5 + 3} style={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--mute-2)' }}>30°</text>
      <text x={cx + 4} y={cy - R * 0.866 + 3} style={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--mute-2)' }}>60°</text>
      {/* aircraft */}
      <circle cx={px} cy={py} r="16" fill="var(--acc)" opacity="0.18"
        style={{ animation: 'sw-aircraft-pulse 2s var(--ease) infinite', transition: 'cx 1s var(--ease-out), cy 1s var(--ease-out)' }} />
      <circle cx={px} cy={py} r="5.5" fill="var(--acc)"
        style={{ transition: 'cx 1s var(--ease-out), cy 1s var(--ease-out)' }} />
      <circle cx={px} cy={py} r="2" fill="var(--surface)"
        style={{ transition: 'cx 1s var(--ease-out), cy 1s var(--ease-out)' }} />
      <text x={px + 12} y={py - 8}
        style={{ fontSize: 11, fontFamily: 'var(--mono)', fill: 'var(--ink)', fontWeight: 700, letterSpacing: '0.05em', transition: 'all 1s var(--ease-out)' }}>{callsign}</text>
      <text x={px + 12} y={py + 4}
        style={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--mute)', transition: 'all 1s var(--ease-out)' }}>{Math.round(el)}° up</text>
    </svg>
  );
}

function SkyChart({ style = 'classic', size = 440, az, el, callsign }) {
  const Comp = style === 'dome' ? ChartDome : ChartClassic;
  return <Comp size={size} az={az} el={el} callsign={callsign} />;
}

Object.assign(window, { SkyChart, ChartClassic, ChartDome });
