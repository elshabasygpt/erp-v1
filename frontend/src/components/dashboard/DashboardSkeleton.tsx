function Pulse({ className = '' }: { className?: string }) {
    return (
        <div
            className={`rounded-xl animate-pulse ${className}`}
            style={{ background: 'var(--bg-surface-secondary)' }}
        />
    );
}

export default function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <Pulse className="h-8 w-52" />
                    <Pulse className="h-4 w-72" />
                </div>
                <div className="flex gap-3">
                    <Pulse className="h-10 w-36 rounded-xl" />
                    <Pulse className="h-10 w-24 rounded-xl" />
                    <Pulse className="h-10 w-28 rounded-xl" />
                </div>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Pulse key={i} className="h-20 rounded-xl" />
                ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Pulse key={i} className="h-36 rounded-2xl" />
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Pulse className="lg:col-span-2 h-80 rounded-2xl" />
                <Pulse className="h-80 rounded-2xl" />
            </div>

            {/* Summary sections */}
            <Pulse className="h-72 rounded-2xl" />
            <Pulse className="h-72 rounded-2xl" />

            {/* Side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Pulse className="h-64 rounded-2xl" />
                <Pulse className="h-64 rounded-2xl" />
            </div>

            {/* 3-col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Pulse className="h-56 rounded-2xl" />
                <Pulse className="h-56 rounded-2xl" />
                <Pulse className="h-56 rounded-2xl" />
            </div>
        </div>
    );
}
