import { getDictionary, type Locale } from '@/i18n/config';
import SalesListScreen from '@/components/sales/SalesListScreen';

export default async function SalesListPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <SalesListScreen />;
}
