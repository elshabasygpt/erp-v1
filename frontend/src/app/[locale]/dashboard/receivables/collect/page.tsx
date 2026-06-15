import CollectPaymentScreen from '@/components/receivables/CollectPaymentScreen';


export const metadata = {
    title: 'Collect Payment | SaaS POS',
};

export default async function CollectPaymentPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    return <CollectPaymentScreen isRTL={isRTL} />;
}
