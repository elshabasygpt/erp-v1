import { getDictionary, type Locale } from '@/i18n/config';
import EmployeeLoansContent from '@/components/hr/EmployeeLoansContent';

export default async function LoansPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <EmployeeLoansContent dict={dict} locale={params.locale} />;
}
