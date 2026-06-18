import { getDictionary, type Locale } from '@/i18n/config';
import AccountingSettingsContent from '@/components/accounting/AccountingSettingsContent';

export default async function AccountingSettingsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <AccountingSettingsContent dict={dict} locale={params.locale} />;
}
