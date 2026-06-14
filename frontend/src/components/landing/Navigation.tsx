import Link from 'next/link';

export default function Navigation({ isRTL, locale, dict }: { isRTL: boolean, locale: string, dict: any }) {
    return (
        <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl" style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-default)' }}>
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                        <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>$</span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{dict.common.appName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link href={isRTL ? '/en' : '/ar'}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'English' : 'العربية'}
                    </Link>
                    <Link href={`/${locale}/login`}
                        className="text-sm px-5 py-2 rounded-xl font-medium transition-all"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                        {dict.common.login}
                    </Link>
                    <Link href={`/${locale}/register`}
                        className="btn-primary text-sm px-5 py-2">
                        {dict.common.register}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
