import { getDictionary, type Locale } from '@/i18n/config';
import CreditNotesContent from '@/components/accounting/CreditNotesContent';

export default async function CreditNotesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <CreditNotesContent dict={dict} locale={params.locale} />;
}
