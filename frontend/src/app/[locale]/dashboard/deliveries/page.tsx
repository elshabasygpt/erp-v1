"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { deliveriesApiNew as deliveriesApi } from '@/lib/api';
import dynamic from 'next/dynamic';
const DeliveryMapDashboard = dynamic(
  () => import('@/components/sales/DeliveryMapDashboard').then(mod => mod.DeliveryMapDashboard),
  { ssr: false }
);

type Delivery = {
  id: string;
  invoice_id: string;
  status: string;
  tracking_number: string | null;
  shipping_address: string;
  driver_name: string | null;
  created_at: string;
};

const STATUS_MAP: Record<string, { ar: string; en: string; color: string }> = {
  pending:   { ar: 'في الانتظار', en: 'Pending',   color: 'bg-yellow-100 text-yellow-700' },
  assigned:  { ar: 'تم التعيين',  en: 'Assigned',  color: 'bg-blue-100 text-blue-700' },
  delivered: { ar: 'تم التسليم',  en: 'Delivered', color: 'bg-green-100 text-green-700' },
  failed:    { ar: 'فشل',         en: 'Failed',    color: 'bg-red-100 text-red-700' },
};

export default function DeliveriesPage() {
  const { isRTL } = useLanguage();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await deliveriesApi.getAll();
        setDeliveries(res.data?.data || res.data || []);
      } catch {
        setError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await deliveriesApi.updateStatus(id, status);
      setDeliveries(prev =>
        prev.map(d => d.id === id ? { ...d, status } : d)
      );
    } catch {
      setError(isRTL ? 'فشل تحديث الحالة' : 'Failed to update status');
    }
  };

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isRTL ? 'إدارة التوصيل' : 'Deliveries'}
        </h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {isRTL ? 'قائمة' : 'List'}
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {isRTL ? 'خريطة' : 'Map'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : viewMode === 'map' ? (
        <DeliveryMapDashboard dict={{}} locale={isRTL ? 'ar' : 'en'} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'رقم الفاتورة' : 'Invoice'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'العنوان' : 'Address'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'السائق' : 'Driver'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'إجراء' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    {isRTL ? 'لا توجد توصيلات' : 'No deliveries'}
                  </td>
                </tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">#{d.invoice_id}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{d.shipping_address}</td>
                  <td className="px-4 py-3">{d.driver_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full
                      ${STATUS_MAP[d.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                      {isRTL
                        ? STATUS_MAP[d.status]?.ar
                        : STATUS_MAP[d.status]?.en}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(d.id, 'delivered')}
                        className="text-xs bg-green-600 text-white px-3 py-1
                          rounded-lg hover:bg-green-700 transition-colors">
                        {isRTL ? 'تأكيد التسليم' : 'Mark Delivered'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
