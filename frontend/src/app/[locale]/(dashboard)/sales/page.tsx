import { getDictionary, type Locale } from '@/i18n/config';
import SalesContent from '@/components/sales/SalesContent';

export default async function SalesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <SalesContent dict={dict} locale={params.locale} />;
}
