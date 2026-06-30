'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { dataApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Database, Download, Upload, FileDown, Box, Users } from 'lucide-react';

export default function DataManagementPage() {
    const { isRTL } = useLanguage();
    const [loadingEntity, setLoadingEntity] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentEntityForUpload, setCurrentEntityForUpload] = useState<string | null>(null);

    const handleDownloadTemplate = async (entity: string) => {
        try {
            setLoadingEntity(entity + '_template');
            const response = await dataApi.downloadTemplate(entity);
            triggerFileDownload(response.data, `${entity}_template.csv`);
            toast.success('Template downloaded successfully');
        } catch (error) {
            toast.error('Failed to download template');
        } finally {
            setLoadingEntity(null);
        }
    };

    const handleExport = async (entity: string) => {
        try {
            setLoadingEntity(entity + '_export');
            const response = await dataApi.exportData(entity);
            triggerFileDownload(response.data, `${entity}_export.csv`);
            toast.success('Data exported successfully');
        } catch (error) {
            toast.error('Failed to export data');
        } finally {
            setLoadingEntity(null);
        }
    };

    const triggerFileDownload = (blobData: any, filename: string) => {
        const url = window.URL.createObjectURL(new Blob([blobData]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const triggerUpload = (entity: string) => {
        setCurrentEntityForUpload(entity);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentEntityForUpload) return;

        try {
            setLoadingEntity(currentEntityForUpload + '_import');
            toast.loading('Importing data... This might take a moment.', { id: 'import_toast' });
            
            const res = await dataApi.importData(currentEntityForUpload, file);
            
            toast.success(res.data?.message || 'Data imported successfully!', { id: 'import_toast' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to import data', { id: 'import_toast' });
        } finally {
            setLoadingEntity(null);
            setCurrentEntityForUpload(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const entities = [
        {
            id: 'products',
            titleAr: 'المنتجات والمستودع',
            titleEn: 'Products & Inventory',
            descriptionAr: 'استيراد أو تصدير قائمة المنتجات، الأسعار، الباركود وتفاصيل المخزون.',
            descriptionEn: 'Import or export products, pricing, barcodes, and details.',
            icon: <Box className="w-8 h-8 text-indigo-500" />
        },
        {
            id: 'customers',
            titleAr: 'العملاء وجهات الاتصال',
            titleEn: 'Customers & Contacts',
            descriptionAr: 'إدارة قاعدة بيانات عملائك والأرصدة الافتتاحية.',
            descriptionEn: 'Manage customer database and opening balances.',
            icon: <Users className="w-8 h-8 text-emerald-500" />
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border dark:border-gray-800">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Database className="w-7 h-7 text-indigo-600" />
                        {isRTL ? 'إدارة البيانات' : 'Data Management'}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {isRTL ? 'قم باستيراد بياناتك القديمة بسهولة عبر ملفات CSV أو تصدير بياناتك الحالية للنسخ الاحتياطي.' : 'Import your legacy data easily via CSV files, or export your current data for backup.'}
                    </p>
                </div>
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {entities.map(entity => (
                    <Card key={entity.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                {entity.icon}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{isRTL ? entity.titleAr : entity.titleEn}</h2>
                                <h3 className="text-sm font-medium text-gray-500">{isRTL ? entity.titleEn : entity.titleAr}</h3>
                                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                                    {isRTL ? entity.descriptionAr : entity.descriptionEn}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button 
                                variant="outline" 
                                className="w-full text-xs flex items-center justify-center gap-2"
                                onClick={() => handleDownloadTemplate(entity.id)}
                                disabled={loadingEntity !== null}
                            >
                                <FileDown className="w-4 h-4 text-blue-600" />
                                <span>{isRTL ? 'تحميل القالب' : 'Download Template'}</span>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="w-full text-xs flex items-center justify-center gap-2"
                                onClick={() => handleExport(entity.id)}
                                disabled={loadingEntity !== null}
                            >
                                <Download className="w-4 h-4 text-emerald-600" />
                                <span>{isRTL ? 'تصدير CSV' : 'Export CSV'}</span>
                            </Button>

                            <Button 
                                className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
                                onClick={() => triggerUpload(entity.id)}
                                disabled={loadingEntity !== null}
                            >
                                <Upload className="w-4 h-4" />
                                <span>{isRTL ? 'استيراد CSV' : 'Import CSV'}</span>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
                <h4 className="font-bold text-amber-800 dark:text-amber-500 mb-2">💡 {isRTL ? 'تعليمات هامة:' : 'Important Instructions:'}</h4>
                <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    {isRTL ? (
                        <>
                            <li>يرجى استخدام <strong>القالب (Template)</strong> المخصص لكل قسم لتجنب أخطاء الاستيراد.</li>
                            <li>لا تقم بتغيير أسماء الأعمدة في الصف الأول من ملف الـ CSV.</li>
                            <li>النظام يدعم استيراد آلاف السجلات في المرة الواحدة، قد تستغرق العملية بضع ثوانٍ.</li>
                        </>
                    ) : (
                        <>
                            <li>Please use the dedicated <strong>Template</strong> for each section to avoid import errors.</li>
                            <li>Do not change the column names in the first row of the CSV file.</li>
                            <li>The system supports importing thousands of records at once; the operation may take a few seconds.</li>
                        </>
                    )}
                </ul>
            </div>
        </div>
    );
}
