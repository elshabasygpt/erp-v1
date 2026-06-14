import { getDictionary, type Locale } from '@/i18n/config';
import InventoryContent from '@/components/inventory/InventoryContent';

export default async function InventoryPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <InventoryContent dict={dict} locale={params.locale} />;
}
