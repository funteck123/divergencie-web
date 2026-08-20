# UI reference — 20 admin dashboard / data-table examples

Gathered for a visual-only refresh of this app's admin portal (brand colors,
functionality, and information architecture unchanged — this is about
spacing, typography, card/table treatment). All links verified reachable
during research; screenshots captured live via Playwright where the demo
allowed it without a private account.

## Clean / minimal (shadcn-style)

1. **next-shadcn-dashboard-starter** (Kiranism) — the most-starred shadcn
   admin dashboard starter; Next.js 16, React 19, Tailwind v4, TanStack
   Table with server-side search/filter/pagination, kanban, 6 themes.
   Repo: https://github.com/Kiranism/next-shadcn-dashboard-starter · Demo: https://shadcn-dashboard.kiranism.dev
   Screenshot: `kiranism-shadcn-dashboard.png`

2. **Precedent** (steven-tey) — clean Next.js SaaS starter, minimal
   card/table styling, soft shadows, generous whitespace.
   Repo: https://github.com/steven-tey/precedent · Demo: https://precedent.dev
   Screenshot: `precedent.png`

3. **cult/ui** (nolly-studio) — shadcn-based component library with more
   playful/animated primitives (useful for hover states, transitions).
   Repo: https://github.com/nolly-studio/cult-ui · Demo: https://www.cult-ui.com
   Screenshot: `cult-ui.png`

4. **shadcn/ui Taxonomy** — the original shadcn reference app by the
   library's own author; canonical "correct" shadcn styling.
   Repo: https://github.com/shadcn-ui/taxonomy (no public live demo)

5. **next-forge** (Vercel) — production monorepo SaaS starter, shadcn-based,
   restrained/neutral visual style.
   Repo: https://github.com/vercel/next-forge (no public live demo)

## Dense data-grid style (closest to this app's actual table-heavy screens)

6. **React-admin demo** (marmelab) — the reference "e-commerce admin"
   demo; dense sidebar nav, stat tiles, real CRUD data tables. Logged in
   with the public `demo/demo` hint to capture the real dashboard + an
   Orders table, not just the login screen.
   Repo: https://github.com/marmelab/react-admin · Demo: https://marmelab.com/react-admin-demo/
   Screenshots: `react-admin-marmelab.png` (dashboard), `react-admin-marmelab-table.png` (Orders table)

7. **Ant Design Pro** — the canonical dense enterprise-admin look (heavy
   data tables, compact filters, lots of information density) — closest
   existing style to this app's current native-table approach, just far
   more polished.
   Repo: https://github.com/ant-design/ant-design-pro · Demo: https://preview.pro.ant.design/dashboard/analysis
   Screenshot: `antd-pro.png`

8. **Skateshop** (sadmann7) — Next.js commerce admin with TanStack Table,
   dense product/order tables, shadcn styling.
   Repo: https://github.com/sadmann7/skateshop (no public live demo)

9. **TanStack Table** (official examples) — not a themed dashboard, but
   the actual table library this app's list views most resemble
   structurally; worth studying for sort/filter/pagination UI patterns.
   Repo: https://github.com/TanStack/table · Docs/examples: https://tanstack.com/table/latest

10. **SvelteForge Admin** — full-stack admin (SvelteKit, Tailwind v4,
    shadcn-svelte) with real RBAC + a real DB; dense but modern table
    styling, worth a look even though it's Svelte not React.
    Repo: search "SvelteForge Admin" on GitHub (no stable public demo found)

## SaaS / colorful style

11. **Velora UI** (ColorlibHQ) — SaaS-flavored admin with more color use
    than most shadcn starters (gradients, colored stat cards).
    Repo: https://github.com/ColorlibHQ/velora-ui · Demo: https://velora.colorlib.com
    Screenshot: `velora-ui.png`

12. **SaaS Boilerplate** (ixartz) — Next.js + Stripe SaaS starter, colorful
    marketing-adjacent admin styling, dashboard + billing screens.
    Repo: https://github.com/ixartz/SaaS-Boilerplate · Demo: https://react-saas.com
    Screenshot: `ixartz-saas-boilerplate.png`

13. **Next.js Enterprise Boilerplate** (Blazity) — more corporate/neutral
    but well-structured layout patterns, good for card/section spacing
    reference.
    Repo: https://github.com/Blazity/next-enterprise · Demo: https://next-enterprise.vercel.app
    Screenshot: `next-enterprise-boilerplate.png`

14. **MUI Dashboard Template** (Material UI) — Google Material-style
    admin, different visual language (elevation/shadows, filled inputs)
    than shadcn's flat/bordered look — useful contrast to consider.
    Docs/demo: https://mui.com/material-ui/getting-started/templates/dashboard/
    Screenshot: `mui-dashboard-template.png`

15. **Tabler** — most-starred free open-source admin template overall;
    Bootstrap-based (not React/Tailwind, so not directly portable, but a
    strong density/icon/chart reference).
    Repo: https://github.com/tabler/tabler · Demo: https://tabler.io/admin-template
    Screenshot: `tabler-admin.png`

## Meta-frameworks / low-code (structural reference, not directly stylistic)

16. **Refine** — React meta-framework purpose-built for admin
    panels/internal tools/CRUD; their Finefoods example admin panel is a
    good reference for a booking/ops-heavy admin (closest domain match to
    this app's enrollment/schedule/billing screens).
    Repo: https://github.com/refinedev/refine · Examples: https://refine.dev/docs/examples/

17. **NocoBase** — no-code/low-code internal-tool builder; demo requires
    an account (no public guest credentials found), so only the login
    screen could be captured — worth checking their own marketing
    screenshots on GitHub instead of this repo's capture.
    Repo: https://github.com/nocobase/nocobase · Demo: https://demo.nocobase.com
    Screenshot: `nocobase.png` (login screen only)

18. **Appsmith** — open-source low-code internal-tool builder; strong
    reference for form-heavy admin screens (this app has many multi-field
    forms — enrollment, service editor, manual invoice/paycheck).
    Repo: https://github.com/appsmithorg/appsmith (self-hosted demo only, no public guest instance)

19. **Budibase** — similar low-code internal-tool space; auto-generated
    CRUD screens, worth a look for table+form combo patterns.
    Repo: https://github.com/Budibase/budibase (self-hosted demo only)

20. **AdminLTE** — the long-standing "classic" dense admin template many
    teams compare against; couldn't reach demo.adminlte.io from this
    environment (network-level, not necessarily actually down), but it's
    the most direct conceptual match to this app's current plain-table
    style, just far more refined — worth opening in your own browser.
    Repo: https://github.com/ColorlibHQ/AdminLTE · Demo: https://adminlte.io/themes/v3/index3.html
