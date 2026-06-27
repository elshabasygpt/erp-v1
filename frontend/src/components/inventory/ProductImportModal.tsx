'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { Product } from './hooks/useInventoryData';

interface ProductImportModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
    onSuccess: () => void;
    existingProducts: Product[];
    isInline?: boolean;
}

interface BackendStats {
    new: number;
    updated: number;
    unchanged: number;
    duplicate: number;
    failed: number;
}

export default function ProductImportModal({ dict, locale, onClose, onSuccess, existingProducts, isInline = false }: ProductImportModalProps) {
    const isRTL = locale === 'ar';
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview, 3: Progress
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [importMode, setImportMode] = useState<string>('create_update');

    // Exact behavior per mode, matching the backend logic in
    // ProductImport.php precisely — keep this in sync if that file changes.
    const importModeDescriptions: Record<string, { ar: string; en: string }> = {
        create_update: {
            ar: 'لكل صف في الملف: لو الكود/الباركود مش موجود يضيفه كمنتج جديد، ولو موجود يحدّث كل بياناته (الاسم، الأسعار، التصنيف، الماركة، الوصف...) بالقيم اللي في الملف.',
            en: 'For each row: creates a new product if its SKU/barcode doesn\'t exist yet, or updates ALL fields of the existing product (name, prices, category, brand, description...) with the file\'s values.',
        },
        create_only: {
            ar: 'يضيف المنتجات الجديدة فقط. أي صف يطابق منتج موجود بالفعل (بالكود أو الباركود) يتم تخطّيه تمامًا — حتى لو فيه بيانات مختلفة في الملف.',
            en: 'Adds new products only. Any row matching an existing product (by SKU or barcode) is skipped entirely — even if the file has different data for it.',
        },
        update_only: {
            ar: 'يحدّث المنتجات الموجودة فقط (كل الحقول). أي صف لمنتج غير موجود في النظام يتم تخطّيه ولا يُضاف.',
            en: 'Updates existing products only (all fields). Any row for a product not already in the system is skipped and not added.',
        },
        update_prices: {
            ar: 'يحدّث 3 حقول بس للمنتجات الموجودة: التكلفة، سعر البيع، سعر الجملة — وباقي البيانات (الاسم، التصنيف، الوصف...) لا تتأثر خالص. المنتجات الجديدة في الملف يتم تخطّيها.',
            en: 'Updates only 3 fields on existing products: cost price, sell price, wholesale price — nothing else (name, category, description, etc.) is touched. New products in the file are skipped.',
        },
        update_status: {
            ar: 'يحدّث حالة التفعيل فقط (نشط/متوقف) للمنتجات الموجودة بناءً على الملف. باقي البيانات لا تتأثر. المنتجات الجديدة يتم تخطّيها.',
            en: 'Updates only the active/inactive status of existing products from the file. Nothing else is touched. New products are skipped.',
        },
        update_category: {
            ar: 'ينقل المنتجات الموجودة للتصنيف المحدد في الملف فقط. باقي البيانات لا تتأثر. المنتجات الجديدة يتم تخطّيها.',
            en: 'Moves existing products to the category specified in the file only. Nothing else is touched. New products are skipped.',
        },
        update_brand: {
            ar: 'يحدّث الماركة/العلامة التجارية فقط للمنتجات الموجودة. باقي البيانات لا تتأثر. المنتجات الجديدة يتم تخطّيها.',
            en: 'Updates only the brand of existing products. Nothing else is touched. New products are skipped.',
        },
        update_aliases: {
            ar: 'يضيف فقط الأسماء التجارية البديلة (Aliases) المذكورة في الملف للمنتجات الموجودة، بدون تغيير أي حقل آخر. المنتجات الجديدة يتم تخطّيها.',
            en: 'Adds only the alias names listed in the file to existing products, without changing any other field. New products are skipped.',
        },
        update_description: {
            ar: 'يحدّث الوصف فقط للمنتجات الموجودة. باقي البيانات لا تتأثر. المنتجات الجديدة يتم تخطّيها.',
            en: 'Updates only the description of existing products. Nothing else is touched. New products are skipped.',
        },
        ignore_duplicates: {
            ar: 'نفس سلوك "إضافة وتحديث (الافتراضي)"، بفارق واحد: لو نفس الكود/الباركود تكرر في أكثر من صف داخل الملف نفسه، يتم معالجة أول ظهور له فقط وتجاهل باقي التكرارات بصمت (بدون اعتبارها خطأ في تقرير الاستيراد).',
            en: 'Same behavior as "Create & Update (Default)", with one difference: if the same SKU/barcode appears in more than one row within the same file, only the first occurrence is processed and the rest are silently skipped (not counted as an error in the import report).',
        },
        replace_all: {
            ar: 'يحذف نهائيًا (حذف صريح، غير قابل للتراجع) كل المنتجات الحالية في النظام أولًا، ثم يستورد محتوى الملف كمنتجات جديدة بالكامل من الصفر.',
            en: 'Permanently and irreversibly deletes ALL current products in the system first, then imports the file content as entirely new products from scratch.',
        },
    };
    const [failureCount, setFailureCount] = useState<number>(0);
    const [importId, setImportId] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<string>('');

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlMode = params.get('mode');
        
        if (urlMode) {
            setImportMode(urlMode);
        } else {
            const saved = localStorage.getItem('erp_import_settings');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.defaultMode) {
                        setImportMode(parsed.defaultMode);
                    }
                } catch (e) { }
            }
        }
    }, []);

    const downloadTemplate = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + '/api/tenant/products/import-template';
            
            const response = await axios.get(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'product_import_template.xlsx';
            link.click();
            toast.success(isRTL ? 'تم تحميل النموذج بنجاح' : 'Template downloaded successfully');
        } catch (error) {
            toast.error(isRTL ? 'فشل تحميل النموذج' : 'Failed to download template');
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0], importMode);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0], importMode);
        }
    };

    const processFile = async (file: File, mode: string) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
            toast.error(isRTL ? 'صيغة الملف غير مدعومة' : 'Unsupported file format');
            return;
        }

        setFile(file);
        setStep(3); // Show loading immediately
        setIsUploading(true);
        setUploadProgress(0);
        setImportStatus('pending');
        setBackendStats(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('import_mode', mode);
            formData.append('dry_run', 'true');

            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + '/api/tenant/products/import';

            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted < 10 ? percentCompleted : 10);
                    }
                }
            });

            if (response.status === 202 && response.data.data.import_id) {
                setImportId(response.data.data.import_id);
                pollStatus(response.data.data.import_id, true);
            }
        } catch (error) {
            toast.error(isRTL ? 'فشل إرسال الملف للفحص' : 'Failed to upload file for dry run');
            setStep(1);
            setIsUploading(false);
        }
    };
    // Removed local browser parsing for Enterprise Dry Run

    const submitImport = async () => {
        if (!importId || !backendStats) return;

        setStep(3);
        setIsUploading(true);
        setUploadProgress(0);
        setImportStatus('pending');

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/api/tenant/products/imports/${importId}/commit`;

            const response = await axios.post(apiUrl, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 200) {
                pollStatus(importId, false);
            }
        } catch (error) {
            toast.error(isRTL ? 'فشل إرسال طلب الاعتماد' : 'Failed to commit import');
            setStep(2);
            setIsUploading(false);
        }
    };

    const downloadErrorReport = async () => {
        if (!importId) return;
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/api/tenant/products/imports/${importId}/errors/export`;
            
            const response = await axios.get(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `import_errors_${importId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error(isRTL ? 'فشل تحميل تقرير الأخطاء' : 'Failed to download error report');
        }
    };

    // 150 attempts * 2s = 5 minutes. If a queued import job is stuck (worker
    // crashed, queue backed up, etc.) the modal would otherwise poll forever
    // with no feedback — stop and let the user cancel/resume explicitly.
    const MAX_POLL_ATTEMPTS = 150;

    const pollStatus = async (importId: string, isDryRun: boolean = false, attempt: number = 0) => {
        if (attempt >= MAX_POLL_ATTEMPTS) {
            toast.error(isRTL
                ? 'الاستيراد متوقف منذ فترة طويلة — حاول الاستئناف أو الإلغاء'
                : 'Import has been stuck for a while — try resuming or cancelling it', { duration: 6000 });
            setImportStatus('timeout');
            setIsUploading(false);
            return;
        }

        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/api/tenant/products/imports/${importId}/status`;
        
        try {
            const res = await axios.get(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = res.data.data;
            setImportStatus(data.status);
            
            if (data.status === 'completed' || data.status === 'dry_run_completed' || data.status === 'failed' || data.status === 'cancelled') {
                if (data.status === 'cancelled') {
                    toast.error(isRTL ? 'تم إلغاء العملية' : 'Process Cancelled');
                    setIsUploading(false);
                } else if (data.status === 'dry_run_completed') {
                    // Populate stats and go to step 2
                    setBackendStats({
                        new: data.imported_rows || 0,
                        updated: data.updated_rows || 0,
                        unchanged: data.skipped_rows || 0, // Unchanged map to skipped_rows
                        duplicate: 0, // We could count duplicates from failed_rows if needed, but for now it's grouped in failures
                        failed: data.failed_row_count || 0,
                    });
                    
                    if (data.failed_row_count > 0) {
                        setFailureCount(data.failed_row_count);
                    }
                    
                    setStep(2);
                    setIsUploading(false);
                } else if (data.status === 'failed' || data.failed_row_count > 0) {
                    setFailureCount(data.failed_row_count || 0);
                    toast.error(isRTL ? 'اكتمل مع وجود أخطاء' : 'Completed with some errors', { icon: '⚠️' });
                    setIsUploading(false);
                    setUploadProgress(100);
                } else {
                    toast.success(isRTL ? 'تم استيراد المنتجات بنجاح' : 'Products imported successfully');
                    setUploadProgress(100);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1000);
                }
            } else {
                // Update progress
                if (data.total_rows > 0) {
                    const percent = Math.min(99, Math.round((data.processed_rows / data.total_rows) * 100));
                    setUploadProgress(10 + Math.floor(percent * 0.89));
                }
                setTimeout(() => pollStatus(importId, isDryRun, attempt + 1), 2000);
            }
        } catch (error) {
            toast.error(isRTL ? 'خطأ في تتبع الاستيراد' : 'Error tracking import status');
            setIsUploading(false);
            setImportStatus('failed');
        }
    };

    const cancelImport = async () => {
        if (!importId) return;
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/api/tenant/products/imports/${importId}/cancel`;
            await axios.post(apiUrl, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            toast.success(isRTL ? 'جاري الإلغاء...' : 'Cancelling...');
            setImportStatus('cancelled');
            setIsUploading(false);
        } catch (error) {
            toast.error(isRTL ? 'فشل الإلغاء' : 'Failed to cancel');
        }
    };

    const resumeImport = async () => {
        if (!importId) return;
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/api/tenant/products/imports/${importId}/resume`;
            await axios.post(apiUrl, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            toast.success(isRTL ? 'جاري الاستئناف...' : 'Resuming...');
            setImportStatus('pending');
            setIsUploading(true);
            pollStatus(importId);
        } catch (error) {
            toast.error(isRTL ? 'فشل الاستئناف' : 'Failed to resume');
        }
    };

    const totalValid = backendStats ? (backendStats.new + backendStats.updated) : 0;

    const modalClasses = isInline 
        ? "h-full w-full flex flex-col bg-transparent"
        : "modal-overlay z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4";

    const contentClasses = isInline
        ? "w-full h-full flex flex-col overflow-hidden"
        : "bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95";

    return (
        <div className={modalClasses}>
            <div className={contentClasses}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700">
                    <div>
                        <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                            {isRTL ? '📥 استيراد منتجات (Excel/CSV)' : '📥 Import Products (Excel/CSV)'}
                        </h2>
                        <p className="text-sm text-surface-500 mt-1">
                            {step === 1 ? (isRTL ? 'ارفع الملف لبدء الفحص' : 'Upload file to start validation') :
                             step === 2 ? (isRTL ? 'مراجعة وحل التعارضات قبل الاعتماد' : 'Review and resolve conflicts before confirming') :
                             importStatus === 'cancelled' ? (isRTL ? 'تم إلغاء الاستيراد' : 'Import Cancelled') :
                             importStatus === 'failed' ? (isRTL ? 'فشل الاستيراد' : 'Import Failed') :
                             importStatus === 'timeout' ? (isRTL ? 'الاستيراد متوقف' : 'Import Stuck') :
                             (isRTL ? 'جاري الاستيراد والتحديث' : 'Importing and updating...')}
                        </p>
                    </div>
                    {step !== 3 && (
                        <button onClick={onClose} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-full transition-colors">
                            ✕
                        </button>
                    )}
                </div>

                {step !== 3 && (
                    <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/30 border-b border-surface-200 dark:border-surface-700">
                        <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'وضع الاستيراد (Import Mode)' : 'Import Mode'}
                        </label>
                        <select 
                            className="input-field w-full max-w-md"
                            value={importMode}
                            onChange={(e: any) => setImportMode(e.target.value)}
                        >
                            <option value="create_update">{isRTL ? 'إضافة المنتجات الجديدة وتحديث الحالية (الافتراضي)' : 'Create New & Update Existing (Default)'}</option>
                            <option value="create_only">{isRTL ? 'إضافة المنتجات الجديدة فقط (تخطي الموجود)' : 'Create New Only (Skip Existing)'}</option>
                            <option value="update_only">{isRTL ? 'تحديث كافة الحقول للمنتجات الموجودة فقط' : 'Update All Fields (Existing Only)'}</option>
                            <option value="update_prices" className="font-semibold text-primary-600">{isRTL ? 'تحديث الأسعار فقط (تخطي غيرها)' : 'Update Prices Only'}</option>
                            <option value="update_status" className="font-semibold text-primary-600">{isRTL ? 'تحديث الحالة فقط' : 'Update Status Only'}</option>
                            <option value="update_category" className="font-semibold text-primary-600">{isRTL ? 'تحديث التصنيف فقط' : 'Update Category Only'}</option>
                            <option value="update_brand" className="font-semibold text-primary-600">{isRTL ? 'تحديث الماركة فقط' : 'Update Brand Only'}</option>
                            <option value="update_aliases" className="font-semibold text-primary-600">{isRTL ? 'تحديث الأسماء البديلة (Aliases) فقط' : 'Update Aliases Only'}</option>
                            <option value="update_description" className="font-semibold text-primary-600">{isRTL ? 'تحديث الوصف فقط' : 'Update Description Only'}</option>
                            <option value="ignore_duplicates">{isRTL ? 'تجاهل التكرارات داخل الملف' : 'Ignore Duplicates within File'}</option>
                            <option value="replace_all">{isRTL ? 'مسح كل المنتجات السابقة واستيراد كجديد (خطر!)' : 'Replace All Data (Wipe & Import Fresh)'}</option>
                        </select>
                        {importModeDescriptions[importMode] && (
                            <div className={`mt-3 text-xs p-3 rounded border ${
                                importMode === 'replace_all'
                                    ? 'font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                                    : importMode === 'ignore_duplicates'
                                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                    : 'text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-800/60 border-surface-200 dark:border-surface-700'
                            }`}>
                                {isRTL ? importModeDescriptions[importMode].ar : importModeDescriptions[importMode].en}
                            </div>
                        )}
                    </div>
                )}

                <div className="p-6 flex-1 overflow-y-auto max-h-[70vh]">
                    {step === 1 && (
                        <div 
                            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-surface-50 dark:hover:bg-surface-800/50'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input ref={inputRef} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-4xl mb-4">
                                📊
                            </div>
                            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">
                                {isRTL ? 'اسحب وأفلت الملف هنا' : 'Drag & Drop file here'}
                            </h3>
                            <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-sm">
                                {isRTL ? 'أو اضغط لاختيار ملف من جهازك. ندعم صيغ XLSX و CSV.' : 'Or click to browse from your device. We support XLSX and CSV formats.'}
                            </p>
                            <div className="flex gap-4">
                                <button className="btn-primary pointer-events-none">
                                    {isRTL ? 'استعراض الملفات' : 'Browse Files'}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); downloadTemplate(); }} className="btn-secondary bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-900 dark:text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                    📄 {isRTL ? 'تحميل نموذج Excel' : 'Download Excel Template'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && backendStats && (
                        <div className="space-y-6">
                            <div className="bg-surface-100 dark:bg-surface-800 p-6 rounded-2xl border border-surface-200 dark:border-surface-700">
                                <h3 className="text-xl font-bold mb-6 flex justify-between items-center">
                                    <span>{isRTL ? 'ملخص الفحص (Dry Run Preview)' : 'Dry Run Preview Summary'}</span>
                                    <span className="text-sm font-normal text-surface-500">{isRTL ? 'لا شيء يُحفظ حتى التأكيد' : 'Nothing is saved until user confirms.'}</span>
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🆕</span>
                                            <span className="font-bold text-emerald-800 dark:text-emerald-400">{isRTL ? 'منتجات جديدة' : 'New Products'}</span>
                                        </div>
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-500">{backendStats.new}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🔄</span>
                                            <span className="font-bold text-blue-800 dark:text-blue-400">{isRTL ? 'منتجات مُحدّثة' : 'Updated Products'}</span>
                                        </div>
                                        <span className="text-xl font-black text-blue-600 dark:text-blue-500">{backendStats.updated}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">✅</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-400">{isRTL ? 'منتجات بدون تغيير (تخطي)' : 'Skipped Products (Unchanged)'}</span>
                                        </div>
                                        <span className="text-xl font-black text-slate-600 dark:text-slate-500">{backendStats.unchanged}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🔂</span>
                                            <span className="font-bold text-amber-800 dark:text-amber-400">{isRTL ? 'مكررات' : 'Duplicate Products'}</span>
                                        </div>
                                        <span className="text-xl font-black text-amber-600 dark:text-amber-500">{backendStats.duplicate}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">❌</span>
                                            <span className="font-bold text-rose-800 dark:text-rose-400">{isRTL ? 'أخطاء' : 'Errors'}</span>
                                        </div>
                                        <span className="text-xl font-black text-rose-600 dark:text-rose-500">{backendStats.failed}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-24 h-24 mb-6 relative">
                                <svg className="w-full h-full animate-spin text-primary-200 dark:text-primary-900/30" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" strokeWidth="10" stroke="currentColor" />
                                </svg>
                                <svg className="w-full h-full animate-spin absolute top-0 left-0 text-primary-500" viewBox="0 0 100 100" style={{ strokeDasharray: 283, strokeDashoffset: 283 - (283 * uploadProgress) / 100, transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.3s ease' }}>
                                    <circle cx="50" cy="50" r="45" fill="none" strokeWidth="10" stroke="currentColor" strokeLinecap="round" />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-primary-600 dark:text-primary-400">
                                    {uploadProgress}%
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
                                {importStatus === 'cancelled'
                                    ? (isRTL ? 'تم إلغاء الاستيراد من قبل المستخدم' : 'Import Cancelled by User')
                                    : importStatus === 'failed'
                                        ? (isRTL ? 'توقف الاستيراد بسبب خطأ' : 'Import Stopped due to Error')
                                        : importStatus === 'timeout'
                                            ? (isRTL ? 'الاستيراد متوقف منذ فترة طويلة' : 'Import Has Been Stuck')
                                        : uploadProgress < 100
                                            ? (isRTL ? 'جاري الاستيراد والتحديث...' : 'Importing and updating...')
                                            : (failureCount > 0 ? (isRTL ? 'اكتمل مع وجود أخطاء' : 'Completed with errors') : (isRTL ? 'تم الاستيراد بنجاح!' : 'Import Successful!'))
                                }
                            </h3>
                            <p className="text-surface-500 dark:text-surface-400 max-w-md text-center">
                                {importStatus === 'timeout'
                                    ? (isRTL ? 'لم نتمكن من تأكيد اكتمال الاستيراد في الوقت المتوقع. يمكنك استئنافه أو إلغاؤه من الأزرار بالأسفل.' : "We couldn't confirm the import finished within the expected time. You can resume or cancel it below.")
                                    : uploadProgress < 100
                                    ? (isRTL ? 'يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ حسب حجم الملف.' : 'Please wait, this might take a few seconds depending on file size.')
                                    : (failureCount > 0
                                        ? (isRTL ? `تم تخطي ${failureCount} صفاً بسبب أخطاء في التحقق. يرجى تحميل تقرير الأخطاء لمراجعتها.` : `${failureCount} rows were skipped due to validation errors. Please download the error report to review.`)
                                        : (isRTL ? 'تم استيراد كافة البيانات بنجاح وبدون أخطاء.' : 'All data was imported successfully with no errors.')
                                    )
                                }
                            </p>
                            {uploadProgress === 100 && failureCount > 0 && (
                                <button onClick={downloadErrorReport} className="mt-6 btn-primary bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700">
                                    📥 {isRTL ? 'تحميل تقرير الأخطاء (Excel)' : 'Download Error Report (Excel)'}
                                </button>
                            )}
                            
                            {/* Cancel / Resume Controls */}
                            <div className="mt-6 flex gap-4">
                                {isUploading && (importStatus === 'pending' || importStatus === 'processing') && (
                                    <button onClick={cancelImport} className="btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/30">
                                        🛑 {isRTL ? 'إلغاء الاستيراد' : 'Cancel Import'}
                                    </button>
                                )}
                                {(importStatus === 'cancelled' || importStatus === 'failed' || importStatus === 'timeout') && (
                                    <button onClick={resumeImport} className="btn-primary flex items-center gap-2">
                                        ▶️ {isRTL ? 'استئناف الاستيراد' : 'Resume Import'}
                                    </button>
                                )}
                            </div>

                            {(!isUploading || uploadProgress === 100) && (
                                <button onClick={() => { onSuccess(); onClose(); }} className="mt-4 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 font-bold">
                                    {isRTL ? 'إغلاق' : 'Close'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div className="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 flex items-center justify-between">
                        <div className="text-sm font-bold text-surface-600 dark:text-surface-300">
                            {isRTL ? `سيتم حفظ ${totalValid} منتجاً صالحاً` : `Will save ${totalValid} valid products`}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="btn-secondary">
                                {isRTL ? 'إلغاء واختيار ملف آخر' : 'Cancel & Choose Another'}
                            </button>
                            <button onClick={submitImport} disabled={totalValid === 0 || isUploading} className="btn-primary flex items-center gap-2">
                                📤 {isRTL ? 'تأكيد الاستيراد' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
