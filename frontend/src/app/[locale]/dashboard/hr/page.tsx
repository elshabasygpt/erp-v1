import { getDictionary, type Locale } from '@/i18n/config';
import HrContent from '@/components/hr/HrContent';

export default async function HrPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <HrContent dict={dict} locale={params.locale} />;
}
