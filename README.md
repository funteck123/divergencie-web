# DivergenCIE Coaching — Homepage Prototype

> Prototype before Next.js + Firebase deployment on [divergencie.co.uk](https://divergencie.co.uk)

## Stack
- HTML5 (single-page prototype)
- [Tailwind CSS](https://tailwindcss.com) via CDN
- [Lucide Icons](https://lucide.dev)
- [Satoshi Font](https://www.fontshare.com/fonts/satoshi) via Fontshare
- [Lottie Player](https://lottiefiles.com/lottie-player)

## Structure
```
divergencie/
├── index.html              ← Main homepage
├── README.md               ← This file
├── PLAN.md                 ← Build tracker (agents read this first)
├── assets/
│   ├── images/
│   │   └── logo.jpg        ← DivergenCIE logo
│   └── fonts/              ← (reserved for local fonts if needed)
├── css/
│   └── styles.css          ← Global styles (imported in index.html)
└── js/
    └── main.js             ← Global scripts (imported in index.html)
```

## Build Progress
See `PLAN.md` for section-by-section build status.

## Next.js Migration
This prototype maps 1:1 to the Next.js app structure:
- Each section → `components/sections/[SectionName].tsx`
- `css/styles.css` → `styles/globals.css`
- `js/main.js` → component-level hooks/effects

## Accreditation
Cambridge Assessment International Education + CollegeBoard certified coaching.
