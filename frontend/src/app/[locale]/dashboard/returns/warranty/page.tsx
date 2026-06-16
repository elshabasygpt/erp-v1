import { getDictionary, type Locale } from '@/i18n/config';
import WarrantyContent from '@/components/warranty/WarrantyContent';

export default async function WarrantyPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <WarrantyContent dict={dict} locale={params.locale} />;
}
