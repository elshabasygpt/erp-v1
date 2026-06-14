import { getDictionary, type Locale } from '@/i18n/config';
import ApprovalInbox from '@/components/approvals/ApprovalInbox';

export default async function ApprovalsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <ApprovalInbox dict={dict} locale={params.locale} />;
}
