import { getDictionary, type Locale } from '@/i18n/config';
import BankAccountsContent from '@/components/accounting/BankAccountsContent';

export default async function BankAccountsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <BankAccountsContent dict={dict} locale={params.locale} />;
}
