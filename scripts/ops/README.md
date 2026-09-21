# Question Solver / Syllabus Viewer supervisor (TKT-0262)

`question-solver-supervisor.sh` runs both standalone servers and their Cloudflare
quick tunnels, restarts whichever is down, and PATCHes the new tunnel URL to
`/api/mcq-config` (and `/api/syllabus-config`) after every tunnel restart.
Checks every 30s. A tunnel whose public URL fails 3 probes is restarted.

Setup on the host (WSL, systemd enabled):
1. `~/.config/divergencie/tunnel-sync.env` (chmod 600): `SITE`, `MGMT_USER`, `MGMT_PASS` (a Management login).
2. `~/.config/systemd/user/question-solver.service`: `ExecStart` = this script, `Restart=always`,
   `KillMode=control-group`, `Environment=NODE_BIN=<absolute path to node>` (systemd does not see nvm's PATH),
   `Environment=ENABLED_SERVICES=mcq syllabus` (default is both).
3. `systemctl --user enable --now question-solver.service`; `loginctl enable-linger $USER`.
4. Windows must start WSL at boot (Task Scheduler: `wsl.exe -d Ubuntu -- sleep infinity` at logon/startup),
   otherwise nothing runs after a Windows reboot.

Logs: `journalctl --user -u question-solver`; per-service logs in `~/.local/state/question-solver/`.
