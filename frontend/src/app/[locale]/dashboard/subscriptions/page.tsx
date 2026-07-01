"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { subscriptionsApiNew as subscriptionsApi } from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

type Subscription = {
  id: string;
  plan: { name: string; price: number; features: string[] };
  status: string;
  started_at: string;
  expires_at: string | null;
};

export default function SubscriptionsPage() {
  const { isRTL } = useLanguage();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await subscriptionsApi.getCurrent();
        setSubscription(res.data?.data || res.data || null);
      } catch {
        setError(isRTL ? 'فشل تحميل بيانات الاشتراك' : 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusColor: Record<string, string> = {
    active:   'bg-green-100 text-green-700',
    expired:  'bg-red-100 text-red-700',
    trial:    'bg-blue-100 text-blue-700',
    canceled: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">
        {isRTL ? 'الاشتراك' : 'Subscription'}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : !subscription ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">
            {isRTL ? 'لا يوجد اشتراك نشط' : 'No active subscription'}
          </p>
          <button
            onClick={() => subscriptionsApi.checkout('basic')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors">
            {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {subscription.plan?.name}
                </h2>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {subscription.plan?.price?.toLocaleString()}
                  <span className="text-sm text-gray-500 font-normal mr-1">
                    {isRTL ? 'ر.س / شهر' : 'SAR / month'}
                  </span>
                </p>
              </div>
              <span className={`text-sm px-3 py-1 rounded-full font-medium
                ${statusColor[subscription.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {isRTL
                  ? { active: 'نشط', expired: 'منتهي', trial: 'تجريبي', canceled: 'ملغي' }
                    [subscription.status]
                  : subscription.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">
                  {isRTL ? 'تاريخ البدء: ' : 'Started: '}
                </span>
                {new Date(subscription.started_at).toLocaleDateString(
                  isRTL ? 'ar-SA' : 'en-US'
                )}
              </div>
              {subscription.expires_at && (
                <div>
                  <span className="font-medium">
                    {isRTL ? 'تاريخ الانتهاء: ' : 'Expires: '}
                  </span>
                  {new Date(subscription.expires_at).toLocaleDateString(
                    isRTL ? 'ar-SA' : 'en-US'
                  )}
                </div>
              )}
            </div>

            {subscription.plan?.features?.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-2">
                  {isRTL ? 'المميزات' : 'Features'}
                </p>
                <ul className="space-y-1">
                  {subscription.plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
