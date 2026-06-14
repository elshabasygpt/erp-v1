import { getDictionary, type Locale } from '@/i18n/config';
import StockMovementsContent from '@/components/inventory/StockMovementsContent';

export default async function StockMovementsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <StockMovementsContent dict={dict} locale={params.locale} />;
}
