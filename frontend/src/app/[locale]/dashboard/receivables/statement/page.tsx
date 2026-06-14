import CustomerStatement from '@/components/receivables/CustomerStatement';
import { getLocale } from 'next-intl/server';

export const metadata = {
    title: 'Customer Statement | SaaS POS',
};

export default async function CustomerStatementPage() {
    const locale = await getLocale();
    const isRTL = locale === 'ar';
    return <CustomerStatement isRTL={isRTL} />;
}
