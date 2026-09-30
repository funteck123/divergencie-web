# Plan: Question Solver and Syllabus Viewer on our own domain

Goal: a student only ever sees our domain (`www.divergencie.co.uk`) in the address bar and in the network log. The Cloudflare quick tunnels and the URL sync stay exactly as they are. Plan only, nothing built.

## 1. What happens today (checked in the code)

| Tool | What the student opens | Domain change visible? |
|---|---|---|
| Question Solver | `/mcq-digitizer/index.html`, a static page served from our own domain (`public/mcq-digitizer/`). Its API calls go to `/api/mcq/*`, a same-origin proxy (`app/api/mcq/[...path]/route.js`) that reads the current tunnel URL from Supabase (`mcqconfig`) on every request. | Not in the address bar. Only the path name `/mcq-digitizer/index.html` is technical. One leak: `GET /api/mcq-config` returns the tunnel URL to any logged-in session (visible in the browser network log). |
| Syllabus Viewer | A direct link built in `components/ResourcesSection.jsx`: `${syllabusViewerUrl}?account=...&name=...`. It opens the tunnel page itself on `*.trycloudflare.com`. | **Yes.** This is the visible change. |

Other facts that shape the plan:

- The Syllabus page is one HTML file (`prototypes/syllabus-digitizer/index.html`, 40 KB) served by `prototypes/syllabus-digitizer/server.mjs` on port 5177. It calls root-absolute paths: `/api/syllabi`, `/api/syllabi/<file>`, `/images/<path>`, `/api/topic-complete`, `/api/progress`, `/api/progress/all`, `/api/leaderboard`. Those collide with our own `/api/*` routes, so it cannot simply be shown under a path prefix.
- Identity on the Syllabus page is the URL parameters `?account=&name=`. There is no session check, so anyone can write progress for any account.
- The syllabus images are 349 MB on the home machine and travel through the tunnel today.
- The supervisor (`scripts/ops/question-solver-supervisor.sh`, run by `question-solver.service`) starts both servers and both quick tunnels, then sends each new tunnel URL to `/api/mcq-config` and `/api/syllabus-config` after every restart. The Syllabus URL is stored by `lib/mcqConfig.js` (`getSyllabusViewerUrl`).

## 2. Options

### A. Same pattern as the Question Solver (recommended)

Serve the Syllabus page from our domain and proxy its data through a same-origin API route that reads the live tunnel URL.

1. Move the page to `public/syllabus/index.html` (or an `app/syllabus` page).
2. Change its fetches: `/api/syllabi` becomes `/api/syllabus/syllabi`, `/images/...` becomes `/api/syllabus/images/...`, and the progress and leaderboard calls move under `/api/syllabus/` too.
3. Add `app/api/syllabus/[...path]/route.js`:
   - `requireSession` first. The real session replaces `?account=&name=`; the proxy adds `account` and `name` server side and ignores client values.
   - Read the tunnel URL with `getSyllabusViewerUrl()`, cache it for about 30 seconds.
   - Allow only a fixed list of upstream paths (regex per route). It must not become an open proxy.
   - Stream image responses through. Set `Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800` on images and on the subject list, so the Vercel CDN serves repeats and the home machine sees far less traffic.
   - Timeout about 15 s. On a dead tunnel return 503, and the page shows a neutral state.
4. Point the Resources link at `/syllabus` (add a rewrite from `/syllabus` to `/syllabus/index.html`). Optionally add `/question-solver` as a rewrite to the existing page so the technical path name disappears too.
5. Supervisor and tunnels: no change.

Effort: about 1 to 1.5 days including tests. Risk: low, the pattern already runs in production for the Question Solver.

Cost to watch: every uncached image and API call passes through a Vercel function, so Vercel function time and bandwidth rise a little. CDN caching of images addresses most of it.

### B. Vercel Routing Middleware rewrite to the tunnel

A middleware rule rewrites `/syllabus/*` to the tunnel origin, so no function sits in the path and big images stream straight through.

- Needs the tunnel URL readable at the edge quickly (Global Config or a cached Supabase call), which means the supervisor also writes the URL there. That is a small change to the "same setup".
- The page's root-absolute paths still need the prefix handling from option A, step 2.
- Session checking in middleware is possible but less convenient than in a route.

Choose this if option A's function cost turns out high.

### C. Named Cloudflare tunnel on a subdomain (`syllabus.divergencie.co.uk`)

- Needs the domain's DNS on Cloudflare and a named tunnel (login, config, token). Quick tunnels cannot use a custom hostname.
- Stable URL, no URL sync needed. The address bar shows a subdomain of our domain, which is a host change, although a branded one.
- This is a bigger change than "use the existing setup". Consider later for stability.

### D. Cloudflare Worker route on the main domain

Only possible if the domain's DNS is on Cloudflare. Same idea as B at Cloudflare's edge. Not applicable until the DNS question is answered.

## 3. Recommendation

Do A now. It matches how the Question Solver already works, keeps the quick tunnels and the URL sync untouched, and fixes the real leak (the `trycloudflare.com` link). Revisit C only if quick-tunnel restarts become a problem for students.

## 4. Steps if approved

1. Copy `prototypes/syllabus-digitizer/index.html` to `public/syllabus/index.html`; rewrite fetch paths and image paths as in option A.
2. Write `app/api/syllabus/[...path]/route.js` with session, allow-list, timeout, caching headers, and server-side identity.
3. Change `components/ResourcesSection.jsx` to link `/syllabus`; remove the use of the tunnel URL in the browser.
4. Stop `GET /api/syllabus-config` and `GET /api/mcq-config` returning the tunnel URL to students: keep GET for Management only. Today both answer any logged-in session (checked in `app/api/syllabus-config/route.js` and `app/api/mcq-config/route.js`). The supervisor uses PATCH, which stays Management only.
5. Add rewrites for `/syllabus` and `/question-solver`.
6. Health check cron (`app/api/cron/health-check/route.js`) keeps reading the same config, no change.
7. Close the known scoping gap in `app/api/mcq/[...path]/route.js`: only the library list is filtered by enrolment today; other paths pass through. Decide the same rule for the Syllabus.

## 5. Tests that prove it

- Open both tools in a browser; list every network request; none may contain `trycloudflare.com`. Also grep the responses and the JS bundles for it.
- Address bar shows only our domain on every screen, including after a tunnel restart.
- Restart the tunnel service: the URL sync updates, the next student request works without a deploy.
- Without a session every `/api/syllabus/*` call returns 401. With a session, writing progress for another account is impossible.
- Phone widths load the page and images; images are served from the CDN cache on the second request (`x-vercel-cache: HIT`).
- Tunnel down: the page shows a neutral state, no stack trace, no tunnel URL in the error.

## 6. Decisions needed from you

1. Path names: `/syllabus` and `/question-solver`, or keep the current names.
2. Should the Syllabus be limited to enrolled subjects, like the Question Solver library?
3. Is the domain's DNS on Cloudflare? (Decides whether options C and D exist.)
4. Accept a small rise in Vercel function use for option A, or prefer option B?
