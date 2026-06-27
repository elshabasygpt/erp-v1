import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Props {
    locale: string;
}

export default function ImportSettingsTab({ locale }: Props) {
    const isRTL = locale === 'ar';
    const [settings, setSettings] = useState({
        defaultMode: 'create_update',
        stopOnError: false,
        batchSize: 500,
    });

    useEffect(() => {
        const saved = localStorage.getItem('erp_import_settings');
        if (saved) {
            try {
                setSettings(JSON.parse(saved));
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('erp_import_settings', JSON.stringify(settings));
        toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    };

    const modes = [
        { id: 'create_update', label: isRTL ? 'إضافة وتحديث (الافتراضي)' : 'Create & Update (Default)', desc: isRTL ? 'يضيف المنتجات الجديدة ويحدث الحالية' : 'Adds new products and updates existing ones' },
        { id: 'create_only', label: isRTL ? 'إضافة جديد فقط' : 'Create Only', desc: isRTL ? 'يتجاهل المنتجات الموجودة مسبقاً' : 'Ignores existing products' },
        { id: 'update_only', label: isRTL ? 'تحديث الحالي فقط' : 'Update Only', desc: isRTL ? 'يتجاهل المنتجات الجديدة في الملف' : 'Ignores new products in the file' },
        { id: 'update_prices', label: isRTL ? 'تحديث الأسعار فقط' : 'Update Prices Only', desc: isRTL ? 'تحديث (التكلفة، سعر البيع، الجملة) فقط' : 'Updates (Cost, Sell, Wholesale) prices only' },
        { id: 'update_status', label: isRTL ? 'تحديث الحالة فقط' : 'Update Status Only', desc: isRTL ? 'تفعيل أو تعطيل المنتجات' : 'Activates or deactivates products' },
        { id: 'update_category', label: isRTL ? 'تحديث التصنيف فقط' : 'Update Category Only', desc: isRTL ? 'نقل المنتجات لتصنيفات أخرى' : 'Moves products to other categories' },
        { id: 'update_brand', label: isRTL ? 'تحديث الماركة فقط' : 'Update Brand Only', desc: isRTL ? 'تحديث العلامة التجارية' : 'Updates the product brand' },
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6 border-b border-surface-200 dark:border-surface-700 pb-4">
                <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2 mb-2">
                    <span className="text-primary-500">⚙️</span> {isRTL ? 'إعدادات الاستيراد' : 'Import Settings'}
                </h2>
                <p className="text-sm text-surface-500">
                    {isRTL ? 'تكوين السلوك الافتراضي لعمليات الاستيراد في هذا المتصفح' : 'Configure the default behavior for import operations on this browser'}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                {/* Default Mode Setting */}
                <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                        <span>🔄</span> {isRTL ? 'وضع الاستيراد الافتراضي' : 'Default Import Mode'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {modes.map((mode) => (
                            <label
                                key={mode.id}
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    settings.defaultMode === mode.id
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                        : 'border-surface-200 dark:border-surface-700 hover:border-primary-200 dark:hover:border-primary-800/50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="defaultMode"
                                    value={mode.id}
                                    checked={settings.defaultMode === mode.id}
                                    onChange={(e) => setSettings({ ...settings, defaultMode: e.target.value })}
                                    className="mt-1 w-4 h-4 text-primary-600 border-surface-300 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-700 dark:checked:bg-primary-500"
                                />
                                <div>
                                    <div className={`font-bold ${settings.defaultMode === mode.id ? 'text-primary-700 dark:text-primary-400' : 'text-surface-900 dark:text-white'}`}>
                                        {mode.label}
                                    </div>
                                    <div className="text-xs text-surface-500 mt-1">
                                        {mode.desc}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Validation Settings */}
                <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                        <span>🛡️</span> {isRTL ? 'إعدادات التحقق والأمان' : 'Validation & Security Settings'}
                    </h3>
                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer">
                            <div>
                                <div className="font-bold text-surface-900 dark:text-white">
                                    {isRTL ? 'تخطي الأخطاء والمتابعة (موصى به)' : 'Skip Errors & Continue (Recommended)'}
                                </div>
                                <div className="text-sm text-surface-500">
                                    {isRTL ? 'إذا وجد خطأ في صف، يتخطاه ويكمل باقي الملف للحصول على تقرير نهائي' : 'If a row has an error, skip it and continue the file to get a final report'}
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={!settings.stopOnError}
                                    onChange={(e) => setSettings({ ...settings, stopOnError: !e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-emerald-500"></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700 flex justify-end">
                <button
                    onClick={handleSave}
                    className="btn-primary px-8 py-2 text-lg shadow-primary-500/30"
                >
                    {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
