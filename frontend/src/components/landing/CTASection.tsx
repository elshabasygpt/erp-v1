import Link from 'next/link';

export default function CTASection({ isRTL, locale, dict }: { isRTL: boolean, locale: string, dict: any }) {
    return (
        <section className="py-20 md:py-28 relative">
            <div className="max-w-4xl mx-auto px-6">
                <div className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1, #8b5cf6)',
                    }}>
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                            {isRTL ? 'جاهز لبدء رحلتك المالية؟' : 'Ready to get started?'}
                        </h2>
                        <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
                            {isRTL
                                ? 'ابدأ تجربتك المجانية اليوم واكتشف كيف يمكن لنظامنا تبسيط عملياتك المالية.'
                                : 'Start your free trial today and discover how our system can simplify your financial operations.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href={`/${locale}/register`}
                                className="px-10 py-4 rounded-xl bg-white text-indigo-700 font-bold text-base transition-all hover:shadow-lg hover:shadow-white/20 hover:-translate-y-1">
                                {isRTL ? 'ابدأ مجاناً' : 'Start Free Trial'}
                            </Link>
                            <Link href={`/${locale}/login`}
                                className="px-10 py-4 rounded-xl bg-white/15 text-white font-semibold text-base border border-white/20 transition-all hover:bg-white/25">
                                {dict.common.login}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
