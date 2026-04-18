---
name: SkyWatcher project state
description: Complete architecture, decisions, and current status for the SkyWatcher ADS-B aircraft tracker project
type: project
---

# SkyWatcher — Full Project State

**Why:**  single-page, responsive overhead aircraft tracker. Points at your local ADS-B receiver and shows you the closest plane currently visible from your house — with a sky chart that tells you exactly where to look.  Additional datasources include planespotter.com for images of aircraft and FlghtAware's AeroAPI.  A backend server proxies frontend requests to prevent hammering the ADSB source and to limit the AeroAPI calls to ensure a configurable budget ammount is not exceeded. Uses the .jsx UI components found in the project folder and created with Claude Design

**How to apply:** Use this to document work, this file will be used for different agents to understand the project goals and state durring handoff and after context compaction. All key decisions and current state are here, github tickets should be used for indepth requirement tracking and TODO items.


## Features

- **Closest visible aircraft** — filtered by 3D distance, geometric horizon, and obstruction angle from surrounding houses
- **Sky chart (alt-az view)** — a polar compass showing azimuth and elevation angle so you know exactly where in the sky to look
- **Live ADS-B data** — polls your receiver every 10 seconds, shows transponder fields exposed in the UI design
- **FlightAware enrichment** — aircraft type, operator, origin/destination, flight status (one API call per unique flight, cached 24 hours)
- **Recent Observations** - shows a list of recently seen flights
- **Aircraft photos** — high resolutions photos of the current plane via Planespotters.net (free, no key required), scaled down to fit in the UI
- **Custom Instrument Panel theme** — Instrument Panel aesthetic, responsive desktop + mobile in one page, live demo with cycling aircraft, chart toggle, auto light/dark, empty state, and first-run flow.
- **Docker + Portainer ready** — Two-container compose: Vite-built React frontend served by `nginx:alpine`, Node.js/Express proxy in a separate `node:alpine` container.
- **Weather Info** - When there are no observable flights weather information is instead shown.
- **Secure Deployment** - All sensative info is stored in docker env's: location, ADSB server info, API keys etc.  They can be configured when deploying the docker container or in the first launch UI. 


## Privacy & Security

- Your FlightAware API key is injected by nginx as a server-side proxy header — **it is never sent to the browser**
- The ADSB upstream URL and host are injected at container startup via `envsubst` — not hardcoded in any committed file
- Content-Security-Policy, X-Frame-Options, Permissions-Policy, and other security headers are applied to all responses
- **ADSB_UPSTREAM_URL Constraints**: The upstream URL must be a trusted, local, or directly controlled endpoint.
- **Portainer Access**: Ensure Portainer UI is secured and not publicly accessible to prevent unauthorized modification of environment variables.

## FlightAware API Usage

SkyWatcher is designed to stay well within the $10/month free credit limit:

- Each unique flight callsign is looked up **at most once per 24 hours**
- Results are cached in `localStorage`
- A **hard daily quota** (default: 100 calls/day) prevents accidental overruns
- A quota indicator in the UI shows how many calls remain today


## Repository
- GitHub: https://github.com/Sperryfreak01/SkyWatcher (public)
- Local: `/home/matt/Documents/Code/Skywatcher`
- Default branch: `main`
- Active feature branch: None (on `main`)

---

## Observer Config (NEVER commit these values)
- Lat: 33.63941596841659, Lon: -117.59644790188057
- Elevation: 997 ft ASL, eye height: 6 ft → effective alt: 1003 ft
- Obstruction angle: 14.2° (arctan((25-6)/75) — two-story houses ~75ft away)
- `www/js/config.js` is **gitignored** — real coords stay local only

---

## Key Design Decisions

### Architecture (locked-in)
- **Frontend:** React + Vite (built to static assets, served by nginx)
- **Backend:** Node.js + Express proxy (injects FlightAware `x-apikey` header, enforces daily quota, proxies ADSB upstream)
- **Container topology:** Two-container `docker-compose.yml` — `nginx:alpine` serves Vite `dist/`, `node:alpine` runs Express proxy. nginx proxies `/api/*` to `proxy:3000` internally.
- **Express port:** 3000 (internal only, not exposed externally)
- **CSS:** `skywatcher.css` is the single source of truth — Instrument Panel aesthetic, all theming via CSS custom properties
- **UI prototypes:** `components/*.jsx` are READ-ONLY design references — translate faithfully to runtime React, never modify

### Phase 1 Confirmed Decisions
- **Sky chart rendering:** SVG (matches all three prototype files exactly — CSS-variable fills, transitions on cx/cy, gradient defs, textPath labels)
- **React state:** `useContext` only — `AircraftContext` (aircraft data, history, polling status) + `SettingsContext` (observer config, theme, chart variant). No Zustand/Jotai.
- **ADS-B format:** dump1090/tar1090 standard `{ now, messages, aircraft: [...] }` schema at `/data/aircraft.json`
- **Obstruction angle:** User-editable, default 14.2°. Settable via Docker env var (`OBSTRUCTION_ANGLE`) AND editable in the Settings panel after first-run.
- **FlightAware caching:** Dual-layer — server-side in-memory `Map` (TTL 24h, deduplicates across all clients/devices) + browser `localStorage` (client-side latency optimization)
- **FA key collection:** First-run flow collects FA key once → POSTed to proxy → stored server-side (written to `.env` file on the proxy container). Key is **never returned to browser** after submission. Settings page shows "configured / not configured" status only.
- **History panel:** 7 entries visible on desktop, 5 on phone (matches prototypes). 50-entry ring buffer in memory. Persisted in `sessionStorage` (cleared on tab close).
- **ADS-B polling interval:** 10 seconds

### Visibility Filter 
1. Aircraft must have lat, lon, alt (not "ground")
2. Elevation angle > 14.2° (obstruction angle)
3. Within geometric horizon: d < sqrt(2·R·h_observer) + sqrt(2·R·h_plane)
4. Sort by 3D distance (closest first)

###
 - UI was designed before project started, use the UI design found in ./Components.  Do not modify the UI design without explict communication - this is a critical to success requirement

### Aircraft Photos 
- API: `GET https://api.planespotters.net/pub/photos/hex/{hex}` (free, no key)
- Does NOT count against FA quota
- Shows photographer credit + link to Planespotters

---

## Agile Process Going Forward
- GitHub Issues track work items — written as agent briefs.  All new features, bugs, or enhancements should be planned first and logged as a github ticket before any development work begins
- Work on github tickets should be done in Feature branches: `feat/{name}` or `fix/{name}`
- NO DEVELOPMENT SHOULD EVER HAPPEN IN THE MAIN BRANCH
- Conventional commits: `feat(scope): description`
- PRs required before merging to main
- Code review via code-reviewer-pro agent before merge

---

## FlightAware API Notes (from research agent)
- Auth header: `x-apikey: YOUR_KEY`
- Endpoint: `GET /aeroapi/flights/{ident}` → returns registration, aircraft_type, operator, origin, destination, status, progress_percent
- Personal tier: $0 base, but charges per result set (~$0.005/call typical)
- $10/month budget → 100 calls/day cap is safe (~$9/month worst case)
- Aircraft photos NOT available via AeroAPI → use Planespotters.net instead

---

## CSS Theme Variables
- Use Skywatcher.css as the authoritative source of truth for all CSS
