import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddLoanModalProps {
    employees: any[];
    isRTL: boolean;
    onClose: () => void;
    onSuccess: (data: any) => void;
}

export default function AddLoanModal({ employees, isRTL, onClose, onSuccess }: AddLoanModalProps) {
    const [form, setForm] = useState({
        employee_id: '',
        total_amount: 0,
        installments_count: 1,
        start_month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
        start_year: new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
        reason: '',
        notes: '',
    });

    const selectedEmployee = employees.find(e => e.id === form.employee_id);
    const baseSalary = parseFloat(selectedEmployee?.base_salary || 0);
    const installmentAmt = form.total_amount > 0 && form.installments_count > 0
        ? form.total_amount / form.installments_count : 0;
    const salaryRatio = baseSalary > 0 ? (installmentAmt / baseSalary) * 100 : 0;
    const isWarning = salaryRatio > 40 && salaryRatio <= 50;
    const isError = salaryRatio > 50;
    const submitDisabled = isError || !form.employee_id || form.total_amount <= 0;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitDisabled) return;

        setIsSubmitting(true);
        try {
            await onSuccess(form);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const installmentsOptions = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>💰</span> {isRTL ? 'منح سلفة جديدة' : 'Grant New Loan'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {isRTL ? 'الموظف' : 'Employee'}
                                </label>
                                <select
                                    value={form.employee_id}
                                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">{isRTL ? 'اختر موظف' : 'Select Employee'}</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name} {emp.base_salary ? `(${parseFloat(emp.base_salary).toFixed(0)})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedEmployee && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {isRTL ? 'الراتب الأساسي:' : 'Base Salary:'} {baseSalary.toFixed(2)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {isRTL ? 'مبلغ السلفة' : 'Loan Amount'}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={form.total_amount || ''}
                                    onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {isRTL ? 'عدد الأقساط' : 'Installments Count'}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {installmentsOptions.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setForm({ ...form, installments_count: opt })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            form.installments_count === opt
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary / Warnings */}
                        <div className={`p-4 rounded-xl border ${
                            isError ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                            isWarning ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                            'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
                        }`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {isRTL ? 'القسط الشهري:' : 'Monthly Installment:'}
                                </span>
                                <span className={`font-bold ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                    {installmentAmt.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {isRTL ? 'نسبة من الراتب:' : 'Percentage of Salary:'}
                                </span>
                                <span className={`font-bold ${isError ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {salaryRatio.toFixed(1)}%
                                </span>
                            </div>
                            {isWarning && (
                                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ {isRTL ? 'تحذير: القسط يتجاوز 40% من الراتب.' : 'Warning: Installment exceeds 40% of salary.'}
                                </p>
                            )}
                            {isError && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                    🚫 {isRTL ? 'خطأ: القسط يتجاوز 50% من الراتب. زِد عدد الأقساط.' : 'Error: Installment exceeds 50% of salary. Increase installments count.'}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {isRTL ? 'شهر بداية الخصم' : 'Start Deduction Month'}
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={form.start_month}
                                        onChange={(e) => setForm({ ...form, start_month: parseInt(e.target.value) })}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <select
                                        value={form.start_year}
                                        onChange={(e) => setForm({ ...form, start_year: parseInt(e.target.value) })}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {isRTL ? 'سبب السلفة' : 'Reason'}
                                </label>
                                <input
                                    type="text"
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={submitDisabled || isSubmitting}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 focus:ring-4 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? '...' : (isRTL ? 'منح السلفة ✓' : 'Grant Loan ✓')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
