// Route-level loading UI: shown automatically (via Suspense) in the dashboard
// content area while a page segment loads, so navigation no longer flashes a
// blank area. Self-contained skeleton — no client deps.
export default function DashboardLoading() {
    return (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading…</span>

            {/* Title bar */}
            <div className="h-8 w-48 rounded-lg bg-black/5 dark:bg-white/10 animate-pulse" />

            {/* Content cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border p-6 space-y-4"
                        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
                    >
                        <div className="h-5 w-1/2 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
                        <div className="h-4 w-3/4 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
