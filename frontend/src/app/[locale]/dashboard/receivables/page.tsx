import ReceivablesDashboard from '@/components/receivables/ReceivablesDashboard';


export const metadata = {
    title: 'Receivables | SaaS POS',
};

export default async function ReceivablesPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    return <ReceivablesDashboard isRTL={isRTL} />;
}
