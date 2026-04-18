# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project Overview

SkyWatcher is a single-page, responsive overhead aircraft tracker. It polls a local ADS-B receiver and shows the closest aircraft currently visible from the observer's location, with a sky chart (alt-az polar compass) showing where to look. Enrichment comes from FlightAware AeroAPI (cached) and Planespotters.net (photos).

The app is served by an `nginx:alpine` Docker container. The frontend may be static HTML/CSS/JS or use a framework (React, Vue, etc.) if one is needed to achieve a fully responsive desktop + mobile experience — choose whichever best fits the task at hand.

## Repository Structure

- `components/` — JSX UI design files (hi-fi prototypes, **read-only reference** — see UI policy below)
- `skywatcher.css` — authoritative CSS, Instrument Panel aesthetic, CSS custom properties for all theming
- `www/` *(runtime, not committed)* — served files including `js/config.js` (gitignored, holds real observer coordinates)
- `project_skywatcher.md` — canonical project state document; update it when making architectural decisions

## UI Policy (Critical)

**Do not modify UI component files without explicit user approval.** The `.jsx` files in `components/` are design references created in Claude Design. When implementing features, use them as the source of truth for markup, class names, and layout — translate them to runtime HTML/JS faithfully.

## CSS / Theming

`skywatcher.css` is the single source of truth. All colors, spacing, and typography must use the CSS custom properties defined there (e.g. `var(--acc)`, `var(--surface)`, `var(--ink)`). Light/dark mode is handled automatically via `prefers-color-scheme` and `data-theme` attribute — never hardcode colors.

Key variable groups: `--bg/--surface/--surface-2` (backgrounds), `--ink/--ink-2/--mute/--mute-2` (text), `--acc/--acc-2` (accent), `--pos/--warn` (status), `--line/--line-2` (borders).

## Backend / Proxy Architecture

A backend server proxies all external API calls:
- Injects the FlightAware API key as a server-side header (key is **never** sent to the browser)
- Enforces a hard daily quota (default 100 calls/day) to stay within the $10/month FlightAware free credit
- ADSB upstream URL and observer coordinates are injected at container startup via `envsubst` — never hardcoded

## FlightAware API

- Auth: `x-apikey` header (injected by proxy)
- Endpoint: `GET /aeroapi/flights/{ident}` → registration, aircraft_type, operator, origin, destination, status, progress_percent
- Cache: results stored in `localStorage`, TTL 24 hours per unique callsign

## Aircraft Visibility Filter

Aircraft are included only when all four conditions hold:
1. Has lat, lon, and altitude (not "ground")
2. Elevation angle > 14.2° (obstruction angle — two-story houses ~75 ft away)
3. Within geometric horizon: `d < √(2·R·h_observer) + √(2·R·h_plane)`
4. Sorted by 3D distance (closest first)

## Agile Process

- **Never develop directly on `main`** — all work goes on `feat/{name}` or `fix/{name}` branches
- All new features/bugs must have a GitHub Issue (written as an agent brief) before development starts
- Conventional commits: `feat(scope): description`
- PRs required before merging; run `code-reviewer-pro` agent before merge
- GitHub: https://github.com/Sperryfreak01/SkyWatcher
