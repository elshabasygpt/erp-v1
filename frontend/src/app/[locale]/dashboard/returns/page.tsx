import { getDictionary, type Locale } from '@/i18n/config';
import ReturnsContent from '@/components/returns/ReturnsContent';

export default async function ReturnsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <ReturnsContent dict={dict} locale={params.locale} />;
}
