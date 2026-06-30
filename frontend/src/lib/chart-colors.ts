/**
 * Shared chart palette — single source of truth for Recharts series colors.
 *
 * These hex values mirror the `--chart-1..6` CSS tokens (light-mode anchors) so
 * charts stay on-brand and consistent across every dashboard. Recharts needs
 * concrete color strings (it writes SVG fill/stroke), so we expose hexes here
 * rather than `var(--chart-*)`.
 *
 * Anchored on the emerald brand primary. Replaces the per-file `['#6366f1', …]`
 * arrays that started with an off-brand indigo.
 */
export const CHART_COLORS = [
    '#10b981', // chart-1 — emerald (primary series)
    '#0ea5e9', // chart-2 — sky
    '#f59e0b', // chart-3 — amber
    '#f43f5e', // chart-4 — rose
    '#8b5cf6', // chart-5 — violet
    '#14b8a6', // chart-6 — teal
] as const;

/** Primary single-series color (revenue/sales lines, headline bars). */
export const CHART_PRIMARY = CHART_COLORS[0];

/** Pick a color by index, wrapping around the palette. */
export function chartColor(i: number): string {
    return CHART_COLORS[i % CHART_COLORS.length];
}
