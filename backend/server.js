import express from 'express';
import cors from 'cors';
import { writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Environment / config ────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const FA_DAILY_QUOTA = parseInt(process.env.FA_DAILY_QUOTA ?? '100', 10);

// Mutable runtime config — can be updated via POST /api/setup
const runtimeConfig = {
  adsbUrl: process.env.ADSB_URL ?? 'http://localhost:8080',
  lat: process.env.OBSERVER_LAT ?? null,
  lon: process.env.OBSERVER_LON ?? null,
  elev: process.env.OBSERVER_ELEV ?? null,
  obstructionAngle: process.env.OBSTRUCTION_ANGLE ?? '14.2',
};

// ─── FlightAware cache (server-side, TTL 24 h) ───────────────────────────────

/** @type {Map<string, { data: object, expiresAt: number }>} */
const faCache = new Map();

// ─── Daily quota tracker ─────────────────────────────────────────────────────

const quota = {
  count: 0,
  date: new Date().toDateString(),
};

function getQuotaState() {
  const today = new Date().toDateString();
  if (quota.date !== today) {
    quota.count = 0;
    quota.date = today;
  }
  const remaining = Math.max(0, FA_DAILY_QUOTA - quota.count);

  // Midnight local time for resetsAt
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  return {
    used: quota.count,
    remaining,
    limit: FA_DAILY_QUOTA,
    resetsAt: midnight.toISOString(),
  };
}

function incrementQuota() {
  // Ensure date is current before incrementing
  getQuotaState();
  quota.count += 1;
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

  // Check cache first
  const cached = faCache.get(callsign);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  // Evict stale entry if present
  if (cached) {
    faCache.delete(callsign);
  }

  // Check quota
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

    incrementQuota();

    const faData = await faRes.json();

    // Extract only the fields the frontend needs from the first flight entry
    const flight = Array.isArray(faData.flights) ? faData.flights[0] : faData;
    const payload = {
      registration: flight?.registration ?? null,
      aircraft_type: flight?.aircraft_type ?? null,
      operator: flight?.operator ?? null,
      origin: flight?.origin ?? null,
      destination: flight?.destination ?? null,
      status: flight?.status ?? null,
      progress_percent: flight?.progress_percent ?? null,
    };

    // Store in cache
    faCache.set(callsign, {
      data: payload,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return res.json(payload);
  } catch (err) {
    console.error('[enrich] fetch error:', err.message);
    return res.status(502).json({ error: 'fa_fetch_failed' });
  }
});

// ─── GET /health ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  return res.json({ status: 'ok' })
})

// ─── GET /api/quota ───────────────────────────────────────────────────────────

app.get('/api/quota', (_req, res) => {
  return res.json(getQuotaState());
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
    return res.status(400).json({
      error: 'missing_required_fields',
      fields: missing,
    });
  }

  // Update non-secret runtime config
  runtimeConfig.adsbUrl = adsbUrl;
  runtimeConfig.lat = String(lat);
  runtimeConfig.lon = String(lon);
  runtimeConfig.elev = String(elev);
  runtimeConfig.obstructionAngle = obstructionAngle != null ? String(obstructionAngle) : runtimeConfig.obstructionAngle;

  // Handle FA key — never log, never return
  const faKeyProvided = typeof faKey === 'string' && faKey.trim().length > 0;
  if (faKeyProvided) {
    process.env.FLIGHTAWARE_API_KEY = faKey.trim();
    try {
      const envPath = resolve(__dirname, '.env.local');
      await writeFile(envPath, `FLIGHTAWARE_API_KEY=${faKey.trim()}\n`, { mode: 0o600 });
    } catch (writeErr) {
      console.error('[setup] Failed to persist FA key to .env.local:', writeErr.message);
      // Non-fatal — key is set in memory even if file write fails
    }
  }

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

app.listen(PORT, () => {
  console.log(`[skywatcher-proxy] Listening on port ${PORT}`);
  console.log(`[skywatcher-proxy] FA key configured: ${Boolean(process.env.FLIGHTAWARE_API_KEY)}`);
  console.log(`[skywatcher-proxy] ADSB_URL: ${runtimeConfig.adsbUrl}`);
  console.log(`[skywatcher-proxy] Daily quota limit: ${FA_DAILY_QUOTA}`);
});
