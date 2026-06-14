import { getDictionary, type Locale } from '@/i18n/config';
import AccountingContent from '@/components/accounting/AccountingContent';

export default async function AccountingPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);

    return <AccountingContent dict={dict} locale={params.locale} />;
}
