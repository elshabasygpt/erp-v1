import { getDictionary } from '@/i18n/config';
import ImportCenterClient from '@/components/inventory/import-center/ImportCenterClient';

export const metadata = {
    title: 'Product Import Center | ERP',
};

export default async function ImportCenterPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale as 'ar' | 'en');
    
    return <ImportCenterClient dict={dict} locale={locale} />;
}
