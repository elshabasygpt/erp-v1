import { getDictionary, type Locale } from '@/i18n/config';
import AutoPartsReportsContent from '@/components/reports/AutoPartsReportsContent';

export default async function AutoPartsReportsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <AutoPartsReportsContent dict={dict} locale={params.locale} />;
}
