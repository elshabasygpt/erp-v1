import { getDictionary, type Locale } from '@/i18n/config';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default async function HomePage({
    params,
}: {
    params: { locale: Locale };
}) {
    const dict = await getDictionary(params.locale);
    const isRTL = params.locale === 'ar';

    const features = [
        { icon: '📊', title: isRTL ? 'محاسبة متقدمة' : 'Smart Accounting', desc: isRTL ? 'شجرة حسابات، قيود آلية، ميزان مراجعة، قوائم مالية' : 'Chart of Accounts, Auto Journals, Trial Balance & Financials', gradient: 'from-indigo-500 to-purple-600' },
        { icon: '🏪', title: isRTL ? 'نقاط البيع' : 'POS System', desc: isRTL ? 'فواتير نقدية وآجلة مع ضريبة وخصومات وباركود' : 'Cash & credit invoices with VAT, discounts & barcode', gradient: 'from-emerald-500 to-teal-600' },
        { icon: '📦', title: isRTL ? 'إدارة المخزون' : 'Inventory', desc: isRTL ? 'تعدد مستودعات، باركود، تنبيه مخزون، حركات' : 'Multi-warehouse, barcode, stock alerts & movements', gradient: 'from-amber-500 to-orange-600' },
        { icon: '🧾', title: isRTL ? 'فوترة إلكترونية' : 'e-Invoicing', desc: isRTL ? 'متوافق مع هيئة الزكاة والضريبة (ZATCA)' : 'ZATCA-compliant e-invoicing with QR codes', gradient: 'from-cyan-500 to-blue-600' },
        { icon: '📈', title: isRTL ? 'تقارير مالية' : 'Financial Reports', desc: isRTL ? 'تقارير آنية للمبيعات والأرباح والمصروفات' : 'Real-time sales, profit & expense analytics', gradient: 'from-rose-500 to-pink-600' },
        { icon: '👥', title: isRTL ? 'إدارة العملاء' : 'CRM', desc: isRTL ? 'إدارة العملاء والموردين مع الأرصدة والمعاملات' : 'Manage customers & suppliers with balances', gradient: 'from-violet-500 to-indigo-600' },
    ];

    const stats = [
        { value: '99.9%', label: isRTL ? 'وقت التشغيل' : 'Uptime' },
        { value: '10K+', label: isRTL ? 'فاتورة يومياً' : 'Daily Invoices' },
        { value: '500+', label: isRTL ? 'شركة نشطة' : 'Active Businesses' },
        { value: '24/7', label: isRTL ? 'دعم فني' : 'Support' },
    ];

    return (
        <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-body)' }}>
            <Navigation isRTL={isRTL} locale={params.locale} dict={dict} />
            <HeroSection isRTL={isRTL} locale={params.locale} dict={dict} stats={stats} />
            <FeaturesSection isRTL={isRTL} features={features} />
            <CTASection isRTL={isRTL} locale={params.locale} dict={dict} />
            <Footer isRTL={isRTL} locale={params.locale} dict={dict} />
        </div>
    );
}
