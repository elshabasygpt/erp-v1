import { getDictionary, type Locale } from '@/i18n/config';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage({
    params,
}: {
    params: { locale: Locale };
}) {
    const dict = await getDictionary(params.locale);
    return <DashboardContent dict={dict} locale={params.locale} />;
}
