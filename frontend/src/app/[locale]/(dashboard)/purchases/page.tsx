import { getDictionary, type Locale } from '@/i18n/config';
import PurchasesContent from '@/components/purchases/PurchasesContent';

export default async function PurchasesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <PurchasesContent dict={dict} locale={params.locale} />;
}
