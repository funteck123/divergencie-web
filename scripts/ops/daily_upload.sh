#!/usr/bin/env bash
# Wrapper for daily_upload.py: sets a clean environment (a scheduler gives almost none), loads .env.local without printing it, runs the job.
# Called by the Windows scheduled task through: wsl.exe -d <distro> --exec <this file> [--dry-run]
set -u
export TZ=Asia/Kuala_Lumpur
export PATH="$HOME/miniconda3/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 9
set -a; . ./.env.local 2>/dev/null; set +a
exec python3 scripts/ops/daily_upload.py "$@"
