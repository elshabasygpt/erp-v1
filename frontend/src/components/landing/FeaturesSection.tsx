export default function FeaturesSection({ isRTL, features }: { isRTL: boolean, features: any[] }) {
    return (
        <section className="py-20 md:py-28 relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
                        {isRTL ? 'المميزات' : 'Features'}
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'كل ما تحتاجه في مكان واحد' : 'Everything you need in one place'}
                    </h2>
                    <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL
                            ? 'أدوات متكاملة لإدارة أعمالك التجارية من المبيعات إلى التقارير المالية'
                            : 'Integrated tools to manage your business from sales to financial statements'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={i}
                            className="glass-card p-7 group cursor-default"
                            style={{ animationDelay: `${i * 100}ms` }}>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} bg-opacity-15 flex items-center justify-center text-2xl mb-5 transition-transform duration-300 group-hover:scale-110`}
                                style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))` }}>
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-heading)' }}>{f.title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
