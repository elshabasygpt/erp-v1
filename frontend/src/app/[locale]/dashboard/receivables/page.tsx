import ReceivablesDashboard from '@/components/receivables/ReceivablesDashboard';
import { getLocale } from 'next-intl/server';

export const metadata = {
    title: 'Receivables | SaaS POS',
};

export default async function ReceivablesPage() {
    const locale = await getLocale();
    const isRTL = locale === 'ar';
    return <ReceivablesDashboard isRTL={isRTL} />;
}
