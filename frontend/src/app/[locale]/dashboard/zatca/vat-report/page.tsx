import { getDictionary, type Locale } from '@/i18n/config';
import VatReportContent from '@/components/zatca/VatReportContent';

export default async function VatReportPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <VatReportContent dict={dict} locale={params.locale} />;
}
