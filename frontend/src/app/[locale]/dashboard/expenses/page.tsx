"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { expensesApiNew as expensesApi } from '@/lib/api';

type Expense = {
  id: string;
  category: { name: string };
  amount: number;
  description: string;
  expense_date: string;
};

type Category = { id: string; name: string };

export default function ExpensesPage() {
  const { isRTL } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        expensesApi.getAll(),
        expensesApi.getCategories(),
      ]);
      setExpenses(expRes.data?.data || expRes.data || []);
      setCategories(catRes.data?.data || catRes.data || []);
    } catch {
      setError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.category_id || !form.amount) return;
    setSaving(true);
    try {
      await expensesApi.create({
        ...form,
        amount: parseFloat(form.amount),
      });
      setShowForm(false);
      setForm({ category_id: '', amount: '', description: '',
        expense_date: new Date().toISOString().split('T')[0] });
      await load();
    } catch {
      setError(isRTL ? 'فشل حفظ المصروف' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isRTL ? 'المصروفات' : 'Expenses'}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg
            hover:bg-blue-700 transition-colors text-sm">
          {isRTL ? '+ إضافة مصروف' : '+ Add Expense'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-600">
            {isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
          </p>
          <p className="text-2xl font-bold text-blue-800 mt-1">
            {total.toLocaleString()} {isRTL ? 'ر.س' : 'SAR'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">
            {isRTL ? 'عدد المعاملات' : 'Transactions'}
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {expenses.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">
            {isRTL ? 'إضافة مصروف جديد' : 'New Expense'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">{isRTL ? 'اختر الفئة' : 'Select Category'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder={isRTL ? 'المبلغ' : 'Amount'}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.expense_date}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder={isRTL ? 'الوصف' : 'Description'}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3 mt-4">
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
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'الفئة' : 'Category'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'الوصف' : 'Description'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-gray-600">
                  {isRTL ? 'التاريخ' : 'Date'}
                </th>
                <th className="px-4 py-3 text-end font-medium text-gray-600">
                  {isRTL ? 'المبلغ' : 'Amount'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    {isRTL ? 'لا توجد مصروفات' : 'No expenses'}
                  </td>
                </tr>
              ) : expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{e.category?.name}</td>
                  <td className="px-4 py-3">{e.description || '—'}</td>
                  <td className="px-4 py-3">
                    {new Date(e.expense_date).toLocaleDateString(
                      isRTL ? 'ar-SA' : 'en-US'
                    )}
                  </td>
                  <td className="px-4 py-3 text-end font-medium">
                    {e.amount.toLocaleString()}
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
