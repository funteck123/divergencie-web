# DivergenCIE Coaching — Build Plan & Session Tracker

**Domain:** divergencie.co.uk  
**Stack:** HTML5 · Tailwind CDN · Lucide Icons · Satoshi Font · Lottie  
**Reference:** Athena Education homepage — clone layout, rebrand for DivergenCIE  

---

## ⚠️ AGENT INSTRUCTIONS (READ FIRST EVERY SESSION)

1. Read this `PLAN.md` — find the next `⬜ TODO` section
2. Read `index.html` to understand current state
3. Build **only that one section** — append HTML before `</body>`, add CSS to `css/styles.css`, JS to `js/main.js`
4. **ZIP immediately:** `cd /home/claude && zip -r divergencie-v[N].zip divergencie/`
5. Present ZIP to user
6. Mark section `✅ Done` in this file
7. **STOP** — wait for user to say "continue"

Token budget is limited. One section per ZIP. Never skip ahead.

---

## Brand

| Token | Value |
|-------|-------|
| Primary bg | `#0a0a0a` |
| Secondary bg | `#111111` |
| Tertiary bg | `#1a1a1a` |
| Gold accent | `#f5c842` |
| Gold dim | `#c9a030` |
| Text primary | `#ffffff` |
| Text muted | `rgba(255,255,255,0.55)` |
| Font | Satoshi (900/700/500/400) |
| Tone | Bold · irreverent · results-driven · premium UK |

**Logo:** `assets/images/logo.jpg` — book icon with coloured tabs + bold serif wordmark  
**Accreditation logos:** Cambridge Assessment International Education + CollegeBoard  
**UK context:** Replace Ivy League → Oxford, Cambridge, LSE, Imperial, UCL, Durham, Warwick, Edinburgh

---

## Section Build Status

| # | Section | File refs | Status |
|---|---------|-----------|--------|
| 0 | Base HTML shell + `<head>` | index.html | ✅ Done |
| 1 | Nav (fixed, logo, mobile) | index.html, css/styles.css, js/main.js | ✅ Done |
| 2 | Hero (fullscreen, headline, CTA) | index.html, css/styles.css | ✅ Done |
| 3 | Results Ticker Bar (2025-26 admits) | index.html | ✅ Done |
| 4 | Stats — "They Can't Refuse" counters | index.html | ⬜ TODO |
| 5 | Global Map section | index.html | ⬜ TODO |
| 6 | "Are You?" personality section | index.html | ✅ Done |
| 7 | What's Cooking — 3 service cards | index.html | ⬜ TODO |
| 8 | Our Results + university logos | index.html | ⬜ TODO |
| 9 | Partners / Co-Conspirators | index.html | ⬜ TODO |
| 10 | Press / Paparazzi logos | index.html | ⬜ TODO |
| 11 | Testimonials carousel | index.html | ⬜ TODO |
| 12 | Social feed CTA | index.html | ⬜ TODO |
| 13 | FAQ accordion | index.html | ⬜ TODO |
| 14 | Footer CTA banner + Footer | index.html | ⬜ TODO |

---

## CDN Links (exact, do not change)

```
Tailwind:  https://cdn.tailwindcss.com
Lucide:    https://unpkg.com/lucide@latest
Satoshi:   https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap
Lottie:    https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js
```

## File Structure
```
divergencie/
├── index.html
├── README.md
├── PLAN.md
├── assets/
│   ├── images/logo.jpg
│   └── fonts/
├── css/styles.css
└── js/main.js
```
