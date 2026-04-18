// HiFiSkyChart.jsx — production-quality sky chart with toggle.
// Variants: 'polar' (compass) + 'dome' (horizon dome).
// Props: az, el (degrees); aircraftId; size; onStyleChange (optional)

function HiFiSkyChart({
  az = 110, el = 42, size = 360,
  style: variant = 'polar',
  onVariantChange,
  compact = false,
  history = [],
  label = 'UAL482',
  interactive = true,
}) {
  const W = size, H = size;
  return (
    <div style={{ width: W, maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label">Sky chart · alt-az</div>
        {interactive && (
          <ChartToggle value={variant} onChange={onVariantChange} />
        )}
      </div>
      <div style={{ position: 'relative', width: W, height: variant === 'dome' ? W * 0.66 : W, display: 'flex', justifyContent: 'center', alignItems: variant === 'dome' ? 'flex-end' : 'center' }}>
        {variant === 'polar'
          ? <HFPolar size={W} az={az} el={el} label={label} history={history} />
          : <HFDome size={W} az={az} el={el} label={label} />
        }
      </div>
    </div>
  );
}

function ChartToggle({ value = 'polar', onChange }) {
  const opts = [{ v: 'polar', l: 'Polar' }, { v: 'dome', l: 'Dome' }];
  return (
    <div role="tablist" style={{
      display: 'inline-flex', gap: 0,
      border: '1px solid var(--line)',
      padding: 2, background: 'var(--surface-2)',
      borderRadius: 3,
    }}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} role="tab" aria-selected={on}
            onClick={() => onChange && onChange(o.v)}
            className="mono"
            style={{
              padding: '4px 10px', fontSize: 10, letterSpacing: 0.08 + 'em',
              textTransform: 'uppercase', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--surface)' : 'var(--mute)',
              transition: 'all 0.18s var(--ease)',
              borderRadius: 2,
            }}>{o.l}</button>
        );
      })}
    </div>
  );
}

// ───── Polar (bird's-eye: center = zenith) ─────
function HFPolar({ size, az, el, label, history = [] }) {
  const cx = size / 2, cy = size / 2;
  const pad = 28;
  const R = size / 2 - pad;
  const r = 1 - el / 90;
  const aRad = ((az - 90) * Math.PI) / 180;
  const px = cx + Math.cos(aRad) * r * R;
  const py = cy + Math.sin(aRad) * r * R;

  // elevation rings
  const rings = [0, 15, 30, 45, 60, 75];
  const cards = [
    { a: 0, l: 'N' }, { a: 45, l: 'NE' }, { a: 90, l: 'E' }, { a: 135, l: 'SE' },
    { a: 180, l: 'S' }, { a: 225, l: 'SW' }, { a: 270, l: 'W' }, { a: 315, l: 'NW' },
  ];

  const polar2xy = (azd, eld) => {
    const rr = (1 - eld / 90) * R;
    const rad = ((azd - 90) * Math.PI) / 180;
    return [cx + Math.cos(rad) * rr, cy + Math.sin(rad) * rr];
  };

  // history trail
  const trail = history
    .map((h, i) => ({ ...h, o: Math.max(0.08, 0.6 - i * 0.07) }))
    .map((h) => ({ ...h, xy: polar2xy(h.az, h.el) }));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="hf-sky" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--surface-2)" />
        </radialGradient>
        <filter id="hf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* sky disk */}
      <circle cx={cx} cy={cy} r={R} fill="url(#hf-sky)" stroke="var(--line)" strokeWidth="1" />

      {/* elevation rings */}
      {rings.map((deg) => {
        const rr = (1 - deg / 90) * R;
        if (rr < 2) return null;
        const major = deg % 30 === 0;
        return (
          <circle key={deg} cx={cx} cy={cy} r={rr}
            fill="none" stroke="var(--line)"
            strokeWidth={major ? 1 : 0.5}
            strokeDasharray={major ? '0' : '1 3'}
            opacity={major ? 0.6 : 0.4}
          />
        );
      })}

      {/* fine tick marks every 10° around rim */}
      {Array.from({ length: 36 }, (_, i) => i * 10).map((a) => {
        const rad = ((a - 90) * Math.PI) / 180;
        const long = a % 30 === 0;
        const r1 = R - (long ? 8 : 4);
        const x1 = cx + Math.cos(rad) * r1, y1 = cy + Math.sin(rad) * r1;
        const x2 = cx + Math.cos(rad) * R, y2 = cy + Math.sin(rad) * R;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--ink-2)" strokeWidth={long ? 1 : 0.5} opacity={long ? 0.7 : 0.4} />;
      })}

      {/* cardinal cross */}
      {[0, 90].map((a) => {
        const rad = (a * Math.PI) / 180;
        return <line key={a}
          x1={cx - Math.sin(rad) * R} y1={cy - Math.cos(rad) * R}
          x2={cx + Math.sin(rad) * R} y2={cy + Math.cos(rad) * R}
          stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 4" />;
      })}

      {/* cardinal labels */}
      {cards.map(({ a, l }) => {
        const rad = ((a - 90) * Math.PI) / 180;
        const rr = R + 16;
        const tx = cx + Math.cos(rad) * rr;
        const ty = cy + Math.sin(rad) * rr;
        const major = l.length === 1;
        return <text key={l} x={tx} y={ty + 3}
          className="mono"
          textAnchor="middle"
          fontSize={major ? 11 : 9}
          fontWeight={major ? 700 : 500}
          fill={major ? 'var(--ink)' : 'var(--mute)'}
          letterSpacing="0.05em"
        >{l}</text>;
      })}

      {/* elevation labels along N meridian */}
      {[30, 60].map((deg) => {
        const rr = (1 - deg / 90) * R;
        return (
          <g key={deg}>
            <rect x={cx - 10} y={cy - rr - 6} width="20" height="10" fill="var(--surface)" />
            <text x={cx} y={cy - rr + 2} className="tick" textAnchor="middle">{deg}°</text>
          </g>
        );
      })}

      {/* history trail */}
      {trail.map((h, i) => (
        <circle key={i} cx={h.xy[0]} cy={h.xy[1]} r="2" fill="var(--acc-2)" opacity={h.o} />
      ))}
      {trail.length > 1 && (
        <path d={'M ' + trail.map((h) => h.xy.join(' ')).join(' L ')}
          fill="none" stroke="var(--acc-2)" strokeWidth="1" opacity="0.35" strokeDasharray="2 2" />
      )}

      {/* aircraft glow + crosshair */}
      <circle cx={px} cy={py} r="16" fill="var(--acc)" opacity="0.16" filter="url(#hf-glow)" />
      <circle cx={px} cy={py} r="9" fill="var(--acc)" opacity="0.22" />
      {/* crosshair */}
      <g stroke="var(--acc)" strokeWidth="1">
        <line x1={px - 12} y1={py} x2={px - 5} y2={py} />
        <line x1={px + 5} y1={py} x2={px + 12} y2={py} />
        <line x1={px} y1={py - 12} x2={px} y2={py - 5} />
        <line x1={px} y1={py + 5} x2={px} y2={py + 12} />
      </g>
      <circle cx={px} cy={py} r="3.5" fill="var(--acc)" />

      {/* callsign tag */}
      <g transform={`translate(${px + 14}, ${py - 10})`}>
        <rect x="0" y="0" width={label.length * 7 + 10} height="16" fill="var(--surface)" stroke="var(--acc)" strokeWidth="0.75" />
        <text x="5" y="11" className="mono" fontSize="10" fontWeight="700" fill="var(--acc)">{label}</text>
      </g>

      {/* center (you) */}
      <g>
        <circle cx={cx} cy={cy} r="4" fill="var(--ink)" />
        <circle cx={cx} cy={cy} r="8" fill="none" stroke="var(--ink)" strokeWidth="0.5" opacity="0.4" />
      </g>
    </svg>
  );
}

// ───── Dome (first-person horizon) ─────
function HFDome({ size, az, el, label }) {
  const W = size, H = size * 0.66;
  const cx = W / 2, cy = H - 18, R = W / 2 - 22;
  const azRad = ((az - 180) * Math.PI) / 180;
  const elRad = (el * Math.PI) / 180;
  const px = cx + Math.sin(azRad) * R * Math.cos(elRad);
  const py = cy - Math.sin(elRad) * R;

  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} width={W} height={H + 22} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="hf-dome-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--surface-2)" />
        </linearGradient>
      </defs>
      {/* dome fill */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`}
        fill="url(#hf-dome-grad)" stroke="var(--line)" strokeWidth="1" />

      {/* elevation arcs */}
      {[15, 30, 45, 60, 75].map((d) => {
        const rr = R * Math.cos((d * Math.PI) / 180);
        const hh = R * Math.sin((d * Math.PI) / 180);
        const major = d % 30 === 0;
        return <ellipse key={d} cx={cx} cy={cy} rx={rr} ry={hh}
          fill="none" stroke="var(--line)"
          strokeWidth={major ? 1 : 0.5}
          strokeDasharray={major ? '0' : '1 3'}
          opacity={major ? 0.6 : 0.35} />;
      })}

      {/* azimuth radii */}
      {[-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x2 = cx + Math.sin(rad) * R;
        const y2 = cy - Math.cos(rad) * R;
        const major = a % 30 === 0;
        return <line key={a} x1={cx} y1={cy} x2={x2} y2={y2}
          stroke="var(--line)" strokeWidth={major ? 0.6 : 0.3}
          strokeDasharray="2 3" opacity={major ? 0.5 : 0.3} />;
      })}

      {/* horizon */}
      <line x1={16} y1={cy} x2={W - 16} y2={cy} stroke="var(--ink)" strokeWidth="1.25" />

      {/* elevation ticks on vertical meridian */}
      {[30, 60].map((d) => {
        const y = cy - R * Math.sin((d * Math.PI) / 180);
        return (
          <g key={d}>
            <rect x={cx - 12} y={y - 6} width="24" height="10" fill="var(--surface)" />
            <text x={cx} y={y + 2} className="tick" textAnchor="middle">{d}°</text>
          </g>
        );
      })}

      {/* horizon labels: E — S — W (dome is looking south for demo) */}
      <text x={cx - R} y={cy + 14} className="mono" fontSize="10" fontWeight="600" fill="var(--mute)" textAnchor="middle">E</text>
      <text x={cx} y={cy + 14} className="mono" fontSize="11" fontWeight="700" fill="var(--ink)" textAnchor="middle">S</text>
      <text x={cx + R} y={cy + 14} className="mono" fontSize="10" fontWeight="600" fill="var(--mute)" textAnchor="middle">W</text>
      <text x={cx - R / 2} y={cy + 14} className="mono" fontSize="9" fill="var(--mute-2)" textAnchor="middle">SE</text>
      <text x={cx + R / 2} y={cy + 14} className="mono" fontSize="9" fill="var(--mute-2)" textAnchor="middle">SW</text>

      {/* house silhouette (horizon obstruction) */}
      <path d={`M 0 ${cy} L 0 ${cy - 8} L 22 ${cy - 16} L 44 ${cy - 9} L 60 ${cy - 12} L 60 ${cy} Z`}
        fill="var(--ink-2)" opacity="0.22" />
      <path d={`M ${W - 70} ${cy} L ${W - 70} ${cy - 10} L ${W - 40} ${cy - 18} L ${W - 10} ${cy - 11} L ${W} ${cy - 14} L ${W} ${cy} Z`}
        fill="var(--ink-2)" opacity="0.22" />

      {/* aircraft */}
      <circle cx={px} cy={py} r="14" fill="var(--acc)" opacity="0.16" />
      <circle cx={px} cy={py} r="8" fill="var(--acc)" opacity="0.22" />
      <g stroke="var(--acc)" strokeWidth="1">
        <line x1={px - 10} y1={py} x2={px - 4} y2={py} />
        <line x1={px + 4} y1={py} x2={px + 10} y2={py} />
        <line x1={px} y1={py - 10} x2={px} y2={py - 4} />
        <line x1={px} y1={py + 4} x2={px} y2={py + 10} />
      </g>
      <circle cx={px} cy={py} r="3" fill="var(--acc)" />

      {/* label */}
      <g transform={`translate(${px + 12}, ${py - 8})`}>
        <rect width={label.length * 7 + 10} height="16" fill="var(--surface)" stroke="var(--acc)" strokeWidth="0.75" />
        <text x="5" y="11" className="mono" fontSize="10" fontWeight="700" fill="var(--acc)">{label}</text>
      </g>
    </svg>
  );
}

Object.assign(window, { HiFiSkyChart, ChartToggle });
