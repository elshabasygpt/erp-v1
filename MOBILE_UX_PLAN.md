# Mobile UX Development Plan

Grounded in a live audit (390×800, matchMedia verified) + static scan of the
frontend. Updated: 2026-07-01.

## Current mobile state — already solid

The app is **not** starting from zero on mobile:

- **Navigation is complete**: `MobileHeader.tsx` (fixed top bar + hamburger, `md:hidden`,
  h=56 confirmed live), `BottomNav.tsx` (fixed bottom nav, h=65 confirmed live), and
  `Sidebar.tsx` renders as a slide-in drawer (`translate-x` + backdrop) on `< md`.
- **Responsive layout is the norm**: 115 files use breakpointed grids
  (`grid-cols-1 sm/md/lg:grid-cols-*`); 72 files already wrap tables in `overflow-x`.
- **Live checks clean**: dashboard home, inventory, and sales at 390px showed **no
  horizontal overflow** and **no cramped grid cells** (smallest KPI cell = 95px).
- Dark mode (default) + light mode both render correctly at mobile width.

So this is a **targeted hardening pass**, not a rebuild.

## Audit findings — concrete risk areas

| Risk | Count | Impact |
|---|---|---|
| `<table>` with **no `overflow-x`** wrapper anywhere in the file | **39 files** | A wide table forces the whole page to scroll horizontally on a phone — the #1 mobile break |
| Multi-col grids (`grid-cols-3..6`) with **no breakpoint** prefix | 23 files | Fine today with small KPI content (0 cramped live), but risky if content grows or on <360px |
| Fixed pixel widths (`w-[NNNpx]`) | 43 occurrences | Can overflow narrow viewports if used on a top-level container |

## Phases

**Phase M1 — Table horizontal-scroll hardening (highest value).**
Wrap every data `<table>` that isn't already inside a horizontal-scroll container
in `<div className="overflow-x-auto">` (or add the class to the existing wrapper).
39 files. Defensive: harmless when the table already fits, protective when it's wide.

**Phase M2 — Responsive grid breakpoints.**
Give the non-responsive multi-col grids a mobile-first breakpoint
(`grid-cols-2 sm:grid-cols-N` / `grid-cols-1 sm:grid-cols-N`), skipping the ones
that are intentionally fixed for mobile (BottomNav's N-icon row, DashboardSkeleton,
print templates). ~15–18 files after exclusions.

**Phase M3 — Fixed-width → responsive.**
Audit the 43 `w-[NNNpx]`; convert the ones on layout containers/modals to
`w-full max-w-[NNNpx]` so they never exceed the viewport. Leave intentional small
fixed sizes (icons, avatars, badges).

**Phase M4 — Touch targets + spacing spot-check.**
Verify primary interactive controls are ≥ ~40px tall on mobile and tap spacing is
adequate on the highest-traffic screens (POS, sales list, dashboard). Fix only
concrete misses.

**Review (every phase).** tsc + clean build, then a live pass at 390px on the
touched screen categories (overflow + layout via the accessibility tree / computed
styles, since screenshots are unreliable in this preview), plus an adversarial
code-review of the diff before commit + push.

## Out of scope (needs human design QA)
Pixel-level spacing/typography refinement, gesture interactions, and per-screen
visual polish across all ~100 screens — best done as a manual QA pass on a real
device with design criteria, not mechanical edits.
