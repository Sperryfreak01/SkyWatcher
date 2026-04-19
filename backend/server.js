import express from 'express';
import cors from 'cors';
import { writeFile, readFile, rename, access, constants } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Environment / config ────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const FA_DAILY_QUOTA = parseInt(process.env.FA_DAILY_QUOTA ?? '100', 10);
const FA_MONTHLY_BUDGET = parseFloat(process.env.FA_MONTHLY_BUDGET ?? '9.50');

// Effective daily ceiling is 95% of the configured limit
const FA_DAILY_SOFT_LIMIT = Math.floor(FA_DAILY_QUOTA * 0.95);

const QUOTA_FILE = resolve(__dirname, 'quota.json');
const SETUP_FILE = resolve(__dirname, 'setup.json');
// Bind-mounted host .env — written back after first-run so Portainer shows the values
const HOST_ENV_FILE = '/app/.env.host';

// Mutable runtime config — can be updated via POST /api/setup
const runtimeConfig = {
  adsbUrl: process.env.ADSB_URL ?? null,
  lat: process.env.OBSERVER_LAT ?? null,
  lon: process.env.OBSERVER_LON ?? null,
  elev: process.env.OBSERVER_ELEV ?? null,
  obstructionAngle: process.env.OBSTRUCTION_ANGLE ?? '14.2',
};

// ─── Setup persistence (setup.json + host .env writeback) ────────────────────

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
  } catch (err) {
    console.error('[setup] Failed to persist setup.json:', err.message);
  }
}

// Write collected config back to the bind-mounted host .env so Portainer reflects
// the values. Updates existing keys in-place and appends any missing ones.
async function writeBackHostEnv(faKey) {
  try {
    await access(HOST_ENV_FILE, constants.W_OK);
  } catch {
    console.log('[setup] Host .env not mounted or not writable — skipping writeback');
    return;
  }

  let src = '';
  try { src = await readFile(HOST_ENV_FILE, 'utf8'); } catch { /* new file */ }

  const updates = {
    ADSB_URL: runtimeConfig.adsbUrl,
    OBSERVER_LAT: runtimeConfig.lat,
    OBSERVER_LON: runtimeConfig.lon,
    OBSERVER_ELEV: runtimeConfig.elev,
    OBSTRUCTION_ANGLE: runtimeConfig.obstructionAngle,
    ...(faKey ? { FLIGHTAWARE_API_KEY: faKey } : {}),
  };

  const lines = src.split('\n');
  const seen = new Set();

  const updated = lines.map(line => {
    const m = line.match(/^([A-Z_]+)=/);
    if (m && updates[m[1]] != null) {
      seen.add(m[1]);
      return `${m[1]}=${updates[m[1]]}`;
    }
    return line;
  });

  for (const [key, val] of Object.entries(updates)) {
    if (!seen.has(key) && val != null) updated.push(`${key}=${val}`);
  }

  const out = updated.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  try {
    await writeFile(HOST_ENV_FILE, out, 'utf8');
    console.log('[setup] Wrote config back to host .env');
  } catch (err) {
    console.error('[setup] Failed to write host .env:', err.message);
  }
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
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

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

app.post('/api/setup', async (req, res) => {
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

  // Update non-secret runtime config and persist for container restarts
  runtimeConfig.adsbUrl = adsbUrl;
  runtimeConfig.lat = String(lat);
  runtimeConfig.lon = String(lon);
  runtimeConfig.elev = String(elev);
  runtimeConfig.obstructionAngle = obstructionAngle != null ? String(obstructionAngle) : runtimeConfig.obstructionAngle;
  await persistSetup();

  // Handle FA key — never log, never return
  const faKeyProvided = typeof faKey === 'string' && faKey.trim().length > 0;
  const trimmedKey = faKeyProvided ? faKey.trim() : null;
  if (faKeyProvided) {
    process.env.FLIGHTAWARE_API_KEY = trimmedKey;
    try {
      const envPath = resolve(__dirname, '.env.local');
      await writeFile(envPath, `FLIGHTAWARE_API_KEY=${trimmedKey}\n`, { mode: 0o600 });
    } catch (writeErr) {
      console.error('[setup] Failed to persist FA key to .env.local:', writeErr.message);
      // Key is in memory for this session but won't survive a restart — tell the client
      return res.status(507).json({
        error: 'key_not_persisted',
        message: 'FA key accepted but could not be saved to disk. Check container permissions.',
      });
    }
    pollFaUsage();
  }

  // Write all collected values back to the bind-mounted host .env for Portainer visibility
  await writeBackHostEnv(trimmedKey);

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
});
