# SkyWatcher

A single-page, responsive overhead aircraft tracker. SkyWatcher polls a local
ADS-B receiver every 10 seconds and shows the closest aircraft currently
visible from your location, with a sky chart that tells you exactly where in
the sky to look. When the skies are quiet, it shows a local weather summary
instead.

## What is this?

If you have a dump1090 / tar1090 ADS-B receiver on your network, SkyWatcher
turns it into a "look up" app: one prominent card for the single closest
overhead aircraft, enriched with flight details and a photo, plus a polar
alt-azimuth chart so you know which direction and how high to look.

- Filters aircraft by 3D distance, geometric horizon, and a configurable
  obstruction angle (default 14.2 deg, tuned for two-story houses ~75 ft away)
- Enriches the active flight with FlightAware AeroAPI data (aircraft type,
  operator, origin/destination, flight status, progress)
- Pulls aircraft photos from Planespotters.net (free, no API key required)
- Falls back to a weather summary (temperature, wind, visibility, dew point,
  pressure, sunset, moon phase) via Open-Meteo when nothing is visible
- Keeps the last 50 aircraft seen in a session-scoped history panel
- Ships with light / dark / auto theming driven entirely by CSS custom
  properties (Instrument Panel aesthetic)

## Features

- Closest visible aircraft, updated every 10 seconds
- SVG sky chart with azimuth and elevation indicators
- FlightAware enrichment (optional), cached 24 h per callsign, server-side
  and client-side
- Planespotters.net photos with photographer credit
- Weather panel when no aircraft are visible
- History panel: last 50 aircraft, persisted in `sessionStorage`
- First-run setup wizard for observer location, ADS-B URL, and optional
  FlightAware API key
- Configurable daily FlightAware quota (default 100 calls/day) to stay
  inside the AeroAPI free credit
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options,
  Permissions-Policy
- FlightAware API key is injected server-side and never sent to the browser

## Architecture

```
                  +---------------------------+
   browser  --->  |   skywatcher-frontend     |     port 80 (host)
                  |   nginx:alpine            |
                  |   serves Vite dist/       |
                  |   + security headers      |
                  +-------------+-------------+
                                |  /api/*  (internal network)
                                v
                  +---------------------------+
                  |   skywatcher-proxy        |     port 3000 (internal only)
                  |   node:20-alpine          |
                  |   Express                 |
                  |    - /api/aircraft        |
                  |    - /api/flight/:ident   |
                  |    - /api/weather         |
                  |    - /api/photo/:hex      |
                  |    - /api/setup           |
                  |   + daily FA quota        |
                  |   + 24h in-memory cache   |
                  +-------------+-------------+
                                |
                   ADS-B feed   +-----> FlightAware AeroAPI (x-apikey header,
                   (dump1090 /          quota-limited, 24h cache)
                   tar1090 on           Open-Meteo (weather)
                   your LAN)            Planespotters.net (photos)
```

- Frontend is a React 18 + Vite SPA built into static assets and served by
  `nginx:alpine`. nginx also applies the security headers and reverse-proxies
  `/api/*` to the backend over the internal Docker network.
- Backend is a small Node.js / Express service. It holds the FlightAware key,
  enforces the daily quota, caches enrichment results for 24 hours, and is the
  only thing that talks to your ADS-B receiver. It listens on port 3000 and is
  not published to the host.
- The two services are wired together with `docker-compose.yml` over a
  dedicated bridge network.

## Prerequisites

- Docker Engine and Docker Compose v2
- A local ADS-B receiver reachable from the Docker host, running dump1090 or
  tar1090 and exposing `/data/aircraft.json` (the SkyWatcher proxy fetches
  `${ADSB_URL}/data/aircraft.json`)
- Observer coordinates (latitude, longitude, elevation in feet ASL)
- Optional: a FlightAware AeroAPI key. Without it, the app still works, but
  flight enrichment (type, operator, route, status) is disabled.

## Quickstart

```bash
git clone https://github.com/Sperryfreak01/SkyWatcher.git
cd SkyWatcher

# Create a .env file next to docker-compose.yml (see table below)
cp .env.example .env   # if an example is present, otherwise create it
$EDITOR .env

docker compose up -d
```

Then open `http://localhost` in a browser on the same machine (or
`http://<docker-host>` from elsewhere on your LAN).

If you did not pre-populate observer coordinates or an ADS-B URL in `.env`,
the app opens a first-run wizard that collects them and POSTs them to
`/api/setup`. The FlightAware key, if provided here, is stored server-side
and never round-trips back to the browser.

### Example `.env`

```dotenv
# FlightAware AeroAPI key (optional - leave blank to disable enrichment)
FLIGHTAWARE_API_KEY=

# ADS-B receiver base URL. The proxy fetches ${ADSB_URL}/data/aircraft.json
ADSB_URL=http://192.168.1.100:8080

# Observer location (decimal degrees, feet ASL)
OBSERVER_LAT=
OBSERVER_LON=
OBSERVER_ELEV=

# Minimum elevation angle in degrees for an aircraft to count as "visible".
# Tune to local obstructions. Default 14.2.
OBSTRUCTION_ANGLE=14.2

# Hard daily cap on FlightAware AeroAPI calls. Default 100 (~ $9/mo worst case).
FA_DAILY_QUOTA=100
```

Do not commit your real `.env` file. The repository's `.gitignore` already
excludes `.env`, `.env.local`, and `.env.*.local`, as well as
`www/js/config.js` (the legacy location for observer coordinates).

## Environment variables

All variables are consumed by the `proxy` service in `docker-compose.yml`.
The `frontend` service itself has no configuration - all runtime settings
flow through the backend.

| Variable              | Required | Default | Description                                                                                   |
| --------------------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| `FLIGHTAWARE_API_KEY` | no       | (empty) | FlightAware AeroAPI key. If unset, flight enrichment is disabled and the UI hides that panel. |
| `ADSB_URL`            | yes*     | -       | Base URL of your ADS-B receiver. The proxy fetches `${ADSB_URL}/data/aircraft.json`.          |
| `OBSERVER_LAT`        | yes*     | -       | Observer latitude (decimal degrees).                                                          |
| `OBSERVER_LON`        | yes*     | -       | Observer longitude (decimal degrees).                                                         |
| `OBSERVER_ELEV`       | yes*     | -       | Observer elevation in feet above sea level (eye height is added internally).                  |
| `OBSTRUCTION_ANGLE`   | no       | `14.2`  | Minimum elevation angle (degrees) for an aircraft to be considered "visible".                 |
| `FA_DAILY_QUOTA`      | no       | `100`   | Maximum FlightAware API calls per calendar day (local time). Resets at midnight.              |

\* If omitted at container start, the first-run wizard collects these values
and sends them to `/api/setup` on the proxy at runtime.

## Updating

```bash
cd SkyWatcher
git pull
docker compose build --no-cache
docker compose up -d
```

`--no-cache` ensures the Vite build picks up new frontend assets instead of
reusing a cached layer.

## Security notes

- The FlightAware key lives only on the proxy container and is attached to
  upstream requests as the `x-apikey` header. It is never included in any
  response body sent to the browser.
- The proxy listens on port 3000 inside the compose network and is not
  published to the host. Only nginx can reach it, and only through the
  bridge network.
- nginx serves a Content-Security-Policy, X-Frame-Options: DENY,
  X-Content-Type-Options: nosniff, and a restrictive Permissions-Policy.
- Your ADS-B receiver is assumed to be on a trusted local network. Do not
  point `ADSB_URL` at a public endpoint you do not control.

## Troubleshooting

**Containers do not start, or `docker compose ps` shows one as `Exited`.**
Run `docker compose logs frontend` and `docker compose logs proxy`. The
frontend's Vite build happens inside `Dockerfile.frontend`, so a JS build
error surfaces as a failed build, not a failed container. If the proxy
fails immediately, it is almost always a bad `.env` value - check for
stray quotes or Windows line endings.

**The app loads but shows no aircraft.**
In order:
1. Confirm the ADS-B receiver is reachable from the Docker host:
   `curl "$ADSB_URL/data/aircraft.json"` from the host shell.
2. Confirm the proxy can reach it:
   `docker compose exec proxy wget -qO- "$ADSB_URL/data/aircraft.json" | head`.
3. Check the obstruction angle. A high value (say 30 deg) can legitimately
   filter out every aircraft in sight. Try lowering `OBSTRUCTION_ANGLE`
   temporarily.
4. Confirm your observer lat/lon/elev match your actual location - bad
   coordinates make everything fall below the horizon.

**CSP errors in the browser console.**
nginx sets a strict Content-Security-Policy in `nginx/nginx.conf`. External
calls are proxied through `/api/*`, which is same-origin, so they should
pass. If you add a new external data source, either proxy it through the
backend (preferred) or extend the `connect-src` / `img-src` directives in
`nginx/nginx.conf` and rebuild the frontend image.

**FlightAware enrichment is missing even though I set a key.**
Check that `FLIGHTAWARE_API_KEY` made it into the proxy container:
`docker compose exec proxy printenv FLIGHTAWARE_API_KEY`. Also check the
quota panel - once `FA_DAILY_QUOTA` calls have been made in a day, further
enrichment is suppressed until midnight local time.

**First-run wizard keeps appearing.**
The wizard triggers whenever observer coordinates are missing on the proxy.
Either pre-populate `OBSERVER_LAT` / `OBSERVER_LON` / `OBSERVER_ELEV` in
`.env` and restart, or submit the wizard and verify the proxy accepted the
POST: `docker compose logs proxy | grep setup`.

## Project layout

- `www/` - React + Vite frontend sources (`src/`, `public/`, `index.html`,
  `package.json`)
- `backend/` - Node.js / Express proxy (`server.js`, `package.json`)
- `nginx/nginx.conf` - nginx config, security headers, `/api/*` reverse proxy
- `components/` - read-only JSX UI design references (do not modify without
  explicit approval - these are the design source of truth for markup and
  class names; see `CLAUDE.md`)
- `skywatcher.css` - authoritative stylesheet. All colors and spacing come
  from CSS custom properties defined here.
- `Dockerfile.frontend`, `Dockerfile.proxy`, `docker-compose.yml` - container
  build and orchestration
- `project_skywatcher.md` - canonical project state / architecture record
- `CLAUDE.md` - contributor guidance for Claude Code agents

## License

See repository for license information.
