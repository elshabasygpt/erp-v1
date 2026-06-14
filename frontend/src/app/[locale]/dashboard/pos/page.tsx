import { getDictionary, type Locale } from '@/i18n/config';
import ProPosScreen from '@/components/pos/ProPosScreen';

export default async function PosPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <ProPosScreen dict={dict} locale={params.locale} />;
}
