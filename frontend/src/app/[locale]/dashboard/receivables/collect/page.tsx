import CollectPaymentScreen from '@/components/receivables/CollectPaymentScreen';
import { getLocale } from 'next-intl/server';

export const metadata = {
    title: 'Collect Payment | SaaS POS',
};

export default async function CollectPaymentPage() {
    const locale = await getLocale();
    const isRTL = locale === 'ar';
    return <CollectPaymentScreen isRTL={isRTL} />;
}
