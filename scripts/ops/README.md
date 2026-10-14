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
