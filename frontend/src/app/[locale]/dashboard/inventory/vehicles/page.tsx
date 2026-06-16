import { getDictionary, type Locale } from '@/i18n/config';
import { VehicleManagementClient } from '@/components/inventory/vehicles/VehicleManagementClient';

export default async function VehiclesPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    
    return <VehicleManagementClient locale={params.locale} dict={dict} />;
}
