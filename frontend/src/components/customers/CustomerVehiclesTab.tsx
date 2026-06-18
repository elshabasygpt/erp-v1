'use client';

import React, { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';
import AddVehicleModal from './AddVehicleModal';
import AddServiceModal from './AddServiceModal';

interface CustomerVehiclesTabProps {
    customerId: string;
    locale: string;
}

export default function CustomerVehiclesTab({ customerId, locale }: CustomerVehiclesTabProps) {
    const isRTL = locale === 'ar';
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [serviceVehicleId, setServiceVehicleId] = useState<string>('');
    const [serviceVehicleName, setServiceVehicleName] = useState<string>('');
    const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<any>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadVehicles = () => {
        setLoading(true);
        crmApi.getCustomerVehicles(customerId)
            .then(res => setVehicles(res.data?.data || []))
            .catch(err => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadVehicles();
    }, [customerId]);

    const handleAddVehicle = () => {
        setSelectedVehicle(null);
        setIsVehicleModalOpen(true);
    };

    const handleEditVehicle = (vehicle: any) => {
        setSelectedVehicle(vehicle);
        setIsVehicleModalOpen(true);
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه السيارة؟' : 'Are you sure you want to delete this vehicle?')) return;
        try {
            await crmApi.deleteCustomerVehicle(customerId, id);
            loadVehicles();
        } catch (error) {

        }
    };

    const handleShowHistory = async (vehicle: any) => {
        if (showHistoryFor === vehicle.id) {
            setShowHistoryFor(null);
            return;
        }
        setShowHistoryFor(vehicle.id);
        setHistoryLoading(true);
        try {
            const res = await crmApi.getVehicleServiceHistory(customerId, vehicle.id);
            setHistoryData(res.data?.data || null);
        } catch (error) {

        } finally {
            setHistoryLoading(false);
        }
    };

    const handleAddService = (vehicle: any) => {
        setServiceVehicleId(vehicle.id);
        setServiceVehicleName(vehicle.display_name);
        setIsServiceModalOpen(true);
    };

    if (loading) {
        return <div className="p-4 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'سيارات العميل' : 'Customer Vehicles'}
                </h3>
                <button onClick={handleAddVehicle} className="btn-primary text-sm px-4 py-2">
                    {isRTL ? '+ إضافة سيارة' : '+ Add Vehicle'}
                </button>
            </div>

            {vehicles.length === 0 ? (
                <div className="text-center p-8 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد سيارات مسجلة لهذا العميل.' : 'No vehicles registered for this customer.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="border rounded-xl p-4 flex flex-col space-y-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                    🚗 {vehicle.display_name}
                                </h4>
                            </div>
                            <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                <p>
                                    <span className="font-medium">{isRTL ? 'اللون:' : 'Color:'}</span> {vehicle.color || '---'} | 
                                    <span className="font-medium ms-2">{isRTL ? 'الكيلو:' : 'Mileage:'}</span> {vehicle.mileage?.toLocaleString() || '---'} |
                                    <span className="font-medium ms-2">{isRTL ? 'الوقود:' : 'Fuel:'}</span> {vehicle.fuel_type || '---'}
                                </p>
                                <p>
                                    <span className="font-medium">{isRTL ? 'رقم اللوحة:' : 'Plate:'}</span> {vehicle.plate_number || '---'} 
                                    {vehicle.vin && <span className="ms-2 font-medium">| VIN: {vehicle.vin}</span>}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t mt-2" style={{ borderColor: 'var(--border-default)' }}>
                                <button onClick={() => handleShowHistory(vehicle)} className="text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                    {isRTL ? 'تاريخ الخدمة' : 'Service History'}
                                </button>
                                <button onClick={() => handleEditVehicle(vehicle)} className="text-sm px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
                                    {isRTL ? 'تعديل' : 'Edit'}
                                </button>
                                <button onClick={() => handleDeleteVehicle(vehicle.id)} className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors ms-auto">
                                    {isRTL ? 'حذف' : 'Delete'}
                                </button>
                            </div>

                            {showHistoryFor === vehicle.id && (
                                <div className="mt-4 p-4 rounded-xl border bg-gray-50/50" style={{ borderColor: 'var(--border-default)' }}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'تاريخ الخدمة' : 'Service History'}</h5>
                                        <button onClick={() => handleAddService(vehicle)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
                                            {isRTL ? '+ تسجيل خدمة' : '+ Add Service'}
                                        </button>
                                    </div>
                                    {historyLoading ? (
                                        <div className="text-sm text-center py-2">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                                    ) : historyData?.history?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-start">
                                                <thead>
                                                    <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                                        <th className="py-2 text-start">{isRTL ? 'التاريخ' : 'Date'}</th>
                                                        <th className="py-2 text-start">{isRTL ? 'النوع' : 'Type'}</th>
                                                        <th className="py-2 text-start">{isRTL ? 'الكيلو' : 'Mileage'}</th>
                                                        <th className="py-2 text-start">{isRTL ? 'الفاتورة' : 'Invoice'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyData.history.map((h: any) => (
                                                        <tr key={h.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-default)' }}>
                                                            <td className="py-2">{h.service_date}</td>
                                                            <td className="py-2">
                                                                <span className="px-2 py-0.5 rounded-md text-xs bg-gray-200 text-gray-800">
                                                                    {h.service_type === 'parts_replacement' ? (isRTL ? 'قطع غيار' : 'Parts') :
                                                                     h.service_type === 'maintenance' ? (isRTL ? 'صيانة' : 'Maintenance') :
                                                                     h.service_type === 'inspection' ? (isRTL ? 'فحص' : 'Inspection') : (isRTL ? 'أخرى' : 'Other')}
                                                                </span>
                                                            </td>
                                                            <td className="py-2">{h.mileage_at_service?.toLocaleString() || '-'}</td>
                                                            <td className="py-2 text-blue-600">{h.invoice?.invoice_number || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'لا توجد خدمات مسجلة.' : 'No services recorded.'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AddVehicleModal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                customerId={customerId}
                locale={locale}
                vehicle={selectedVehicle}
                onSuccess={() => {
                    setIsVehicleModalOpen(false);
                    loadVehicles();
                }}
            />

            <AddServiceModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                customerId={customerId}
                vehicleId={serviceVehicleId}
                vehicleDisplayName={serviceVehicleName}
                locale={locale}
                onSuccess={() => {
                    setIsServiceModalOpen(false);
                    // Reload history if currently showing
                    if (showHistoryFor === serviceVehicleId) {
                        handleShowHistory({ id: serviceVehicleId }); // trick to toggle
                        handleShowHistory({ id: serviceVehicleId });
                    }
                    loadVehicles(); // update mileage on card
                }}
            />
        </div>
    );
}
