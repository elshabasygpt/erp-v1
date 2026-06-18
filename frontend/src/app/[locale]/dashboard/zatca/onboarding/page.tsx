import { getDictionary, type Locale } from '@/i18n/config';
import ZatcaOnboardingContent from '@/components/zatca/ZatcaOnboardingContent';

export default async function ZatcaOnboardingPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <ZatcaOnboardingContent dict={dict} locale={params.locale} />;
}
