import type { Metadata } from 'next';
import { getDictionary, getDirection, type Locale } from '@/i18n/config';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
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
            </head>
            <body
                className={`${direction === 'rtl' ? 'font-arabic' : 'font-sans'} min-h-screen`}
            >
                <ThemeProvider>
                    <QueryProvider>{children}</QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
