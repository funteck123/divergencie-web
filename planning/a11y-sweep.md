# Accessibility and width sweep

Axe-core (WCAG 2.x A and AA) on every page the journeys reach, at widths 390, 768, 1024, 1280, 1440, 1920. Pages: scanned at load and at the end of each journey.

## Violations

| Rule | Impact | Widths | Pages | Example |
|---|---|---|---|---|
| hscroll: page scrolls sideways | none | 390 | /v2/parent | `undefined` |
| document-title: Documents must have <title> element to aid in navigation | serious | 390, 768, 1024, 1280, 1440, 1920 | /dashboard/student, /dashboard/management | `#__next_error__` |
| html-has-lang: <html> element must have a lang attribute | serious | 390, 768, 1024, 1280, 1440, 1920 | /dashboard/student, /dashboard/management | `#__next_error__` |
| color-contrast: Elements must meet minimum color contrast ratio thresholds | serious | 1280, 1440, 1920 | /dashboard/management | `.btn` |

## Horizontal scroll

- /v2/parent at 390px

## Journey results by width

- 390px: perf_budgets.py
- 768px: all journeys passed
- 1024px: all journeys passed
- 1280px: all journeys passed
- 1440px: all journeys passed
- 1920px: all journeys passed
