// SkyCharts.jsx — three sky chart style variants
// All render an alt-az (azimuth/elevation) view. Aircraft at az=110°, el=42°.

const SKY = {
  ink: 'var(--ink)',
  mute: 'var(--mute)',
  line: 'var(--line)',
  soft: 'var(--soft)',
  acc1: 'var(--acc1)', // sky blue — aircraft
  acc2: 'var(--acc2)', // amber — alert/you-are-here
  bg: 'var(--bg)',
};

// polar -> cartesian (az in deg, r in 0..1 from center)
function polar(az, r, cx, cy, R) {
  const rad = ((az - 90) * Math.PI) / 180;
  return [cx + Math.cos(rad) * r * R, cy + Math.sin(rad) * r * R];
}

// ───────────────────────── Variant A: Classic polar compass
function SkyChartClassic({ size = 280, az = 110, el = 42, label = true }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 14;
  // elevation: 90° at center, 0° at rim. r = 1 - el/90
  const r = 1 - el / 90;
  const [px, py] = polar(az, r, cx, cy, R);
  const rings = [0, 30, 60]; // elevation rings
  const cardinals = [
    { a: 0, l: 'N' }, { a: 90, l: 'E' }, { a: 180, l: 'S' }, { a: 270, l: 'W' },
  ];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block' }}>
      {/* rings */}
      {rings.map((deg) => {
        const rr = (1 - deg / 90) * R;
        return <circle key={deg} cx={cx} cy={cy} r={rr}
          fill="none" stroke={SKY.line} strokeWidth="1" strokeDasharray={deg === 0 ? '0' : '2 3'} />;
      })}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={SKY.ink} strokeWidth="1.5" />
      {/* crosshairs */}
      {[0, 45, 90, 135].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * R, y1 = cy + Math.sin(rad) * R;
        const x2 = cx - Math.cos(rad) * R, y2 = cy - Math.sin(rad) * R;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={SKY.soft} strokeWidth="0.75" />;
      })}
      {/* cardinals */}
      {cardinals.map(({ a, l }) => {
        const [tx, ty] = polar(a, 1.07, cx, cy, R);
        return <text key={l} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fontFamily="var(--mono)" fill={SKY.ink} fontWeight="600">{l}</text>;
      })}
      {/* elevation labels */}
      {rings.map((deg) => {
        if (deg === 0) return null;
        const rr = (1 - deg / 90) * R;
        return <text key={deg} x={cx + 4} y={cy - rr + 3} fontSize="9"
          fontFamily="var(--mono)" fill={SKY.mute}>{deg}°</text>;
      })}
      {/* aircraft */}
      <g>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={SKY.acc1} strokeWidth="1" strokeDasharray="2 2" />
        <circle cx={px} cy={py} r="7" fill={SKY.acc1} opacity="0.18" />
        <circle cx={px} cy={py} r="3.5" fill={SKY.acc1} />
        {label && (
          <text x={px + 9} y={py - 6} fontSize="10" fontFamily="var(--mono)" fill={SKY.ink}
            fontWeight="600">UAL482</text>
        )}
      </g>
      {/* center dot = you */}
      <circle cx={cx} cy={cy} r="2" fill={SKY.acc2} />
    </svg>
  );
}

// ───────────────────────── Variant B: Half-dome horizon (looking up)
function SkyChartDome({ size = 280, az = 110, el = 42 }) {
  const W = size, H = size * 0.62;
  const cx = W / 2, cy = H - 10, R = W / 2 - 14;
  // map az (0..360) to x across the dome arc; el to radius from horizon up
  // For dome: x = cx + cos(az_rad) * R (az measured from N going E), y = cy - sin(el) * R
  // Simpler: project onto dome as ellipse point
  const azRad = ((az - 180) * Math.PI) / 180; // center of dome faces S for demo
  const elRad = (el * Math.PI) / 180;
  const px = cx + Math.sin(azRad) * R * Math.cos(elRad);
  const py = cy - Math.sin(elRad) * R;
  const elRings = [30, 60];
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width={size} height={size * 0.68} style={{ display: 'block' }}>
      {/* horizon line */}
      <line x1="0" y1={cy} x2={W} y2={cy} stroke={SKY.ink} strokeWidth="1.5" />
      {/* dome outline */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke={SKY.ink} strokeWidth="1.5" />
      {/* elevation arcs */}
      {elRings.map((d) => {
        const rr = R * Math.cos((d * Math.PI) / 180);
        const hh = R * Math.sin((d * Math.PI) / 180);
        return (
          <ellipse key={d} cx={cx} cy={cy} rx={rr} ry={hh}
            fill="none" stroke={SKY.line} strokeDasharray="2 3" strokeWidth="1" />
        );
      })}
      {/* azimuth grid lines */}
      {[-60, -30, 0, 30, 60].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x = cx + Math.sin(rad) * R;
        return <line key={a} x1={cx} y1={cy} x2={x} y2={cy - Math.cos(rad) * R}
          stroke={SKY.soft} strokeWidth="0.75" />;
      })}
      {/* horizon labels */}
      <text x={cx - R} y={cy + 14} fontSize="10" fontFamily="var(--mono)" fill={SKY.ink} textAnchor="middle">E</text>
      <text x={cx} y={cy + 14} fontSize="10" fontFamily="var(--mono)" fill={SKY.ink} textAnchor="middle" fontWeight="600">S</text>
      <text x={cx + R} y={cy + 14} fontSize="10" fontFamily="var(--mono)" fill={SKY.ink} textAnchor="middle">W</text>
      {/* aircraft */}
      <circle cx={px} cy={py} r="8" fill={SKY.acc1} opacity="0.18" />
      <circle cx={px} cy={py} r="4" fill={SKY.acc1} />
      <text x={px + 8} y={py + 3} fontSize="10" fontFamily="var(--mono)" fill={SKY.ink} fontWeight="600">UAL482</text>
      {/* house silhouette */}
      <path d={`M 0 ${cy} L 0 ${cy - 10} L 30 ${cy - 18} L 60 ${cy - 10} L 60 ${cy} Z`}
        fill={SKY.soft} />
      <path d={`M ${W - 60} ${cy} L ${W - 60} ${cy - 8} L ${W - 30} ${cy - 14} L ${W} ${cy - 8} L ${W} ${cy} Z`}
        fill={SKY.soft} />
    </svg>
  );
}

// ───────────────────────── Variant C: Simplified arrow + gauge
function SkyChartArrow({ size = 280, az = 110, el = 42 }) {
  const W = size, H = size;
  const cx = W / 2, cy = H / 2 - 10;
  const arrowLen = 70;
  const rad = ((az - 90) * Math.PI) / 180;
  const ax = cx + Math.cos(rad) * arrowLen;
  const ay = cy + Math.sin(rad) * arrowLen;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size} style={{ display: 'block' }}>
      {/* compass ring */}
      <circle cx={cx} cy={cy} r={arrowLen + 18} fill="none" stroke={SKY.line} strokeWidth="1" />
      {/* cardinals */}
      {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([l, a]) => {
        const r = (a * Math.PI) / 180;
        const tx = cx + Math.sin(r) * (arrowLen + 30);
        const ty = cy - Math.cos(r) * (arrowLen + 30);
        return <text key={l} x={tx} y={ty} fontSize="11" fontFamily="var(--mono)"
          textAnchor="middle" dominantBaseline="middle" fill={SKY.mute} fontWeight="600">{l}</text>;
      })}
      {/* arrow */}
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={SKY.acc1} strokeWidth="3" strokeLinecap="round" />
      <circle cx={ax} cy={ay} r="6" fill={SKY.acc1} />
      <circle cx={cx} cy={cy} r="3" fill={SKY.acc2} />
      {/* azimuth readout */}
      <text x={cx} y={cy + arrowLen + 48} fontSize="14" fontFamily="var(--mono)"
        textAnchor="middle" fill={SKY.ink} fontWeight="600">AZ {az}°  ·  EL {el}°</text>
      {/* elevation gauge */}
      <g transform={`translate(${W - 42}, 20)`}>
        <rect x="0" y="0" width="24" height={H - 80} fill="none" stroke={SKY.line} />
        {[0, 30, 60, 90].map((d) => {
          const y = (H - 80) * (1 - d / 90);
          return (
            <g key={d}>
              <line x1="0" y1={y} x2="24" y2={y} stroke={SKY.line} strokeDasharray="1 2" />
              <text x="-4" y={y + 3} fontSize="8" fontFamily="var(--mono)"
                textAnchor="end" fill={SKY.mute}>{d}°</text>
            </g>
          );
        })}
        <rect x="2" y={(H - 80) * (1 - el / 90)} width="20"
          height={(H - 80) * (el / 90)} fill={SKY.acc1} opacity="0.6" />
      </g>
    </svg>
  );
}

Object.assign(window, { SkyChartClassic, SkyChartDome, SkyChartArrow });
