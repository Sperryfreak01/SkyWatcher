// HiFiScreens.jsx — hi-fi screens (desktop v1, phone v3, empty, loading/first-run)
// Needs: HiFiSkyChart, HFStatusBar, HFStat, HFRow, HFPhoto, HFRoute, HFHistory, HFSectionTitle

// Sample data
const DEMO = {
  callsign: 'UAL482', reg: 'N38459', icao: 'A4E8B2',
  type: 'Boeing 737-900ER', operator: 'United Airlines',
  from: 'KSFO', to: 'KORD', fromCity: 'San Francisco', toCity: 'Chicago',
  depTime: '14:22', arrTime: '20:18',
  az: 110, el: 42,
  alt: 34000, spd: 451, hdg: 72, vs: 0, sqk: '2145',
  dist: 6.4, progress: 0.42,
};
const HISTORY = [
  { cs: 'UAL482', route: 'SFO → ORD', when: 'now', alt: 'FL340', active: true },
  { cs: 'DAL1147', route: 'SEA → ATL', when: '4m ago', alt: 'FL380' },
  { cs: 'SWA1132', route: 'LAX → DEN', when: '14m', alt: 'FL320' },
  { cs: 'FDX2288', route: 'OAK → MEM', when: '22m', alt: 'FL390' },
  { cs: 'AAL227', route: 'SFO → DFW', when: '31m', alt: 'FL360' },
  { cs: 'ASA412', route: 'PDX → SAN', when: '43m', alt: 'FL350' },
  { cs: 'UAL205', route: 'SFO → LHR', when: '51m', alt: 'FL380' },
];
const TRAIL = [
  { az: 94, el: 35 }, { az: 98, el: 37 }, { az: 102, el: 39 },
  { az: 106, el: 40 }, { az: 108, el: 41 },
];

// ═══════════════════════════════════════════════
// DESKTOP V1 — Chart hero
// ═══════════════════════════════════════════════
function HiFiDesktop({ aesthetic = 'instrument', theme = 'light', chartStyle, onChartStyle, refresh = 7 }) {
  const W = 1200, H = 760;
  const [internalStyle, setInternalStyle] = React.useState('polar');
  const style = chartStyle ?? internalStyle;
  const setStyle = onChartStyle ?? setInternalStyle;

  return (
    <div className="hifi" data-aesthetic={aesthetic} data-theme={theme}
      style={{ width: W, height: H, display: 'flex', flexDirection: 'column' }}>
      <HFStatusBar refresh={refresh} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 1fr', overflow: 'hidden' }}>
        {/* LEFT — chart */}
        <div className="corners" style={{ padding: '28px 32px', borderRight: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', gap: 20,
          background: aesthetic === 'instrument'
            ? `radial-gradient(ellipse at 50% 40%, var(--surface) 0%, var(--bg) 70%)`
            : 'var(--bg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <HFSectionTitle sub="Where to look">Overhead now</HFSectionTitle>
            <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'right' }}>
              Sun 4:32 PM · 62°F clear
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <HiFiSkyChart size={440} az={DEMO.az} el={DEMO.el}
              style={style} onVariantChange={setStyle}
              history={TRAIL} label={DEMO.callsign} />
          </div>
          {/* bearing readouts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
            padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <HFStat k="Azimuth" v="110" unit="°" sub="ESE · east-southeast" size="lg" accent />
            <HFStat k="Elevation" v="42" unit="°" sub="up from horizon" size="lg" accent />
            <HFStat k="Slant distance" v="6.4" unit="nm" sub="11.9 km · line of sight" size="lg" />
          </div>
        </div>

        {/* RIGHT — identity + data */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div className="label">Closest visible aircraft</div>
              <div className="display" style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 2 }}>{DEMO.callsign}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
                {DEMO.operator} · {DEMO.type} · <span className="mono">{DEMO.reg}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ padding: '3px 8px', background: 'var(--pos)', color: 'var(--surface)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}>IN FLIGHT</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>ICAO {DEMO.icao}</div>
            </div>
          </div>

          <HFPhoto h={180} caption={`${DEMO.reg} · ${DEMO.type} · planespotters.net`} />

          {/* route */}
          <div style={{ padding: '14px 18px', border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <HFRoute from={DEMO.from} to={DEMO.to} fromCity={DEMO.fromCity} toCity={DEMO.toCity}
              progress={DEMO.progress} depTime={DEMO.depTime} arrTime={DEMO.arrTime} eta="3h 12m" />
          </div>

          {/* transponder grid */}
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Transponder · live ADS-B</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
              <HFRow k="Altitude" v="34,000" unit="ft" accent />
              <HFRow k="Ground speed" v="451" unit="kts" />
              <HFRow k="Heading" v="072" unit="°" />
              <HFRow k="Vertical rate" v="+0" unit="fpm" />
              <HFRow k="Squawk" v="2145" />
              <HFRow k="Mach" v="0.78" />
              <HFRow k="Track" v="073" unit="°" />
              <HFRow k="RSSI" v="-8.2" unit="dB" />
            </div>
          </div>

          <div style={{ flex: 1 }} />
          <HFHistory items={HISTORY} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PHONE V3 — Stacked vertical
// ═══════════════════════════════════════════════
function HiFiPhone({ aesthetic = 'instrument', theme = 'light', chartStyle, onChartStyle, refresh = 7 }) {
  const [internalStyle, setInternalStyle] = React.useState('polar');
  const style = chartStyle ?? internalStyle;
  const setStyle = onChartStyle ?? setInternalStyle;

  return (
    <PhoneShell aesthetic={aesthetic} theme={theme}>
      <HFStatusBar sub="BERKELEY" refresh={refresh} />
      <div className="no-sb" style={{ flex: 1, overflow: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* header */}
        <div>
          <div className="label">Closest visible</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{DEMO.callsign}</div>
            <div style={{ padding: '2px 6px', background: 'var(--pos)', color: 'var(--surface)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}>IN FLIGHT</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>
            {DEMO.operator} · {DEMO.type}
          </div>
        </div>

        {/* sky chart card */}
        <div style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <HiFiSkyChart size={260} az={DEMO.az} el={DEMO.el}
            style={style} onVariantChange={setStyle}
            history={TRAIL} label={DEMO.callsign} />
          <div className="rule" style={{ margin: '10px -12px 10px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <HFStat k="AZ" v="110°" sub="ESE" accent size="sm" />
            <HFStat k="EL" v="42°" sub="up" accent size="sm" />
            <HFStat k="DIST" v="6.4" unit="nm" size="sm" />
          </div>
        </div>

        {/* photo */}
        <HFPhoto h={140} caption={`${DEMO.reg} · planespotters.net`} />

        {/* route */}
        <div style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <HFRoute from={DEMO.from} to={DEMO.to} fromCity={DEMO.fromCity} toCity={DEMO.toCity}
            progress={DEMO.progress} depTime={DEMO.depTime} arrTime={DEMO.arrTime} eta="3h 12m" />
        </div>

        {/* transponder */}
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Transponder</div>
          <div style={{ padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <HFRow k="Altitude" v="34,000" unit="ft" accent />
            <HFRow k="Ground speed" v="451" unit="kts" />
            <HFRow k="Heading" v="072" unit="°" />
            <HFRow k="V/S" v="+0" unit="fpm" />
            <HFRow k="Squawk" v="2145" />
            <HFRow k="ICAO" v={DEMO.icao} />
          </div>
        </div>

        <HFHistory items={HISTORY.slice(0, 5)} />
        <div style={{ height: 20 }} />
      </div>
    </PhoneShell>
  );
}

// ═══════════════════════════════════════════════
// EMPTY STATE — Weather fallback
// ═══════════════════════════════════════════════
function HiFiEmptyDesktop({ aesthetic = 'instrument', theme = 'light' }) {
  const W = 1200, H = 760;
  return (
    <div className="hifi" data-aesthetic={aesthetic} data-theme={theme}
      style={{ width: W, height: H, display: 'flex', flexDirection: 'column' }}>
      <HFStatusBar mode="QUIET" refresh={9} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 64px', gap: 32,
        background: aesthetic === 'instrument'
          ? 'radial-gradient(ellipse at 50% 30%, var(--surface) 0%, var(--bg) 70%)'
          : 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--mute)' }}>No aircraft visible</div>
          <div className="display" style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 6 }}>
            Quiet skies.
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
            Nothing overhead right now. Here's what the weather's doing.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { k: 'Temperature', v: '62', unit: '°F', sub: 'feels 59°' },
            { k: 'Sky', v: 'Clear', sub: '0% cloud · 10mi vis', accent: true },
            { k: 'Wind', v: '8', unit: 'kts', sub: 'W · calm' },
            { k: 'Pressure', v: '30.12', unit: 'inHg', sub: 'steady' },
            { k: 'Dew point', v: '54', unit: '°F', sub: 'comfortable' },
            { k: 'Humidity', v: '62', unit: '%', sub: 'moderate' },
            { k: 'Sunset', v: '6:42', unit: 'PM', sub: 'in 2h 18m' },
            { k: 'Moon', v: '64', unit: '%', sub: 'waxing gibbous' },
          ].map((t, i) => (
            <div key={i} style={{ padding: '20px 22px', background: 'var(--surface)' }}>
              <HFStat k={t.k} v={t.v} unit={t.unit} sub={t.sub} size="lg" accent={t.accent} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between',
          padding: '14px 20px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div>
            <div className="label">Last aircraft seen</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              SWA1132 · LAX → DEN · <span style={{ color: 'var(--mute)' }}>14 minutes ago</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label">Next check</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              in 9s · <span style={{ color: 'var(--pos)' }}>receiver OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HiFiEmptyPhone({ aesthetic = 'instrument', theme = 'light' }) {
  return (
    <PhoneShell aesthetic={aesthetic} theme={theme}>
      <HFStatusBar mode="QUIET" sub="BERKELEY" refresh={9} />
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div className="label" style={{ color: 'var(--mute)' }}>No aircraft visible</div>
          <div className="display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4 }}>
            Quiet skies.
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6 }}>
            Here's what the weather's doing.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { k: 'Temp', v: '62°', sub: 'feels 59°' },
            { k: 'Sky', v: 'Clear', sub: '0% cloud', accent: true },
            { k: 'Wind', v: '8 kts', sub: 'W' },
            { k: 'Vis', v: '10 mi', sub: 'unlimited' },
            { k: 'Sunset', v: '6:42p', sub: 'in 2h 18m' },
            { k: 'Moon', v: '64%', sub: 'waxing' },
          ].map((t, i) => (
            <div key={i} style={{ padding: '14px 14px', background: 'var(--surface)' }}>
              <HFStat k={t.k} v={t.v} sub={t.sub} size="md" accent={t.accent} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: 12, background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="label">Last aircraft</div>
          <div className="mono" style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
            SWA1132 · LAX → DEN
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 1 }}>
            14 minutes ago
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ═══════════════════════════════════════════════
// LOADING / FIRST-RUN
// ═══════════════════════════════════════════════
function HiFiFirstRun({ aesthetic = 'instrument', theme = 'light' }) {
  const W = 1200, H = 760;
  return (
    <div className="hifi" data-aesthetic={aesthetic} data-theme={theme}
      style={{ width: W, height: H, display: 'flex', flexDirection: 'column',
        background: aesthetic === 'instrument'
          ? 'radial-gradient(ellipse at 50% 40%, var(--surface) 0%, var(--bg) 70%)'
          : 'var(--bg)' }}>
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <HFLogo />
        <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>skywatcher</div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '20px 64px 48px', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
          <div>
            <div className="label">Welcome</div>
            <div className="display" style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.04, marginTop: 4 }}>
              Point it at your<br />receiver.
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 14, lineHeight: 1.55, maxWidth: 420 }}>
              Skywatcher polls your local ADS-B receiver every 10 seconds, filters for what's actually visible from your yard, and tells you exactly where to look.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="ADS-B receiver URL" value="http://pi.local:8080/data/aircraft.json" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Home latitude" value="37.8715" mono />
              <FormField label="Home longitude" value="-122.2730" mono />
            </div>
            <FormField label="Horizon obstruction (auto-detected)" value="Surveying nearby terrain…" disabled />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{
              padding: '12px 22px',
              background: 'var(--acc)', color: '#fff',
              border: 'none', fontFamily: 'var(--mono)',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>Start watching →</button>
            <button style={{
              padding: '12px 18px',
              background: 'transparent', color: 'var(--ink)',
              border: '1px solid var(--line)', fontFamily: 'var(--mono)',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>Demo data</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative' }}>
            <LoadingChart />
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Scanning 182 aircraft in range…
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%', maxWidth: 380 }}>
            <HFStat k="Receiver" v="OK" sub="pi.local:8080" size="sm" />
            <HFStat k="In range" v="182" sub="within 40nm" size="sm" />
            <HFStat k="Visible" v="—" sub="computing…" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, mono, disabled }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="label">{label}</span>
      <input defaultValue={value} disabled={disabled}
        className={mono ? 'mono' : ''}
        style={{
          padding: '10px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          color: disabled ? 'var(--mute)' : 'var(--ink)',
          fontSize: 13,
          fontFamily: mono ? 'var(--mono)' : 'var(--body)',
          outline: 'none',
        }} />
    </label>
  );
}

function LoadingChart() {
  // animated sweep
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf, start = performance.now();
    const tick = (now) => {
      setT(((now - start) / 3000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const sweep = t * 360;
  const size = 340;
  const cx = size / 2, cy = size / 2, R = size / 2 - 20;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="lc-bg">
          <stop offset="0%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--surface-2)" />
        </radialGradient>
        <linearGradient id="lc-sweep" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--acc)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#lc-bg)" stroke="var(--line)" />
      {[30, 60].map((d) => {
        const rr = (1 - d / 90) * R;
        return <circle key={d} cx={cx} cy={cy} r={rr} fill="none" stroke="var(--line)" strokeDasharray="1 3" />;
      })}
      {['N', 'E', 'S', 'W'].map((l, i) => {
        const a = i * 90;
        const rad = ((a - 90) * Math.PI) / 180;
        const tx = cx + Math.cos(rad) * (R + 14);
        const ty = cy + Math.sin(rad) * (R + 14);
        return <text key={l} x={tx} y={ty + 3} textAnchor="middle" className="mono" fontSize="10" fontWeight="700" fill="var(--mute)">{l}</text>;
      })}
      {/* sweep */}
      <g transform={`rotate(${sweep} ${cx} ${cy})`}>
        <path d={`M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + R * Math.cos(-Math.PI / 4)} ${cy + R * Math.sin(-Math.PI / 4)} Z`}
          fill="url(#lc-sweep)" />
        <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="var(--acc)" strokeWidth="1.5" />
      </g>
      <circle cx={cx} cy={cy} r="3" fill="var(--ink)" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// Phone shell (device frame)
// ═══════════════════════════════════════════════
function PhoneShell({ children, aesthetic = 'instrument', theme = 'light' }) {
  const W = 380, H = 780;
  return (
    <div style={{ padding: 12, background: '#0c0e10', borderRadius: 52,
      boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
      <div className="hifi" data-aesthetic={aesthetic} data-theme={theme}
        style={{ width: W, height: H, borderRadius: 42, overflow: 'hidden',
          position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* dynamic island */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 108, height: 32, background: '#0c0e10', borderRadius: 20, zIndex: 20,
        }} />
        {/* ios status bar */}
        <div style={{
          padding: '12px 24px 8px', display: 'flex', justifyContent: 'space-between',
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)',
        }}>
          <span>9:41</span>
          <span style={{ opacity: 0 }}>·</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>●●●● 5G</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  HiFiDesktop, HiFiPhone, HiFiEmptyDesktop, HiFiEmptyPhone, HiFiFirstRun, PhoneShell, DEMO,
});
