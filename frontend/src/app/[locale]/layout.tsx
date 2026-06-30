import type { Metadata } from 'next';
import { getDictionary, getDirection, type Locale } from '@/i18n/config';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import HelpSystem from '@/components/ui/HelpSystem';
import '../globals.css';

export const metadata: Metadata = {
    title: 'SaaS Accounting System',
    description:
        'Cloud-based accounting platform for trading businesses - wholesale & retail',
};

export async function generateStaticParams() {
    return [{ locale: 'en' }, { locale: 'ar' }];
}

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: Locale };
}) {
    const locale = params.locale || 'en';
    const direction = getDirection(locale);
    const dict = await getDictionary(locale);

    return (
        <html lang={locale} dir={direction} className="dark" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            try {
                                var t = localStorage.getItem('theme');
                                if (t === 'light') {
                                    document.documentElement.classList.remove('dark');
                                }
                            } catch(e) {}
                        })();
                    `
                }} />
                {/* Self-heal stale service worker: a previous PWA build precached old
                    JS chunks and served them CacheFirst, freezing the UI. This unregisters
                    any worker, purges caches, and reloads once so fresh code is loaded. */}
                <script dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            if (!('serviceWorker' in navigator)) return;
                            try {
                                navigator.serviceWorker.getRegistrations().then(function(regs) {
                                    if (!regs.length) return;
                                    if (sessionStorage.getItem('sw-purged') === '1') return;
                                    sessionStorage.setItem('sw-purged', '1');
                                    Promise.all(regs.map(function(r) { return r.unregister(); })).then(function() {
                                        var done = function() { location.reload(); };
                                        if (window.caches && caches.keys) {
                                            caches.keys().then(function(keys) {
                                                return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                                            }).then(done, done);
                                        } else {
                                            done();
                                        }
                                    });
                                });
                            } catch (e) {}
                        })();
                    `
                }} />
            </head>
            <body
                className={`${direction === 'rtl' ? 'font-arabic' : 'font-sans'} min-h-screen`}
            >
                <ThemeProvider>
                    <QueryProvider>
                        <ErrorBoundary>
                            {children}
                            <HelpSystem locale={locale} />
                        </ErrorBoundary>
                    </QueryProvider>
                    <Toaster
                        position={direction === 'rtl' ? 'bottom-left' : 'bottom-right'}
                        reverseOrder={false}
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: 'var(--bg-modal)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '0.75rem',
                                fontSize: '0.875rem',
                                boxShadow: 'var(--shadow-modal)',
                                direction,
                            },
                            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                        }}
                    />
                </ThemeProvider>
            </body>
        </html>
    );
}
