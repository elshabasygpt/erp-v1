import React, { useState } from 'react';
import { posApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { RefreshCw, Lock, X } from 'lucide-react';

interface ShiftManagementModalProps {
  isOpen: boolean;
  onShiftOpened: (shift: any) => void;
  isRTL?: boolean;
}

export function ShiftManagementModal({ isOpen, onShiftOpened, isRTL = false }: ShiftManagementModalProps) {
  const [openingCash, setOpeningCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleOpenShift = async () => {
    const cash = parseFloat(openingCash);
    if (!openingCash || isNaN(cash)) {
      toast.error(isRTL ? 'يجب إدخال رصيد الصندوق الافتتاحي' : 'Opening cash is required');
      return;
    }
    if (cash < 0) {
      toast.error(isRTL ? 'لا يمكن أن يكون رصيد الصندوق سالباً' : 'Opening cash cannot be negative');
      return;
    }
    setLoading(true);
    try {
      const res = await posApi.openShift({ opening_cash: cash, notes });
      toast.success(isRTL ? 'تم فتح الوردية بنجاح' : 'Shift opened successfully');
      onShiftOpened(res.data?.data || res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            {isRTL ? 'فتح وردية جديدة' : 'Open New Shift'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/60 mt-2 font-bold">
            {isRTL ? 'لا يمكنك إجراء أي عملية بيع قبل فتح الوردية وتحديد رصيد الصندوق الافتتاحي.' : 'You cannot make any sales before opening a shift and specifying the opening cash balance.'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
              {isRTL ? 'رصيد الصندوق الافتتاحي' : 'Opening Cash Balance'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                className="w-full h-12 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all text-center"
                placeholder="0.00"
              />
              <div className="absolute top-1/2 -translate-y-1/2 left-4 text-xs font-bold text-slate-400">SAR</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
              {isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full h-20 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all resize-none"
              placeholder={isRTL ? "أضف أي ملاحظات..." : "Add any notes..."}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
          <button
            onClick={handleOpenShift}
            disabled={loading || !openingCash}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (isRTL ? 'فتح الوردية وبدء العمل' : 'Open Shift & Start')}
          </button>
        </div>
      </div>
    </div>
  );
}
