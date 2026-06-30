import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { inventoryApi } from '@/lib/api';
import { useModalA11y } from '@/hooks/useModalA11y';
import { Search, FileText, Package, X, ArrowRight, ArrowLeft } from 'lucide-react';

interface SmartSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    locale: string;
    dict: any;
}

const PAGES = [
    { path: '/sales', labelAr: 'فواتير المبيعات', labelEn: 'Sales Invoices', icon: FileText },
    { path: '/quotations', labelAr: 'عروض الأسعار', labelEn: 'Quotations', icon: FileText },
    { path: '/inventory', labelAr: 'الأصناف والمنتجات', labelEn: 'Products', icon: Package },
    { path: '/purchases', labelAr: 'فواتير المشتريات', labelEn: 'Purchase Invoices', icon: FileText },
    { path: '/customers', labelAr: 'العملاء', labelEn: 'Customers', icon: FileText },
    { path: '/suppliers', labelAr: 'الموردين', labelEn: 'Suppliers', icon: FileText },
    { path: '/accounting', labelAr: 'المحاسبة', labelEn: 'Accounting', icon: FileText },
    { path: '/reports', labelAr: 'التقارير', labelEn: 'Reports', icon: FileText },
    { path: '/settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: FileText },
];

export default function SmartSearchModal({ isOpen, onClose, locale, dict }: SmartSearchModalProps) {
    const isRTL = locale === 'ar';
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useModalA11y<HTMLDivElement>(isOpen, onClose);

    const [query, setQuery] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            setQuery('');
            setProducts([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }

        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await inventoryApi.searchProducts(query);
                if (res.data?.success && res.data?.data) {
                    setProducts(res.data.data.slice(0, 5)); // Limit to 5 products
                } else if (res.data && Array.isArray(res.data)) {
                    setProducts(res.data.slice(0, 5));
                } else if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
                    // Pagination wrapper
                    setProducts(res.data.data.data.slice(0, 5));
                }
            } catch (error) {

            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timeout);
    }, [query]);

    if (!isOpen) return null;

    const filteredPages = PAGES.filter(page => 
        page.labelAr.toLowerCase().includes(query.toLowerCase()) || 
        page.labelEn.toLowerCase().includes(query.toLowerCase())
    );

    const handleNavigate = (path: string) => {
        router.push(`/${locale}/dashboard${path}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 sm:px-6">
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)'
                }}
            >
                {/* Search Input */}
                <div className="flex items-center px-4 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={isRTL ? "ابحث عن منتج، قسم، أو صفحة..." : "Search products, sections, or pages..."}
                        className="flex-1 bg-transparent border-none outline-none px-4 text-base"
                        style={{ color: 'var(--text-primary)' }}
                    />
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    
                    {/* Loading State */}
                    {loading && (
                        <div className="p-4 flex justify-center">
                            <div className="auth-spinner w-6 h-6 border-2" />
                        </div>
                    )}

                    {/* Pages & Sections */}
                    {filteredPages.length > 0 && (
                        <div className="mb-4">
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'الأقسام والصفحات' : 'Sections & Pages'}
                            </div>
                            <div className="space-y-1">
                                {filteredPages.map(page => (
                                    <button
                                        key={page.path}
                                        onClick={() => handleNavigate(page.path)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50"
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                                            <page.icon className="w-4 h-4" />
                                        </div>
                                        <span className="flex-1 text-start text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {isRTL ? page.labelAr : page.labelEn}
                                        </span>
                                        {isRTL ? <ArrowLeft className="w-4 h-4 text-gray-400" /> : <ArrowRight className="w-4 h-4 text-gray-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products */}
                    {products.length > 0 && (
                        <div>
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'المنتجات' : 'Products'}
                            </div>
                            <div className="space-y-1">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleNavigate(`/inventory?search=${product.sku || product.name_ar}`)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50"
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 text-start">
                                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {isRTL ? product.name_ar || product.name_en : product.name_en || product.name_ar}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                SKU: {product.sku || '-'} | {product.price || product.selling_price || ''}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && query && filteredPages.length === 0 && products.length === 0 && (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                <Search className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {isRTL ? 'لم يتم العثور على نتائج' : 'No results found'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'جرب البحث بكلمات مختلفة' : 'Try searching with different keywords'}
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-4 py-3 border-t bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="px-1.5 py-0.5 rounded-md border shadow-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-body)' }}>Esc</span>
                        <span>{isRTL ? 'للإغلاق' : 'to close'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
