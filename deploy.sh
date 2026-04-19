#!/usr/bin/env bash
set -euo pipefail

# ── Target server ────────────────────────────────────────────────────────────
SERVER_USER="matt"
SERVER_HOST="192.168.2.5"
REMOTE_PATH="/storage/appdata/skywatcher"

# ── Derived ──────────────────────────────────────────────────────────────────
REMOTE="${SERVER_USER}@${SERVER_HOST}"

echo "==> Deploying SkyWatcher to ${REMOTE}:${REMOTE_PATH}"

# 1. Ensure remote directory exists and repo is up to date
ssh "${REMOTE}" "
  set -e
  if [ ! -d '${REMOTE_PATH}/.git' ]; then
    git clone https://github.com/Sperryfreak01/SkyWatcher.git '${REMOTE_PATH}'
  else
    git -C '${REMOTE_PATH}' fetch origin
    git -C '${REMOTE_PATH}' checkout main
    git -C '${REMOTE_PATH}' reset --hard origin/main
  fi
"

# 2. Copy .env (with real secrets) to server
scp "$(dirname "$0")/.env" "${REMOTE}:${REMOTE_PATH}/.env"

# 3. Build and start containers
ssh "${REMOTE}" "
  set -e
  cd '${REMOTE_PATH}'
  docker compose down --remove-orphans
  docker compose up --build --detach
  # Prod requires frontend on both the internal compose network and the SQL
  # network so Nginx Proxy Manager can reach it. Must reconnect after every
  # deploy because `compose down` removes the container.
  docker network connect SQL skywatcher-frontend || true
  docker compose ps
"

echo "==> Done. App should be live at http://${SERVER_HOST}"
