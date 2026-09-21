#!/usr/bin/env bash
# TKT-0262: keeps Question Solver (mcq-digitizer, :5178) and Syllabus Viewer
# (syllabus-digitizer, :5177) alive on this machine and keeps production's
# stored tunnel URLs in sync. Run by the question-solver systemd user unit;
# see scripts/ops/README.md. A Cloudflare quick tunnel gets a NEW random URL
# every start, so every (re)start is followed by a config sync.
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${TUNNEL_SYNC_ENV:-$HOME/.config/divergencie/tunnel-sync.env}"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/question-solver"
INTERVAL=30
ENABLED="${ENABLED_SERVICES:-mcq syllabus}"
mkdir -p "$STATE_DIR"

# shellcheck disable=SC1090
source "$ENV_FILE"   # SITE, MGMT_USER, MGMT_PASS
CLOUDFLARED="$(command -v cloudflared || echo "$HOME/.local/bin/cloudflared")"
NODE="${NODE_BIN:-$(command -v node)}"   # systemd user units do not inherit nvm PATH; set NODE_BIN in the unit

log() { echo "$(date -u +%FT%TZ) $*"; }

# name  dir  port  metrics-port  config-endpoint
SERVICES=(
  "mcq       prototypes/mcq-digitizer       5178 20251 /api/mcq-config"
  "syllabus  prototypes/syllabus-digitizer  5177 20252 /api/syllabus-config"
)

port_listening() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

tunnel_host() {
  curl -s --max-time 3 "http://127.0.0.1:$1/quicktunnel" 2>/dev/null | sed -n 's/.*"hostname":"\([^"]*\)".*/\1/p'
}

sync_url() {  # name endpoint url
  local jar="$STATE_DIR/cookie.$1"
  curl -s --max-time 15 -c "$jar" -X POST "$SITE/api/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$MGMT_USER\",\"password\":\"$MGMT_PASS\"}" -o /dev/null || return 1
  local code
  code=$(curl -s --max-time 15 -b "$jar" -X PATCH "$SITE$2" -H 'Content-Type: application/json' \
    -d "{\"url\":\"$3\"}" -o /dev/null -w '%{http_code}')
  rm -f "$jar"
  [ "$code" = "200" ]
}

fail_count() { cat "$STATE_DIR/fail.$1" 2>/dev/null || echo 0; }

tick() {
  local name dir port mport endpoint
  for spec in "${SERVICES[@]}"; do
    read -r name dir port mport endpoint <<<"$spec"
    [[ " $ENABLED " == *" $name "* ]] || continue

    if ! port_listening "$port"; then
      log "$name: server down on :$port, starting"
      (cd "$REPO/$dir" && exec "$NODE" server.mjs >>"$STATE_DIR/$name-server.log" 2>&1) &
      sleep 2
    fi

    local host; host=$(tunnel_host "$mport")
    if [ -z "$host" ]; then
      log "$name: tunnel down, starting"
      "$CLOUDFLARED" tunnel --metrics "127.0.0.1:$mport" --url "http://localhost:$port" \
        >>"$STATE_DIR/$name-tunnel.log" 2>&1 &
      for _ in $(seq 1 20); do host=$(tunnel_host "$mport"); [ -n "$host" ] && break; sleep 1; done
      [ -z "$host" ] && { log "$name: tunnel gave no hostname yet"; continue; }
    fi

    local url="https://$host" last; last=$(cat "$STATE_DIR/url.$name" 2>/dev/null || true)
    if [ "$url" != "$last" ]; then
      if sync_url "$name" "$endpoint" "$url"; then
        echo "$url" >"$STATE_DIR/url.$name"; log "$name: synced $url to production"
      else
        log "$name: SYNC FAILED for $url (will retry)"
      fi
    fi

    # Tunnel process alive is not the same as reachable: probe the public URL.
    if curl -s --max-time 10 -o /dev/null "$url/"; then
      echo 0 >"$STATE_DIR/fail.$name"
    else
      local n=$(( $(fail_count "$name") + 1 )); echo "$n" >"$STATE_DIR/fail.$name"
      if [ "$n" -ge 3 ]; then
        log "$name: public URL unreachable $n times, restarting tunnel"
        pkill -f -- "--metrics 127.0.0.1:$mport" || true
        echo 0 >"$STATE_DIR/fail.$name"
      fi
    fi
  done
}

log "supervisor starting (repo $REPO)"
while true; do tick; sleep "$INTERVAL"; done
