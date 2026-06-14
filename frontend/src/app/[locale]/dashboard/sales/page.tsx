import { getDictionary, type Locale } from '@/i18n/config';
import SalesDashboard from '@/components/sales/SalesDashboard';

export default async function SalesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <SalesDashboard />;
}
