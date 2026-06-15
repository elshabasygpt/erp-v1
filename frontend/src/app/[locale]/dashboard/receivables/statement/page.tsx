import CustomerStatement from '@/components/receivables/CustomerStatement';


export const metadata = {
    title: 'Customer Statement | SaaS POS',
};

export default async function CustomerStatementPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    return <CustomerStatement isRTL={isRTL} />;
}
