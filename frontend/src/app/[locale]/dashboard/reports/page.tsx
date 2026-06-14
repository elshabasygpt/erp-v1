import { getDictionary, type Locale } from '@/i18n/config';
import ReportsContent from '@/components/reports/ReportsContent';

export default async function ReportsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <ReportsContent dict={dict} locale={params.locale} />;
}
