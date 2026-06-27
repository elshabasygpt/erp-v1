import { getDictionary, type Locale } from '@/i18n/config';
import WorkshopContent from '@/components/sales/WorkshopContent';

export default async function WorkshopPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <WorkshopContent locale={params.locale} dict={dict} />;
}
