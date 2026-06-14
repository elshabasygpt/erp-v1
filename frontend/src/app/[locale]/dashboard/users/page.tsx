import { getDictionary, type Locale } from '@/i18n/config';
import UsersContent from '@/components/users/UsersContent';

export default async function UsersPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <UsersContent dict={dict} locale={params.locale} />;
}
