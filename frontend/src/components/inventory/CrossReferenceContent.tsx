'use client';

import { useState, useCallback } from 'react';
import { inventoryApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Search, Package, AlertCircle, ExternalLink, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MatchItem {
    product_id: string;
    name: string;
    name_ar: string | null;
    sku: string;
    oem_number: string | null;
    part_number: string | null;
    brand: string | null;
    quality_grade: string | null;
    sell_price: number;
    stock: number;
    in_stock: boolean;
    match_type: 'direct' | 'cross_reference';
    matched_brand: string | null;
    matched_type: string | null;
}

interface AltItem {
    product_id: string;
    name: string;
    name_ar: string | null;
    sku: string;
    oem_number: string | null;
    brand: string | null;
    quality_grade: string | null;
    sell_price: number;
    stock: number;
    in_stock: boolean;
}

interface LookupResult {
    query: string;
    normalized: string;
    matches: MatchItem[];
    alternatives: AltItem[];
}

const QUALITY_LABELS: Record<string, string> = {
    original: 'أصلي',
    oem: 'OEM',
    aftermarket: 'بديل',
    used: 'مستعمل',
};

const TYPE_LABELS: Record<string, string> = {
    oem: 'أصلي',
    aftermarket: 'بديل',
    equivalent: 'مكافئ',
    superseded: 'مُحلّ',
};

interface Props {
    dict: any;
    locale: string;
}

export default function CrossReferenceContent({ locale }: Props) {
    const isRTL = locale === 'ar';
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LookupResult | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = useCallback(async () => {
        const q = query.trim();
        if (q.length < 2) {
            toast.error(isRTL ? 'أدخل حرفين على الأقل' : 'Enter at least 2 characters');
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const res = await inventoryApi.lookupCrossReference(q);
            const data = res.data?.data ?? res.data;
            setResult(data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل البحث' : 'Search failed'));
        } finally {
            setLoading(false);
        }
    }, [query, isRTL]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const goToProduct = (productId: string) => {
        router.push(`/${locale}/dashboard/inventory?highlight=${productId}`);
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'البحث بأرقام القطع (OEM / البديل)' : 'OEM Cross-Reference Search'}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {isRTL
                        ? 'ابحث بأي رقم قطعة من أي ماركة للعثور على القطعة وبدائلها'
                        : 'Search by any part number from any brand to find the part and its alternatives'}
                </p>
            </div>

            {/* Search Box */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search
                        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                        style={{ [isRTL ? 'right' : 'left']: '12px' }}
                    />
                    <input
                        className="input-field w-full font-mono text-lg"
                        style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: '40px' }}
                        placeholder={isRTL ? 'مثال: 90915-YZZD3 أو 0986452041 أو W68/3' : 'e.g. 90915-YZZD3 or 0986452041 or W68/3'}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        dir="ltr"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="btn-primary px-6 flex items-center gap-2 flex-shrink-0"
                >
                    {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Search className="w-4 h-4" />
                    )}
                    {isRTL ? 'بحث' : 'Search'}
                </button>
            </div>

            {/* Results */}
            {searched && !loading && result && (
                <div className="space-y-5">
                    {/* Matches */}
                    <div>
                        <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Package className="w-5 h-5 text-blue-500" />
                            {isRTL ? `نتائج مطابقة (${result.matches.length})` : `Matching Parts (${result.matches.length})`}
                        </h2>

                        {result.matches.length === 0 ? (
                            <div className="border rounded-xl p-8 text-center" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    {isRTL
                                        ? 'لا توجد قطعة بهذا الرقم — تأكد من الرقم أو أضفه كـ cross-reference لقطعة موجودة'
                                        : 'No part found for this number — verify the number or add it as a cross-reference to an existing part'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {result.matches.map(m => (
                                    <div
                                        key={m.product_id}
                                        className="border rounded-xl p-4 flex items-start gap-4"
                                        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}
                                    >
                                        {/* Stock indicator */}
                                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${m.in_stock ? 'bg-green-500' : 'bg-red-400'}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <div>
                                                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                        {m.name_ar || m.name}
                                                    </p>
                                                    {m.name_ar && m.name !== m.name_ar && (
                                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">{m.name}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        m.match_type === 'direct'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                    }`}>
                                                        {m.match_type === 'direct'
                                                            ? (isRTL ? 'مطابقة مباشرة' : 'Direct Match')
                                                            : `cross-ref${m.matched_brand ? ` · ${m.matched_brand}` : ''}${m.matched_type ? ` · ${TYPE_LABELS[m.matched_type] ?? m.matched_type}` : ''}`
                                                        }
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.in_stock ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'}`}>
                                                        {m.in_stock
                                                            ? `${isRTL ? 'مخزون' : 'In Stock'}: ${m.stock}`
                                                            : (isRTL ? 'نافد' : 'Out of Stock')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                <span dir="ltr">SKU: <span className="font-mono">{m.sku}</span></span>
                                                {m.oem_number && <span dir="ltr">OEM: <span className="font-mono">{m.oem_number}</span></span>}
                                                {m.brand && <span>{isRTL ? 'الماركة' : 'Brand'}: {m.brand}</span>}
                                                {m.quality_grade && <span>{isRTL ? 'الجودة' : 'Quality'}: {QUALITY_LABELS[m.quality_grade] ?? m.quality_grade}</span>}
                                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {isRTL ? 'السعر' : 'Price'}: {m.sell_price.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => goToProduct(m.product_id)}
                                            className="flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border"
                                            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            {isRTL ? 'عرض' : 'View'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Alternatives */}
                    {result.alternatives.length > 0 && (
                        <div>
                            <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Tag className="w-5 h-5 text-orange-500" />
                                {isRTL
                                    ? `قطع بديلة مقترحة (${result.alternatives.length})`
                                    : `Suggested Alternatives (${result.alternatives.length})`}
                                <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                                    — {isRTL ? 'من product_alternatives' : 'from product_alternatives'}
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {result.alternatives.map(a => (
                                    <div
                                        key={a.product_id}
                                        className="border rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-orange-300 transition-colors"
                                        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}
                                        onClick={() => goToProduct(a.product_id)}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.in_stock ? 'bg-green-500' : 'bg-red-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                {a.name_ar || a.name}
                                            </p>
                                            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                                                {a.sku}{a.brand ? ` · ${a.brand}` : ''}
                                            </p>
                                        </div>
                                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? 'مخزون' : 'Stock'}: {a.stock}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!searched && (
                <div className="border rounded-xl p-12 text-center" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                    <Search className="w-14 h-14 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                    <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL
                            ? 'أدخل رقم القطعة (OEM / part number) وابحث'
                            : 'Enter a part number (OEM / cross-reference) and search'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL ? 'مثال: 90915-YZZD3 أو 0986452041 أو W68/3' : 'e.g. 90915-YZZD3 or 0986452041 or W68/3'}
                    </p>
                </div>
            )}
        </div>
    );
}
