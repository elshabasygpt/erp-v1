import Link from 'next/link';

export default function HeroSection({ isRTL, locale, dict, stats }: { isRTL: boolean, locale: string, dict: any, stats: any[] }) {
    return (
        <section className="relative min-h-screen flex items-center pt-16">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 -left-20 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
                <div className="absolute top-1/3 left-1/2 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
                <div className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `radial-gradient(circle, var(--text-muted) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 animate-fade-in"
                        style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--color-primary)' }}>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {isRTL ? 'متوافق مع هيئة ZATCA' : 'ZATCA Compliant'}
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-slide-up">
                        <span style={{ color: 'var(--text-heading)' }}>
                            {isRTL ? 'أدِر أعمالك' : 'Run your business'}
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent animate-gradient"
                            style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa, #6366f1)', backgroundSize: '200% 200%' }}>
                            {isRTL ? 'بذكاء وكفاءة' : 'smarter & faster'}
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl mb-10 animate-slide-up leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)', animationDelay: '100ms' }}>
                        {isRTL
                            ? 'نظام محاسبي سحابي متكامل يدير مبيعاتك، مخزونك، وتقاريرك المالية مع التوافق الكامل مع ضريبة القيمة المضافة.'
                            : 'A comprehensive cloud accounting system that manages your sales, inventory, and financial reports with full VAT compliance.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
                        <Link href={`/${locale}/login`}
                            className="btn-primary text-base px-10 py-4 flex items-center justify-center gap-2">
                            {dict.common.login}
                            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                        <Link href={`/${locale}/register`}
                            className="btn-secondary text-base px-10 py-4">
                            {isRTL ? 'ابدأ مجاناً' : 'Start Free Trial'}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '400ms' }}>
                    {stats.map((s, i) => (
                        <div key={i} className="text-center p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <p className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{s.value}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
