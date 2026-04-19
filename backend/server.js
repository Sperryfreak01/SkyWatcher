import express from 'express';
import cors from 'cors';
import { writeFile, readFile, rename, mkdir, unlink, chmod } from 'fs/promises';
import { resolve } from 'path';
import { randomBytes, timingSafeEqual } from 'node:crypto';

// ─── Environment / config ────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const FA_DAILY_QUOTA = parseInt(process.env.FA_DAILY_QUOTA ?? '100', 10);
const FA_MONTHLY_BUDGET = parseFloat(process.env.FA_MONTHLY_BUDGET ?? '9.50');

// Effective daily ceiling is 95% of the configured limit
const FA_DAILY_SOFT_LIMIT = Math.floor(FA_DAILY_QUOTA * 0.95);

// Persistent data directory (named Docker volume mounted at /app/data)
const DATA_DIR = '/app/data';
const QUOTA_FILE = resolve(DATA_DIR, 'quota.json');
const SETUP_FILE = resolve(DATA_DIR, 'setup.json');
const FA_KEY_FILE = resolve(DATA_DIR, '.env.local');

// Mutable runtime config — can be updated via POST /api/setup
const runtimeConfig = {
  adsbUrl: process.env.ADSB_URL ?? null,
  lat: process.env.OBSERVER_LAT ?? null,
  lon: process.env.OBSERVER_LON ?? null,
  elev: process.env.OBSERVER_ELEV ?? null,
  obstructionAngle: process.env.OBSTRUCTION_ANGLE ?? '14.2',
};

// ─── Setup auth state ────────────────────────────────────────────────────────

// One-time setup token generated at startup and logged to stdout.
// Operator must present it in X-Setup-Token header on POST /api/setup.
const SETUP_TOKEN = randomBytes(16).toString('hex');

// Flipped to true once setup.json has been successfully written. When true,
// /api/setup refuses further calls with 403. Initialised from loadSetup() if
// a complete configuration is already present on disk (defence-in-depth).
let setupCompleted = false;

function isConfigComplete() {
  return Boolean(
    runtimeConfig.adsbUrl &&
    runtimeConfig.lat &&
    runtimeConfig.lon &&
    runtimeConfig.elev
  );
}

// ─── Setup persistence (setup.json) ──────────────────────────────────────────

async function loadSetup() {
  try {
    const raw = await readFile(SETUP_FILE, 'utf8');
    const saved = JSON.parse(raw);
    // Env vars take precedence over saved file — only fill gaps
    if (!runtimeConfig.adsbUrl && saved.adsbUrl) runtimeConfig.adsbUrl = saved.adsbUrl;
    if (!runtimeConfig.lat    && saved.lat)     runtimeConfig.lat = saved.lat;
    if (!runtimeConfig.lon    && saved.lon)     runtimeConfig.lon = saved.lon;
    if (!runtimeConfig.elev   && saved.elev)    runtimeConfig.elev = saved.elev;
    if (saved.obstructionAngle) runtimeConfig.obstructionAngle = saved.obstructionAngle;
    console.log('[setup] Restored config from setup.json');
  } catch {
    // File absent on first start — use env vars (or null)
  }
  // Apply default ADSB URL only if nothing was configured at all
  if (!runtimeConfig.adsbUrl) runtimeConfig.adsbUrl = 'http://localhost:8080';

  // Restore FA key from the data volume so it survives container restarts.
  try {
    const keyFile = await readFile(FA_KEY_FILE, 'utf8');
    const match = keyFile.match(/^FLIGHTAWARE_API_KEY=(.+)$/m);
    if (match && match[1].trim() && !process.env.FLIGHTAWARE_API_KEY) {
      process.env.FLIGHTAWARE_API_KEY = match[1].trim();
      console.log('[setup] Restored FA key from data volume');
    }
  } catch {
    /* absent = no key saved */
  }

  // Check after all sources are loaded — fires for env-var-only deploys too.
  if (isConfigComplete()) setupCompleted = true;
}

async function persistSetup() {
  const tmp = `${SETUP_FILE}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify({
      adsbUrl: runtimeConfig.adsbUrl,
      lat: runtimeConfig.lat,
      lon: runtimeConfig.lon,
      elev: runtimeConfig.elev,
      obstructionAngle: runtimeConfig.obstructionAngle,
    }), 'utf8');
    await rename(tmp, SETUP_FILE);
    return true;
  } catch (err) {
    console.error('[setup] Failed to persist setup.json:', err.message);
    try { await unlink(tmp); } catch { /* already gone */ }
    return false;
  }
}

// ─── SSRF guard for adsbUrl ──────────────────────────────────────────────────

// Reject loopback hosts (a fetch from the container back to itself is a SSRF
// vector) and non-http(s) schemes. Private/RFC-1918 addresses are permitted
// because the ADS-B receiver is intended to live on the LAN.
function validateAdsbUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return 'adsbUrl is not a valid URL';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'adsbUrl must use http: or https:';
  }

  const host = parsed.hostname.toLowerCase();
  const loopback =
    host === 'localhost' ||
    host === '::1' ||
    host === '[::1]' ||
    host === '0.0.0.0' ||
    host === '::ffff:127.0.0.1' ||
    host === '169.254.169.254' || // cloud metadata endpoint
    host === '169.254.170.2' ||   // ECS task metadata
    /^127\./.test(host);

  if (loopback) {
    return 'adsbUrl may not point at loopback or link-local addresses';
  }

  return null;
}

// ─── FlightAware cache (server-side, TTL 24 h) ───────────────────────────────

/** @type {Map<string, { data: object, expiresAt: number }>} */
const faCache = new Map();

// ─── Daily quota tracker (persisted to quota.json) ───────────────────────────

const quota = {
  count: 0,
  date: new Date().toDateString(),
};

async function loadQuota() {
  try {
    const raw = await readFile(QUOTA_FILE, 'utf8');
    const saved = JSON.parse(raw);
    if (saved.date === new Date().toDateString()) {
      quota.count = saved.count ?? 0;
      quota.date = saved.date;
    }
  } catch {
    // File absent or unreadable — start fresh
  }
}

async function persistQuota() {
  const tmp = `${QUOTA_FILE}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify({ date: quota.date, count: quota.count }), 'utf8');
    await rename(tmp, QUOTA_FILE);
  } catch (err) {
    console.error('[quota] Failed to persist quota state:', err.message);
  }
}

function getQuotaState() {
  const today = new Date().toDateString();
  if (quota.date !== today) {
    quota.count = 0;
    quota.date = today;
    persistQuota();
  }
  const remaining = Math.max(0, FA_DAILY_SOFT_LIMIT - quota.count);

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  return {
    used: quota.count,
    remaining,
    limit: FA_DAILY_QUOTA,
    softLimit: FA_DAILY_SOFT_LIMIT,
    resetsAt: midnight.toISOString(),
  };
}

async function incrementQuota() {
  getQuotaState(); // ensure date is current
  quota.count += 1;
  await persistQuota();
}

// ─── Monthly budget tracker (via /account/usage) ─────────────────────────────

const faUsageState = {
  total_cost: null,
  total_calls: null,
  last_polled_at: null,
};

async function pollFaUsage() {
  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch('https://aeroapi.flightaware.com/aeroapi/account/usage', {
      headers: { 'x-apikey': apiKey },
    });
    if (!res.ok) {
      console.error(`[fa-usage] /account/usage returned HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    faUsageState.total_cost = data.total_cost ?? null;
    faUsageState.total_calls = data.total_calls ?? null;
    faUsageState.last_polled_at = new Date().toISOString();
    console.log(`[fa-usage] Billing period: $${faUsageState.total_cost} / $${FA_MONTHLY_BUDGET} (${faUsageState.total_calls} calls)`);
  } catch (err) {
    console.error('[fa-usage] Poll failed:', err.message);
    // Non-blocking — monthly ceiling is skipped when total_cost is null
  }
}

function isMonthlyBudgetExceeded() {
  if (faUsageState.total_cost === null) return false; // fail-open
  return faUsageState.total_cost >= FA_MONTHLY_BUDGET * 0.95;
}

// ─── Express setup ───────────────────────────────────────────────────────────

const app = express();

app.use(express.json());

// CORS is only required for the local Vite dev server. In production all
// requests come through the nginx reverse proxy on the same origin.
if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://localhost'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Setup-Token'],
    })
  );
}

// ─── GET /api/aircraft ────────────────────────────────────────────────────────

app.get('/api/aircraft', async (_req, res) => {
  const url = `${runtimeConfig.adsbUrl}/data/aircraft.json`;
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      throw new Error(`Upstream returned HTTP ${upstream.status}`);
    }
    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    console.error('[aircraft] upstream fetch failed:', err.message);
    return res.status(502).json({ aircraft: [], error: 'upstream unavailable' });
  }
});

// ─── GET /api/enrich/:callsign ────────────────────────────────────────────────

app.get('/api/enrich/:callsign', async (req, res) => {
  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'fa_key_not_configured' });
  }

  const callsign = req.params.callsign.trim().toUpperCase();

  // Cache check first — hits cost $0 and must be served even when budget is exhausted
  const cached = faCache.get(callsign);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  // Evict stale entry if present
  if (cached) {
    faCache.delete(callsign);
  }

  // Monthly budget ceiling (blocks live FA calls only, not cache hits)
  if (isMonthlyBudgetExceeded()) {
    return res.status(429).json({
      error: 'monthly_budget_exceeded',
      total_cost: faUsageState.total_cost,
      monthly_budget: FA_MONTHLY_BUDGET,
    });
  }

  // Daily quota check (inner gate)
  const state = getQuotaState();
  if (state.remaining <= 0) {
    return res.status(429).json({ error: 'quota_exhausted', remaining: 0 });
  }

  // Call FlightAware AeroAPI
  try {
    const faUrl = `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(callsign)}`;

    const faRes = await fetch(faUrl, {
      headers: { 'x-apikey': apiKey },
    });

    if (!faRes.ok) {
      console.error(`[enrich] FlightAware returned HTTP ${faRes.status} for ${callsign}`);
      return res.status(faRes.status).json({ error: 'fa_upstream_error', status: faRes.status });
    }

    await incrementQuota();

    const faData = await faRes.json();

    // Prefer the active flight; fall back to the most recent entry
    const flights = Array.isArray(faData.flights) ? faData.flights : [faData];
    const flight = flights.find(f => f?.status?.toLowerCase() === 'active') ?? flights[0];

    const payload = {
      registration: flight?.registration ?? null,
      aircraft_type: flight?.aircraft_type ?? null,
      operator: flight?.operator ?? null,
      origin: flight?.origin ?? null,
      destination: flight?.destination ?? null,
      status: flight?.status ?? null,
      progress_percent: flight?.progress_percent ?? null,
    };

    // Cache active/completed flights for 24h; cache scheduled flights for only
    // 5 minutes so they refresh once the aircraft departs.
    const isActive = ['active', 'completed'].includes(payload.status?.toLowerCase());
    faCache.set(callsign, {
      data: payload,
      expiresAt: Date.now() + (isActive ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000),
    });

    return res.json(payload);
  } catch (err) {
    console.error('[enrich] fetch error:', err.message);
    return res.status(502).json({ error: 'fa_fetch_failed' });
  }
});

// ─── GET /health ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  return res.json({ status: 'ok' });
});

// ─── GET /api/quota ───────────────────────────────────────────────────────────

app.get('/api/quota', (_req, res) => {
  return res.json(getQuotaState());
});

// ─── GET /api/fa-usage ────────────────────────────────────────────────────────

app.get('/api/fa-usage', (_req, res) => {
  return res.json({
    total_cost: faUsageState.total_cost,
    total_calls: faUsageState.total_calls,
    monthly_budget: FA_MONTHLY_BUDGET,
    last_polled_at: faUsageState.last_polled_at,
  });
});

// ─── GET /api/config ──────────────────────────────────────────────────────────

app.get('/api/config', (_req, res) => {
  return res.json({
    adsbUrl: runtimeConfig.adsbUrl,
    lat: runtimeConfig.lat,
    lon: runtimeConfig.lon,
    elev: runtimeConfig.elev,
    obstructionAngle: runtimeConfig.obstructionAngle,
    faKeyConfigured: Boolean(process.env.FLIGHTAWARE_API_KEY),
  });
});

// ─── POST /api/setup ──────────────────────────────────────────────────────────

function verifySetupToken(req) {
  const provided = req.header('X-Setup-Token');
  if (!provided || typeof provided !== 'string') return false;

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(SETUP_TOKEN, 'utf8');
  // timingSafeEqual throws on mismatched lengths — short-circuit first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

app.post('/api/setup', async (req, res) => {
  // 1) Authenticate FIRST so we don't leak configuration state to unauthenticated callers.
  if (!verifySetupToken(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // 2) Refuse if setup already completed (one-shot endpoint).
  if (setupCompleted) {
    return res.status(403).json({ error: 'already_configured' });
  }

  const { adsbUrl, lat, lon, elev, obstructionAngle, faKey } = req.body ?? {};

  // Validate required fields
  const missing = [];
  if (!adsbUrl) missing.push('adsbUrl');
  if (lat === undefined || lat === null || lat === '') missing.push('lat');
  if (lon === undefined || lon === null || lon === '') missing.push('lon');
  if (elev === undefined || elev === null || elev === '') missing.push('elev');

  if (missing.length > 0) {
    return res.status(400).json({ error: 'missing_required_fields', fields: missing });
  }

  // Validate adsbUrl against SSRF (scheme + loopback guard)
  const urlErr = validateAdsbUrl(adsbUrl);
  if (urlErr) {
    return res.status(400).json({ error: 'invalid_adsb_url', message: urlErr });
  }

  // Validate coordinate ranges
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const elevNum = parseFloat(elev);
  const angleNum = obstructionAngle != null ? parseFloat(obstructionAngle) : null;

  const coordErrors = [];
  if (isNaN(latNum) || latNum < -90  || latNum > 90)    coordErrors.push('lat must be -90 to 90');
  if (isNaN(lonNum) || lonNum < -180 || lonNum > 180)   coordErrors.push('lon must be -180 to 180');
  if (isNaN(elevNum) || elevNum < 0  || elevNum > 50000) coordErrors.push('elev must be 0–50000 ft');
  if (angleNum !== null && (isNaN(angleNum) || angleNum < 0 || angleNum > 90))
    coordErrors.push('obstructionAngle must be 0–90°');

  if (coordErrors.length > 0) {
    return res.status(400).json({ error: 'invalid_fields', messages: coordErrors });
  }

  // Handle FA key FIRST — never log, never return.
  // Writing the key before persistSetup() ensures that a key-write failure
  // cannot leave setup.json on disk and permanently lock the endpoint.
  const faKeyProvided = typeof faKey === 'string' && faKey.trim().length > 0;
  const trimmedKey = faKeyProvided ? faKey.trim() : null;
  if (faKeyProvided) {
    process.env.FLIGHTAWARE_API_KEY = trimmedKey;
    try {
      await writeFile(FA_KEY_FILE, `FLIGHTAWARE_API_KEY=${trimmedKey}\n`, { mode: 0o600 });
      await chmod(FA_KEY_FILE, 0o600);
    } catch (writeErr) {
      console.error('[setup] Failed to persist FA key to .env.local:', writeErr.message);
      // Key is in memory for this session but won't survive a restart.
      // Do NOT persist setup.json — operator must retry once permissions are fixed.
      return res.status(507).json({
        error: 'key_not_persisted',
        message: 'FA key accepted but could not be saved to disk. Check container permissions.',
      });
    }
    pollFaUsage();
  }

  // Update non-secret runtime config and persist for container restarts.
  runtimeConfig.adsbUrl = adsbUrl;
  runtimeConfig.lat = String(lat);
  runtimeConfig.lon = String(lon);
  runtimeConfig.elev = String(elev);
  runtimeConfig.obstructionAngle = obstructionAngle != null ? String(obstructionAngle) : runtimeConfig.obstructionAngle;
  const persisted = await persistSetup();

  // Lock the endpoint once we've successfully written setup.json.
  if (persisted) setupCompleted = true;

  return res.json({
    success: true,
    configured: {
      adsbUrl: runtimeConfig.adsbUrl,
      lat: runtimeConfig.lat,
      lon: runtimeConfig.lon,
      elev: runtimeConfig.elev,
      obstructionAngle: runtimeConfig.obstructionAngle,
      faKeyConfigured: Boolean(process.env.FLIGHTAWARE_API_KEY),
    },
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

// Create the data dir before any persistence layer touches it.
await mkdir(DATA_DIR, { recursive: true });
await loadSetup();
await loadQuota();
await pollFaUsage();
setInterval(pollFaUsage, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[skywatcher-proxy] Listening on port ${PORT}`);
  console.log(`[skywatcher-proxy] FA key configured: ${Boolean(process.env.FLIGHTAWARE_API_KEY)}`);
  console.log(`[skywatcher-proxy] ADSB_URL: ${runtimeConfig.adsbUrl}`);
  console.log(`[skywatcher-proxy] Daily quota: ${FA_DAILY_QUOTA} (soft limit: ${FA_DAILY_SOFT_LIMIT})`);
  console.log(`[skywatcher-proxy] Monthly budget: $${FA_MONTHLY_BUDGET} (ceiling: $${(FA_MONTHLY_BUDGET * 0.95).toFixed(2)})`);
  console.log(`[setup] *** SETUP TOKEN: ${SETUP_TOKEN} ***`);
  if (setupCompleted) {
    console.log('[setup] Configuration already present on disk — /api/setup is locked');
  }
});
