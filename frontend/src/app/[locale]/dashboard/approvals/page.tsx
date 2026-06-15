"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { approvalsApiNew as approvalsApi } from '@/lib/api';

type ApprovalRequest = {
  id: string;
  requestable_type: string;
  requestable_id: string;
  requested_by: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function ApprovalsPage() {
  const { isRTL } = useLanguage();
  const [inbox, setInbox] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadInbox = async () => {
    setLoading(true);
    try {
      const res = await approvalsApi.getInbox();
      setInbox(res.data?.data || res.data || []);
    } catch {
      setError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInbox(); }, []);

  const handleDecision = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id + action);
    try {
      if (action === 'approve') {
        await approvalsApi.approve(id, notes);
      } else {
        await approvalsApi.reject(id, notes);
      }
      setNotes('');
      setSelectedId(null);
      await loadInbox();
    } catch {
      setError(isRTL ? 'فشل تنفيذ الإجراء' : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    escalated:'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">
        {isRTL ? 'صندوق الموافقات' : 'Approvals Inbox'}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : inbox.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {isRTL ? 'لا توجد طلبات معلقة' : 'No pending requests'}
        </div>
      ) : (
        <div className="space-y-4">
          {inbox.map((item) => (
            <div key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {item.requestable_type} #{item.requestable_id}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(item.created_at).toLocaleDateString(
                      isRTL ? 'ar-SA' : 'en-US'
                    )}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium
                  ${statusColor[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {isRTL
                    ? { pending: 'معلق', approved: 'موافق', rejected: 'مرفوض' }[item.status]
                    : item.status}
                </span>
              </div>

              {item.status === 'pending' && (
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder={isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                    value={selectedId === item.id ? notes : ''}
                    onChange={(e) => {
                      setSelectedId(item.id);
                      setNotes(e.target.value);
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision(item.id, 'approve')}
                      disabled={actionLoading === item.id + 'approve'}
                      className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm
                        hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {isRTL ? 'موافقة' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, 'reject')}
                      disabled={actionLoading === item.id + 'reject'}
                      className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm
                        hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isRTL ? 'رفض' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
