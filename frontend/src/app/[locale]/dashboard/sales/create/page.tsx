import { getDictionary, type Locale } from '@/i18n/config';
import AdvancedCreateSaleForm from '@/components/sales/AdvancedCreateSaleForm';

export default async function CreateSalePage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <AdvancedCreateSaleForm />;
}
