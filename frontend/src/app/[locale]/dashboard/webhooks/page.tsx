"use client";

import React, { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { webhooksApiNew as webhooksApi } from '@/lib/api';

type Webhook = {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
};

const AVAILABLE_EVENTS = [
  'invoice.confirmed',
  'purchase.confirmed',
  'stock.transfer.received',
  'payroll.generated',
  '*',
];

export default function WebhooksPage() {
  const { isRTL } = useLanguage();
  const confirm = useConfirm();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    url: '',
    events: [] as string[],
    secret: '',
    is_active: true,
  });

  const load = async () => {
    try {
      const res = await webhooksApi.getAll();
      setWebhooks(res.data?.data || res.data || []);
    } catch {
      setError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleEvent = (event: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter(e => e !== event)
        : [...f.events, event],
    }));
  };

  const handleSubmit = async () => {
    if (!form.url || form.events.length === 0) return;
    setSaving(true);
    try {
      await webhooksApi.create(form);
      setShowForm(false);
      setForm({ url: '', events: [], secret: '', is_active: true });
      await load();
    } catch {
      setError(isRTL ? 'فشل حفظ الـ Webhook' : 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm(isRTL ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    try {
      await webhooksApi.delete(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch {
      setError(isRTL ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isRTL ? 'الـ Webhooks' : 'Webhooks'}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg
            hover:bg-blue-700 transition-colors text-sm">
          {isRTL ? '+ إضافة Webhook' : '+ Add Webhook'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">
            {isRTL ? 'Webhook جديد' : 'New Webhook'}
          </h2>
          <div className="space-y-4">
            <input
              type="url"
              placeholder="https://example.com/webhook"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder={isRTL ? 'Secret (اختياري)' : 'Secret (optional)'}
              value={form.secret}
              onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'الأحداث' : 'Events'}
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map(event => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors
                      ${form.events.includes(event)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}>
                    {event}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg
                  text-sm hover:bg-blue-700 disabled:opacity-50">
                {isRTL ? 'حفظ' : 'Save'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border border-gray-300 px-4 py-2 rounded-lg text-sm">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white
              rounded-xl border border-gray-200">
              {isRTL ? 'لا توجد Webhooks' : 'No webhooks configured'}
            </div>
          ) : webhooks.map((w) => (
            <div key={w.id}
              className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm text-gray-800 break-all">
                    {w.url}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.events.map(e => (
                      <span key={e}
                        className="text-xs bg-gray-100 text-gray-600
                          px-2 py-0.5 rounded-full">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full
                    ${w.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'}`}>
                    {w.is_active
                      ? (isRTL ? 'نشط' : 'Active')
                      : (isRTL ? 'متوقف' : 'Inactive')}
                  </span>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-red-500 hover:text-red-700 text-sm">
                    {isRTL ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
