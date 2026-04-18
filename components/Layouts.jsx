// Layouts.jsx — 4 desktop layout variants + phone pairs + empty state.
// Uses CSS vars for theming.

// Shared styles
const SCREEN = {
  background: 'var(--bg)',
  color: 'var(--ink)',
  fontFamily: 'var(--body)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

// ─────────────────────────────────────────────
// VARIANT 1 — Chart-hero (sky chart dominates)
// ─────────────────────────────────────────────
function LayoutChartHero({ w = 960, h = 600, density = 'full', chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <div style={{ width: w, height: h, ...SCREEN }}>
      <TopBar />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', overflow: 'hidden' }}>
        {/* Left: chart */}
        <div style={{ borderRight: '1px solid var(--line)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'var(--sketch)', fontSize: 13, color: 'var(--mute)', alignSelf: 'flex-start' }}>Look here →</div>
          <Chart size={360} />
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <BigStat k="AZIMUTH" v="110°" sub="ESE" />
            <BigStat k="ELEVATION" v="42°" sub="up" />
            <BigStat k="DISTANCE" v="6.4 nm" sub="slant" />
          </div>
        </div>
        {/* Right: aircraft identity */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: 0.5 }}>CALLSIGN</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700 }}>UAL482</div>
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>United · Boeing 737-900ER · N38459</div>
          </div>
          <Placeholder h={140} label="aircraft photo · planespotters" />
          <RouteLine from="KSFO" to="KORD" progress={0.42} />
          {density !== 'minimal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18, rowGap: 0, marginTop: 4 }}>
              <DataRow k="Altitude" v="34 000 ft" accent />
              <DataRow k="Speed" v="451 kts" />
              <DataRow k="Heading" v="072°" />
              <DataRow k="V/S" v="+0 fpm" />
              <DataRow k="Squawk" v="2145" />
              <DataRow k="ICAO" v="A4E8B2" />
            </div>
          )}
          {density === 'full' && (
            <div style={{ marginTop: 4 }}>
              <WFTitle sub="route">Flight path</WFTitle>
              <RouteMap h={90} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 2 — Identity-hero (big photo + chart inset)
// ─────────────────────────────────────────────
function LayoutIdentityHero({ w = 960, h = 600, density = 'full', chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <div style={{ width: w, height: h, ...SCREEN }}>
      <TopBar />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Placeholder w="100%" h="100%" label="large aircraft photo · planespotters" style={{ border: 'none' }} />
        {/* overlay top */}
        <div style={{ position: 'absolute', top: 20, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '10px 14px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)' }}>CALLSIGN · 737-900ER</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700 }}>UAL482</div>
            <RouteLine from="KSFO" to="KORD" progress={0.42} compact />
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: 12 }}>
            <div style={{ fontFamily: 'var(--sketch)', fontSize: 12, color: 'var(--mute)', marginBottom: 4 }}>where to look</div>
            <Chart size={170} />
          </div>
        </div>
        {/* overlay bottom — data strip */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: '12px 24px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <BigStat k="AZ" v="110°" />
          <BigStat k="EL" v="42°" />
          <BigStat k="DIST" v="6.4 nm" />
          <BigStat k="ALT" v="34 000 ft" accent />
          <BigStat k="SPD" v="451 kts" />
          {density !== 'minimal' && <><BigStat k="HDG" v="072°" /><BigStat k="V/S" v="+0 fpm" /><BigStat k="SQK" v="2145" /></>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 3 — Balanced split (chart | identity | data)
// ─────────────────────────────────────────────
function LayoutBalanced({ w = 960, h = 600, density = 'full', chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <div style={{ width: w, height: h, ...SCREEN }}>
      <TopBar />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', overflow: 'hidden' }}>
        {/* Col 1 — chart */}
        <div style={{ borderRight: '1px solid var(--line)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <WFTitle sub="alt-az">Sky chart</WFTitle>
          <Chart size={260} />
          <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11 }}>
            <div style={{ color: 'var(--mute)' }}>LOOK</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>ESE · 42° up</div>
          </div>
        </div>
        {/* Col 2 — identity */}
        <div style={{ borderRight: '1px solid var(--line)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)' }}>FLIGHT</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700 }}>UAL482</div>
            <div style={{ fontSize: 11, color: 'var(--mute)' }}>United · B737-900ER · N38459</div>
          </div>
          <Placeholder h={120} label="photo" />
          <RouteLine from="KSFO" to="KORD" progress={0.42} compact />
          <RouteMap h={80} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)' }}>
            DEP 14:22 PDT &nbsp; ARR 20:18 CDT &nbsp; · &nbsp; ON TIME
          </div>
        </div>
        {/* Col 3 — data fields */}
        <div className="no-sb" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
          <WFTitle sub="live adsb">Transponder</WFTitle>
          <DataRow k="Altitude" v="34 000 ft" accent />
          <DataRow k="Speed (gnd)" v="451 kts" />
          <DataRow k="Heading" v="072°" />
          <DataRow k="Vert rate" v="+0 fpm" />
          <DataRow k="Squawk" v="2145" />
          <DataRow k="ICAO hex" v="A4E8B2" />
          {density === 'full' && <>
            <DataRow k="Mach" v="0.78" />
            <DataRow k="Track" v="073°" />
            <DataRow k="Lat" v="37.91°N" />
            <DataRow k="Lon" v="-122.18°W" />
            <DataRow k="RSSI" v="-8.2 dB" />
            <DataRow k="Last seen" v="0.3 s" />
          </>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 4 — HUD / cockpit (data-dense, tile grid)
// ─────────────────────────────────────────────
function LayoutHUD({ w = 960, h = 600, density = 'full', chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <div style={{ width: w, height: h, ...SCREEN }}>
      <TopBar />
      <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 10, overflow: 'hidden' }}>
        {/* Chart tile */}
        <Tile col="1 / span 5" row="1 / span 4" title="Sky chart">
          <div style={{ display: 'flex', justifyContent: 'center' }}><Chart size={230} /></div>
        </Tile>
        {/* Identity tile */}
        <Tile col="6 / span 4" row="1 / span 2" title="Callsign">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700 }}>UAL482</div>
          <div style={{ fontSize: 10, color: 'var(--mute)' }}>B737-900ER · N38459</div>
        </Tile>
        {/* Photo tile */}
        <Tile col="10 / span 3" row="1 / span 4" title="Photo">
          <Placeholder h="100%" label="photo" />
        </Tile>
        {/* Data tiles */}
        <Tile col="6 / span 2" row="3 / span 2" title="Altitude"><Big>34 000</Big><Unit>ft</Unit></Tile>
        <Tile col="8 / span 2" row="3 / span 2" title="Speed"><Big>451</Big><Unit>kts</Unit></Tile>
        {/* Bottom row */}
        <Tile col="1 / span 2" row="5 / span 2" title="Azimuth"><Big accent>110°</Big><Unit>ESE</Unit></Tile>
        <Tile col="3 / span 2" row="5 / span 2" title="Elevation"><Big accent>42°</Big><Unit>up</Unit></Tile>
        <Tile col="5 / span 2" row="5 / span 2" title="Distance"><Big>6.4</Big><Unit>nm slant</Unit></Tile>
        <Tile col="7 / span 3" row="5 / span 2" title="Route">
          <RouteLine from="KSFO" to="KORD" progress={0.42} compact />
          <div style={{ marginTop: 4 }}><RouteMap h={40} /></div>
        </Tile>
        <Tile col="10 / span 3" row="5 / span 2" title="Transponder">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 10, fontFamily: 'var(--mono)', gap: 2 }}>
            <span style={{ color: 'var(--mute)' }}>HDG</span><span>072°</span>
            <span style={{ color: 'var(--mute)' }}>V/S</span><span>0</span>
            <span style={{ color: 'var(--mute)' }}>SQK</span><span>2145</span>
            <span style={{ color: 'var(--mute)' }}>ICAO</span><span>A4E8B2</span>
          </div>
        </Tile>
      </div>
    </div>
  );
}

function Tile({ col, row, title, children }) {
  return (
    <div style={{
      gridColumn: col, gridRow: row,
      border: '1px solid var(--line)',
      padding: 10, display: 'flex', flexDirection: 'column', gap: 4,
      minHeight: 0, overflow: 'hidden',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}
function Big({ children, accent }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: accent ? 'var(--acc1)' : 'var(--ink)', lineHeight: 1 }}>{children}</div>;
}
function Unit({ children }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)' }}>{children}</div>;
}
function BigStat({ k, v, sub, accent }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: 0.6 }}>{k}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: accent ? 'var(--acc1)' : 'var(--ink)' }}>{v}</div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)' }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE — weather fallback
// ─────────────────────────────────────────────
function LayoutEmptyWeather({ w = 960, h = 600 }) {
  return (
    <div style={{ width: w, height: h, ...SCREEN }}>
      <TopBar mode="quiet" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--sketch)', fontSize: 22, color: 'var(--mute)' }}>Quiet skies.</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)', marginTop: 4, letterSpacing: 0.5 }}>NO AIRCRAFT VISIBLE · NEXT CHECK IN 10 S</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, width: '75%', maxWidth: 640 }}>
          <WeatherTile k="TEMP" v="62°" sub="feels 59°" />
          <WeatherTile k="SKY" v="Clear" sub="0% cloud" accent />
          <WeatherTile k="WIND" v="8 kts" sub="W · calm" />
          <WeatherTile k="VIS" v="10 mi" sub="unlimited" />
          <WeatherTile k="DEW" v="54°" sub="comfy" />
          <WeatherTile k="PRESS" v="30.12" sub="inHg" />
          <WeatherTile k="SUN" v="6:42 PM" sub="sets in 2h 18m" />
          <WeatherTile k="MOON" v="Waxing" sub="64% illum" />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: 0.5 }}>LAST AIRCRAFT · SWA1132 · 14 MIN AGO</div>
      </div>
    </div>
  );
}
function WeatherTile({ k, v, sub, accent }) {
  return (
    <div style={{ border: '1px solid var(--line)', padding: 12, textAlign: 'left' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: 0.6 }}>{k}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: accent ? 'var(--acc2)' : 'var(--ink)' }}>{v}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)' }}>{sub}</div>
    </div>
  );
}

Object.assign(window, {
  LayoutChartHero, LayoutIdentityHero, LayoutBalanced, LayoutHUD,
  LayoutEmptyWeather, BigStat,
});
