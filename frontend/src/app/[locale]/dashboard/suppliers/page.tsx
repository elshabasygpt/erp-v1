import { getDictionary, type Locale } from '@/i18n/config';
import SuppliersContent from '@/components/suppliers/SuppliersContent';

export default async function SuppliersPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <SuppliersContent dict={dict} locale={params.locale} />;
}
