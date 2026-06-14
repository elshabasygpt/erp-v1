import { getDictionary, type Locale } from '@/i18n/config';
import CustomersContent from '@/components/customers/CustomersContent';

export default async function CustomersPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <CustomersContent dict={dict} locale={params.locale} />;
}
