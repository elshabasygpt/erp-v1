import { getDictionary, type Locale } from '@/i18n/config';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: Locale };
}) {
    const dict = await getDictionary(params.locale);

    return (
        <div className="min-h-screen bg-surface-950">
            <Sidebar locale={params.locale} dict={dict} />

            {/* Main Content */}
            <main className="ms-64 min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-20 h-16 bg-surface-950/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <svg
                                className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                                <input
                                    type="text"
                                    aria-label={dict.common.search}
                                    placeholder={dict.common.search}
                                    className="input-field ps-10 w-80 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <button aria-label="Notifications" className="w-9 h-9 rounded-xl bg-surface-800 border border-white/10 flex items-center justify-center hover:bg-surface-700 transition-colors">
                                <svg
                                    className="w-4 h-4 text-surface-200/60"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                            </button>

                            {/* User Avatar */}
                            <div aria-label="User Profile" role="button" tabIndex={0} className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                                A
                            </div>
                        </div>
                </header>

                {/* Page Content */}
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
