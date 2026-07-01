'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { accountingApi, settingsApi, treasuryApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ZakatReportPage() {
  const t = useTranslations('accounting');
  const { isRTL } = useLanguage();
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [rate, setRate] = useState('2.5'); // 2.5 Hijri, 2.577 Gregorian
  const [method, setMethod] = useState<'working_capital' | 'sources_of_funds'>('working_capital');
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Account selections
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedLiabilities, setSelectedLiabilities] = useState<string[]>([]);
  const [selectedEquities, setSelectedEquities] = useState<string[]>([]);
  const [selectedLtLiabilities, setSelectedLtLiabilities] = useState<string[]>([]);
  const [selectedFixedAssets, setSelectedFixedAssets] = useState<string[]>([]);
  const [selectedProvisions, setSelectedProvisions] = useState<string[]>([]);

  // Payment State
  const [showPayModal, setShowPayModal] = useState(false);
  const [safes, setSafes] = useState<any[]>([]);
  const [selectedSafe, setSelectedSafe] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    // Fetch chart of accounts
    accountingApi.getChartOfAccounts()
      .then((res) => {
        const flat: any[] = [];
        const flatten = (nodes: any[]) => {
          nodes.forEach((n) => {
            flat.push({ id: n.id, name: n.name, name_ar: n.name_ar, type: n.type });
            if (n.children && n.children.length > 0) flatten(n.children);
          });
        };
        if (Array.isArray(res.data.data)) {
          flatten(res.data.data);
          setAccounts(flat);
        } else {
          setAccounts(res.data.data || []);
        }
      })
      .catch((err) => {});

    // Fetch saved settings
    settingsApi.getSettings()
      .then((res) => {
        const data = res.data?.data;
        if (data && data.zakat_settings) {
            const z = data.zakat_settings;
            if (z.method) setMethod(z.method);
            if (z.rate) setRate(z.rate);
            if (z.selectedAssets) setSelectedAssets(z.selectedAssets);
            if (z.selectedLiabilities) setSelectedLiabilities(z.selectedLiabilities);
            if (z.selectedEquities) setSelectedEquities(z.selectedEquities);
            if (z.selectedLtLiabilities) setSelectedLtLiabilities(z.selectedLtLiabilities);
            if (z.selectedFixedAssets) setSelectedFixedAssets(z.selectedFixedAssets);
            if (z.selectedProvisions) setSelectedProvisions(z.selectedProvisions);
        }
      }).catch(err => {});
      
    // Fetch safes for payment
    treasuryApi.getSafes().then(res => setSafes(res.data?.data || [])).catch(e => {});
  }, []);

  const saveSettings = async () => {
    try {
        const zakat_settings = {
            method, rate, selectedAssets, selectedLiabilities, selectedEquities, 
            selectedLtLiabilities, selectedFixedAssets, selectedProvisions
        };
        await settingsApi.updateSettings({ zakat_settings });
        toast.success(isRTL ? 'تم حفظ إعدادات الزكاة بنجاح' : 'Zakat settings saved successfully');
    } catch (e) {
        toast.error(isRTL ? 'فشل في حفظ الإعدادات' : 'Failed to save settings');
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await accountingApi.getZakatReport({
        as_of: asOf,
        rate: parseFloat(rate),
        method,
        asset_accounts: selectedAssets,
        liability_accounts: selectedLiabilities,
        equity_accounts: selectedEquities,
        long_term_liability_accounts: selectedLtLiabilities,
        fixed_asset_accounts: selectedFixedAssets,
        provision_accounts: selectedProvisions,
      });
      setReport(res.data.data);
      toast.success(t('reportGenerated') || 'Report Generated');
    } catch (error) {
      toast.error(t('reportError') || 'Error Generating Report');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostEntry = async () => {
    if (!report || report.zakat_amount <= 0) return;
    try {
      await accountingApi.postZakatEntry({
        date: asOf,
        zakat_amount: report.zakat_amount,
      });
      toast.success(t('entryPosted') || 'Entry Posted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('entryPostError') || 'Error Posting Entry');
    }
  };

  const handlePayZakat = async () => {
      if (!selectedSafe || !report) return toast.error(isRTL ? 'يرجى اختيار الخزينة للخصم منها' : 'Please select a treasury to deduct from');
      try {
          await accountingApi.payZakat({
              date: asOf,
              amount: report.zakat_amount,
              safe_account_id: selectedSafe,
              reference_number: reference
          });
          toast.success(isRTL ? 'تم سداد مبلغ الزكاة بنجاح' : 'Zakat amount paid successfully');
          setShowPayModal(false);
      } catch (error: any) {
          toast.error(error.response?.data?.message || (isRTL ? 'فشل السداد' : 'Payment failed'));
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const toggleAccount = (id: string, listType: string) => {
      const setterMap: any = {
          'asset': setSelectedAssets,
          'liability': setSelectedLiabilities,
          'equity': setSelectedEquities,
          'lt_liability': setSelectedLtLiabilities,
          'fixed_asset': setSelectedFixedAssets,
          'provision': setSelectedProvisions
      };
      
      const setList = setterMap[listType];
      if (setList) {
          setList((prev: string[]) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
          <h1 className="text-3xl font-bold tracking-tight">{isRTL ? 'تقرير زكاة المال وإقرار ZATCA' : 'Zakat Report & ZATCA Declaration'}</h1>
          <Button variant="outline" onClick={saveSettings}>{isRTL ? '💾 حفظ الإعدادات' : '💾 Save Settings'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        <Card className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">{isRTL ? 'إعدادات الإقرار الزكوي' : 'Zakat Declaration Settings'}</h3>
            <p className="text-sm text-gray-500">{isRTL ? 'حدد طريقة الحساب والمحددات الأساسية' : 'Set the calculation method and key parameters'}</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">{isRTL ? 'تاريخ نهاية الحول (As Of Date)' : 'Zakat Year-End Date (As Of)'}</label>
              <input
                type="date"
                className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                value={asOf}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAsOf(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">{isRTL ? 'نسبة الزكاة (Zakat Rate)' : 'Zakat Rate'}</label>
              <select
                className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                value={rate}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRate(e.target.value)}
              >
                <option value="2.5">{isRTL ? '2.5% (سنة هجرية 354 يوم)' : '2.5% (Hijri year, 354 days)'}</option>
                <option value="2.577">{isRTL ? '2.577% (سنة ميلادية 365 يوم)' : '2.577% (Gregorian year, 365 days)'}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">{isRTL ? 'طريقة حساب الوعاء الزكوي' : 'Zakat Base Calculation Method'}</label>
              <select
                className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                value={method}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value as any)}
              >
                <option value="working_capital">{isRTL ? 'طريقة رأس المال العامل (الأصول - الخصوم المتداولة)' : 'Working Capital Method (Assets − Current Liabilities)'}</option>
                <option value="sources_of_funds">{isRTL ? 'طريقة مصادر الأموال (حقوق الملكية + الخصوم طويلة الأجل - الأصول الثابتة)' : 'Sources of Funds Method (Equity + Long-Term Liabilities − Fixed Assets)'}</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4 max-h-[450px] overflow-y-auto">
          <div className="mb-4 sticky top-0 bg-white dark:bg-gray-950 pb-2 border-b">
            <h3 className="font-semibold text-lg">{isRTL ? 'دليل الحسابات (التصنيف الزكوي)' : 'Chart of Accounts (Zakat Classification)'}</h3>
            <p className="text-sm text-gray-500">{isRTL ? 'صنف الحسابات حسب الطريقة المختارة لتدخل في الوعاء' : 'Classify accounts by the selected method to include them in the Zakat base'}</p>
          </div>
          <div className="space-y-2 mt-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex flex-col py-3 border-b">
                <span className="text-sm font-semibold mb-2">{acc.name_ar || acc.name} <span className="text-xs text-gray-400 font-normal ml-2">({acc.type})</span></span>
                {method === 'working_capital' ? (
                    <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant={selectedAssets.includes(acc.id) ? 'default' : 'outline'} onClick={() => toggleAccount(acc.id, 'asset')}>{isRTL ? 'أصل متداول (+)' : 'Current Asset (+)'}</Button>
                    <Button size="sm" variant={selectedLiabilities.includes(acc.id) ? 'destructive' : 'outline'} onClick={() => toggleAccount(acc.id, 'liability')}>{isRTL ? 'خصم متداول (-)' : 'Current Liability (−)'}</Button>
                    </div>
                ) : (
                    <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant={selectedEquities.includes(acc.id) ? 'default' : 'outline'} onClick={() => toggleAccount(acc.id, 'equity')}>{isRTL ? 'حقوق ملكية (+)' : 'Equity (+)'}</Button>
                    <Button size="sm" variant={selectedLtLiabilities.includes(acc.id) ? 'default' : 'outline'} onClick={() => toggleAccount(acc.id, 'lt_liability')}>{isRTL ? 'التزام طويل (+)' : 'Long-Term Liability (+)'}</Button>
                    <Button size="sm" variant={selectedProvisions.includes(acc.id) ? 'default' : 'outline'} onClick={() => toggleAccount(acc.id, 'provision')}>{isRTL ? 'مخصص (+)' : 'Provision (+)'}</Button>
                    <Button size="sm" variant={selectedFixedAssets.includes(acc.id) ? 'destructive' : 'outline'} onClick={() => toggleAccount(acc.id, 'fixed_asset')}>{isRTL ? 'أصل ثابت (-)' : 'Fixed Asset (−)'}</Button>
                    </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Button onClick={handleGenerate} disabled={isLoading} className="w-full h-14 text-lg font-bold print:hidden">
        {isLoading ? (isRTL ? 'جاري الحساب...' : 'Calculating...') : (isRTL ? '📊 استخراج الإقرار الزكوي' : '📊 Generate Zakat Declaration')}
      </Button>

      {report && (
        <Card className="mt-6 p-8 bg-white" id="zakat-print-area">
          <div className="hidden print:block text-center mb-8 pb-4 border-b-2">
              <h2 className="text-3xl font-bold">{isRTL ? 'الإقرار الزكوي الرسمي' : 'Official Zakat Declaration'}</h2>
              <p className="mt-2 text-gray-600">{isRTL ? 'للفترة المنتهية في:' : 'For the period ending:'} {report.as_of}</p>
              <p className="text-gray-600">{isRTL ? 'طريقة الحساب:' : 'Calculation method:'} {report.method === 'working_capital' ? (isRTL ? 'رأس المال العامل' : 'Working Capital') : (isRTL ? 'مصادر الأموال' : 'Sources of Funds')}</p>
          </div>

          <h3 className="text-xl font-bold mb-6 print:hidden">{isRTL ? 'تفاصيل الوعاء الزكوي' : 'Zakat Base Details'}</h3>
          
          {report.method === 'working_capital' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                <h3 className="font-semibold mb-3 text-lg text-emerald-600">{isRTL ? 'الموجودات (الأصول المتداولة الزكوية)' : 'Assets (Zakatable Current Assets)'}</h3>
                <div className="border rounded-lg">
                    <div className="overflow-x-auto"><table className="w-full text-sm text-left rtl:text-right">
                    <tbody className="divide-y">
                        {report.assets.map((a: any) => (
                        <tr key={a.id}><td className="px-4 py-2">{a.name_ar}</td><td className="px-4 py-2 font-mono">{a.balance.toFixed(2)}</td></tr>
                        ))}
                        <tr className="font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700">
                        <td className="px-4 py-3">{isRTL ? 'إجمالي الموجودات الزكوية' : 'Total Zakatable Assets'}</td><td className="px-4 py-3 font-mono">{report.total_assets.toFixed(2)}</td>
                        </tr>
                    </tbody>
                    </table></div>
                </div>
                </div>

                <div>
                <h3 className="font-semibold mb-3 text-lg text-rose-600">{isRTL ? 'المطلوبات (الخصوم المتداولة المحسومة)' : 'Liabilities (Deductible Current Liabilities)'}</h3>
                <div className="border rounded-lg">
                    <div className="overflow-x-auto"><table className="w-full text-sm text-left rtl:text-right">
                    <tbody className="divide-y">
                        {report.liabilities.map((l: any) => (
                        <tr key={l.id}><td className="px-4 py-2">{l.name_ar}</td><td className="px-4 py-2 font-mono">{l.balance.toFixed(2)}</td></tr>
                        ))}
                        <tr className="font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-700">
                        <td className="px-4 py-3">{isRTL ? 'إجمالي المطلوبات المحسومة' : 'Total Deductible Liabilities'}</td><td className="px-4 py-3 font-mono">{report.total_liabilities.toFixed(2)}</td>
                        </tr>
                    </tbody>
                    </table></div>
                </div>
                </div>
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-8">
                 <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto"><table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr><th className="px-4 py-3">{isRTL ? 'البند' : 'Item'}</th><th className="px-4 py-3">{isRTL ? 'الرصيد المضاف (+)' : 'Added Balance (+)'}</th><th className="px-4 py-3">{isRTL ? 'الرصيد المحسوم (-)' : 'Deducted Balance (−)'}</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {/* Equities */}
                            <tr className="bg-gray-50 dark:bg-gray-900 font-bold"><td colSpan={3} className="px-4 py-2 text-indigo-600">{isRTL ? 'حقوق الملكية' : 'Equity'}</td></tr>
                            {report.equities.map((e: any) => <tr key={e.id}><td className="px-4 py-2 pl-8">{e.name_ar}</td><td className="px-4 py-2 font-mono text-green-600">{e.balance.toFixed(2)}</td><td></td></tr>)}

                            {/* LT Liabilities */}
                            <tr className="bg-gray-50 dark:bg-gray-900 font-bold"><td colSpan={3} className="px-4 py-2 text-indigo-600">{isRTL ? 'الالتزامات طويلة الأجل' : 'Long-Term Liabilities'}</td></tr>
                            {report.lt_liabilities.map((e: any) => <tr key={e.id}><td className="px-4 py-2 pl-8">{e.name_ar}</td><td className="px-4 py-2 font-mono text-green-600">{e.balance.toFixed(2)}</td><td></td></tr>)}

                            {/* Provisions */}
                            <tr className="bg-gray-50 dark:bg-gray-900 font-bold"><td colSpan={3} className="px-4 py-2 text-indigo-600">{isRTL ? 'المخصصات والاحتياطيات' : 'Provisions & Reserves'}</td></tr>
                            {report.provisions.map((e: any) => <tr key={e.id}><td className="px-4 py-2 pl-8">{e.name_ar}</td><td className="px-4 py-2 font-mono text-green-600">{e.balance.toFixed(2)}</td><td></td></tr>)}

                            {/* Fixed Assets */}
                            <tr className="bg-gray-50 dark:bg-gray-900 font-bold"><td colSpan={3} className="px-4 py-2 text-rose-600">{isRTL ? 'الأصول الثابتة (المحسومات)' : 'Fixed Assets (Deductions)'}</td></tr>
                            {report.fixed_assets.map((e: any) => <tr key={e.id}><td className="px-4 py-2 pl-8">{e.name_ar}</td><td></td><td className="px-4 py-2 font-mono text-red-600">({e.balance.toFixed(2)})</td></tr>)}

                            <tr className="font-black bg-gray-100 dark:bg-gray-800 text-lg">
                                <td className="px-4 py-4">{isRTL ? 'الصافي (الوعاء الزكوي)' : 'Net (Zakat Base)'}</td>
                                <td colSpan={2} className="px-4 py-4 text-center font-mono">
                                    {report.zakat_base.toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table></div>
                 </div>
              </div>
          )}

          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 rounded-xl text-center space-y-3">
            <h2 className="text-xl font-semibold text-slate-600">{isRTL ? 'الوعاء الزكوي الخاضع للزكاة:' : 'Zakatable Zakat Base:'} {report.zakat_base.toFixed(2)} SAR</h2>
            <p className="text-3xl font-black">
              {isRTL ? `الزكاة الشرعية المستحقة (${report.rate}%):` : `Zakat Due (${report.rate}%):`} <span className="text-green-600">{report.zakat_amount.toFixed(2)} SAR</span>
            </p>
          </div>

          {report.zakat_amount > 0 && (
            <div className="mt-8 flex flex-wrap justify-end gap-4 print:hidden">
              <Button variant="outline" className="px-8 border-gray-400" onClick={handlePrint}>
                {isRTL ? '🖨️ طباعة الإقرار (PDF)' : '🖨️ Print Declaration (PDF)'}
              </Button>
              <Button onClick={handlePostEntry} className="px-8 bg-indigo-600 hover:bg-indigo-700">
                {isRTL ? '📝 إثبات القيد المحاسبي (استحقاق)' : '📝 Post Journal Entry (Accrual)'}
              </Button>
              <Button onClick={() => setShowPayModal(true)} className="px-8 bg-green-600 hover:bg-green-700">
                {isRTL ? '💰 سداد الزكاة للهيئة' : '💰 Pay Zakat to Authority'}
              </Button>
            </div>
          )}

          {/* Payment Modal */}
          {showPayModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
                  <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                      <h2 className="text-2xl font-bold mb-4">{isRTL ? 'سداد مبلغ الزكاة' : 'Pay Zakat Amount'}</h2>
                      <p className="text-sm text-gray-500 mb-6">{isRTL ? `سيتم إنشاء قيد صرف من الخزينة لحساب هيئة الزكاة بالمبلغ المستحق (${report.zakat_amount.toFixed(2)}).` : `A payment entry will be created from the treasury to the Zakat Authority account for the due amount (${report.zakat_amount.toFixed(2)}).`}</p>

                      <div className="space-y-4 mb-8">
                          <div>
                              <label className="block text-sm font-medium mb-1">{isRTL ? 'اختر الخزينة / البنك للدفع' : 'Select Treasury / Bank for Payment'}</label>
                              <select className="w-full border rounded-lg p-2" value={selectedSafe} onChange={e => setSelectedSafe(e.target.value)}>
                                  <option value="">{isRTL ? '-- اختر الحساب --' : '-- Select Account --'}</option>
                                  {safes.map(s => <option key={s.id} value={s.account_id}>{s.name_ar || s.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">{isRTL ? 'رقم المرجع (رقم الإيصال/التحويل)' : 'Reference Number (Receipt / Transfer No.)'}</label>
                              <input type="text" className="w-full border rounded-lg p-2" value={reference} onChange={e => setReference(e.target.value)} placeholder={isRTL ? 'مثال: SADAD-123456' : 'e.g. SADAD-123456'} />
                          </div>
                      </div>

                      <div className="flex gap-3 justify-end">
                          <Button variant="outline" onClick={() => setShowPayModal(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                          <Button className="bg-green-600 hover:bg-green-700" onClick={handlePayZakat}>{isRTL ? 'تأكيد الدفع' : 'Confirm Payment'}</Button>
                      </div>
                  </div>
              </div>
          )}
        </Card>
      )}

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            body * { visibility: hidden; }
            #zakat-print-area, #zakat-print-area * { visibility: visible; }
            #zakat-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
    </div>
  );
}
