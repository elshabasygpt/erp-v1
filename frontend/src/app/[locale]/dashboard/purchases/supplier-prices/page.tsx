import { getDictionary, type Locale } from '@/i18n/config';
import SupplierPricesContent from '@/components/purchases/SupplierPricesContent';

export default async function SupplierPricesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <SupplierPricesContent dict={dict} locale={params.locale} />;
}
