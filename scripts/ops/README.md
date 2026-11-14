# Question Solver / Syllabus Viewer supervisor (TKT-0262)

`question-solver-supervisor.sh` runs both standalone servers and their Cloudflare
quick tunnels, restarts whichever is down, and PATCHes the new tunnel URL to
`/api/mcq-config` (and `/api/syllabus-config`) after every tunnel restart.
Checks every 30s. A tunnel whose public URL fails 3 probes is restarted.

Setup on the host (WSL, systemd enabled):
1. `~/.config/divergencie/tunnel-sync.env` (chmod 600): `SITE`, `MGMT_USER`, `MGMT_PASS` (a Management login).
2. `~/.config/systemd/user/question-solver.service`: `ExecStart` = this script, `Restart=always`,
   `KillMode=control-group`, `Environment=NODE_BIN=<absolute path to node>` (systemd does not see nvm's PATH),
   `Environment=ENABLED_SERVICES=mcq syllabus` (default is both), and `Environment=PATH=...` including the python that has PyMuPDF
   (miniconda3/bin here). Without it the digitizer runs the system python3 and every PDF fails with "Failed to process the uploaded PDFs."
3. `systemctl --user enable --now question-solver.service`; `loginctl enable-linger $USER`.
4. Windows must start WSL at boot (Task Scheduler: `wsl.exe -d Ubuntu -- sleep infinity` at logon/startup),
   otherwise nothing runs after a Windows reboot.

Logs: `journalctl --user -u question-solver`; per-service logs in `~/.local/state/question-solver/`.

## Reconnect Google (TKT-0321)

The app creates Drive files and sends Gmail as the DivergenCIE Gmail account through a stored refresh token. When that token
expires (Google expires them after 7 days while the OAuth consent screen is in Testing mode) the app shows "The Google login
DivergenCIE uses ... has expired" and writes one entry to the app log.

1. In Google Cloud, set the OAuth consent screen's publishing status to **In production** (stops the 7 day expiry).
2. As the account owner, on a computer with a browser: `node --env-file=.env.local scripts/ops/google-reauth.mjs`, open the link, sign in.
3. Put the printed value into `GOOGLE_OAUTH_REFRESH_TOKEN` in Vercel (Production) and `.env.local`, then redeploy.

## Node for the unit (TKT-0419, 14 Nov 2026)

The unit sets `NODE_BIN=~/.local/bin/node-qs`, a link to the Node 22 install (the Supabase client needs Node 22 or later; Node 20 starts but the leaderboard fails). It used to point straight at `~/.nvm/versions/node/v22.22.2/bin/node`; when that folder went missing after a restart, the supervisor kept failing to start the servers while the tunnels stayed up, and production answered 502. If Node changes again, repoint the link (`ln -sfn <new node> ~/.local/bin/node-qs`) and `systemctl --user restart question-solver`. The user's crontab (NPC browser jobs, monthly invoice and paycheck jobs) still uses the `v22.22.2` path directly.

## Daily YouTube upload (TKT-0358)

`daily_upload.sh` runs `daily_upload.py`: it works out the current quota day (starts 16:00), uploads the remaining slots as unlisted after checking each file, loads the Recording Library, and writes `~/.local/state/daily-upload/status.json` plus one log per run in `runs/`. Idempotent and locked, so it can run often. It is started by the Windows scheduled task "DivergenCIE daily YouTube upload" (16:07, hourly for 8 hours, and at logon), registered from `C:\Users\<user>\dcp1-tasks\register_daily_upload.ps1` with `schtasks.exe`. `--dry-run` decides and checks without uploading.
