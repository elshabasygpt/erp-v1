import { getDictionary, type Locale } from '@/i18n/config';
import WriteOffContent from '@/components/inventory/WriteOffContent';

export default async function WriteOffsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <WriteOffContent locale={params.locale} dict={dict} />;
}
