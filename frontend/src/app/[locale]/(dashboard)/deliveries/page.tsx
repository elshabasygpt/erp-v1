import DeliveryDashboard from '@/components/sales/DeliveryDashboard';
import { getDictionary, type Locale } from '@/i18n/config';

export default async function DeliveriesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);

    return <DeliveryDashboard dict={dict} locale={params.locale} />;
}
