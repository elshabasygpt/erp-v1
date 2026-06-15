import { useCallback, useState } from 'react';
import { crmApi } from '@/lib/api';

export function usePosCustomer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createCustomer = useCallback(async (data: {
    name: string;
    phone?: string;
    email?: string;
    name_ar?: string;
    group?: string;
    payment_type?: string;
  }) => {
    setLoading(true);
    setError('');
    try {
      const res = await crmApi.createCustomer(data);
      return res.data?.data || res.data;
    } catch {
      setError('فشل إنشاء العميل');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCustomer, loading, error };
}
