'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

interface ActivityEvent {
    id: string;
    type: 'create' | 'update' | 'delete' | 'login' | 'print' | 'payment' | 'return' | 'approve';
    entityType: string;
    entityId: string;
    entityLabel: string;
    userNameAr: string;
    userNameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    timestamp: number;
    metadata?: Record<string, string | number>;
}

const TYPE_CONFIG: Record<ActivityEvent['type'], { icon: string; color: string; bg: string; labelAr: string; labelEn: string }> = {
    create:  { icon: '➕', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', labelAr: 'إنشاء', labelEn: 'Create' },
    update:  { icon: '✏️', color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-900/30',    labelAr: 'تعديل', labelEn: 'Update' },
    delete:  { icon: '🗑️', color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/30',      labelAr: 'حذف', labelEn: 'Delete' },
    login:   { icon: '🔑', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', labelAr: 'تسجيل دخول', labelEn: 'Login' },
    print:   { icon: '🖨️', color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800',       labelAr: 'طباعة', labelEn: 'Print' },
    payment: { icon: '💰', color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-900/30',  labelAr: 'دفع', labelEn: 'Payment' },
    return:  { icon: '↩️', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', labelAr: 'مرتجع', labelEn: 'Return' },
    approve: { icon: '✅', color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-900/30',    labelAr: 'موافقة', labelEn: 'Approve' },
};

// Sample data — replace with real API call
const SAMPLE_EVENTS: ActivityEvent[] = [
    { id: '1', type: 'create', entityType: 'invoice', entityId: 'INV-1234', entityLabel: 'فاتورة #1234', userNameAr: 'أحمد محمد', userNameEn: 'Ahmed Mohamed', descriptionAr: 'أنشأ فاتورة جديدة بقيمة 2,500 ريال', descriptionEn: 'Created new invoice worth 2,500 SAR', timestamp: Date.now() - 5 * 60000 },
    { id: '2', type: 'payment', entityType: 'invoice', entityId: 'INV-1230', entityLabel: 'فاتورة #1230', userNameAr: 'سارة أحمد', userNameEn: 'Sara Ahmed', descriptionAr: 'استلمت دفعة نقدية 1,000 ريال', descriptionEn: 'Received cash payment of 1,000 SAR', timestamp: Date.now() - 23 * 60000 },
    { id: '3', type: 'update', entityType: 'product', entityId: 'SKU-5001', entityLabel: 'فلتر زيت Toyota', userNameAr: 'محمد علي', userNameEn: 'Mohamed Ali', descriptionAr: 'تحديث سعر البيع من 45 إلى 52 ريال', descriptionEn: 'Updated selling price from 45 to 52 SAR', timestamp: Date.now() - 1.2 * 3600000 },
    { id: '4', type: 'delete', entityType: 'invoice', entityId: 'INV-1220', entityLabel: 'فاتورة #1220', userNameAr: 'فاطمة حسن', userNameEn: 'Fatima Hassan', descriptionAr: 'حذف فاتورة مسودة', descriptionEn: 'Deleted draft invoice', timestamp: Date.now() - 2 * 3600000 },
    { id: '5', type: 'login', entityType: 'user', entityId: 'USR-001', entityLabel: 'أحمد محمد', userNameAr: 'أحمد محمد', userNameEn: 'Ahmed Mohamed', descriptionAr: 'تسجيل دخول من Chrome / Windows', descriptionEn: 'Logged in from Chrome / Windows', timestamp: Date.now() - 3 * 3600000 },
    { id: '6', type: 'approve', entityType: 'purchase', entityId: 'PO-0078', entityLabel: 'أمر شراء #0078', userNameAr: 'مدير المشتريات', userNameEn: 'Purchases Manager', descriptionAr: 'تمت الموافقة على أمر الشراء', descriptionEn: 'Purchase order approved', timestamp: Date.now() - 5 * 3600000 },
    { id: '7', type: 'return', entityType: 'invoice', entityId: 'RET-0045', entityLabel: 'مرتجع #0045', userNameAr: 'سارة أحمد', userNameEn: 'Sara Ahmed', descriptionAr: 'تم ترحيل مرتجع مبيعات بقيمة 320 ريال', descriptionEn: 'Sales return of 320 SAR processed', timestamp: Date.now() - 8 * 3600000 },
    { id: '8', type: 'print', entityType: 'report', entityId: 'RPT-VAT', entityLabel: 'تقرير ضريبة القيمة المضافة', userNameAr: 'محمد علي', userNameEn: 'Mohamed Ali', descriptionAr: 'طباعة تقرير ضريبة الربع الثالث', descriptionEn: 'Printed Q3 VAT report', timestamp: Date.now() - 24 * 3600000 },
    { id: '9', type: 'create', entityType: 'customer', entityId: 'CUS-0890', entityLabel: 'شركة التقنية المتقدمة', userNameAr: 'فاطمة حسن', userNameEn: 'Fatima Hassan', descriptionAr: 'إضافة عميل جديد بحد ائتمان 10,000 ريال', descriptionEn: 'Added new customer with 10,000 SAR credit limit', timestamp: Date.now() - 30 * 3600000 },
    { id: '10', type: 'update', entityType: 'user', entityId: 'USR-003', entityLabel: 'صلاحيات المستخدم', userNameAr: 'المدير', userNameEn: 'Admin', descriptionAr: 'تحديث صلاحيات محمد علي — إضافة إذن حذف الفواتير', descriptionEn: "Updated Mohamed Ali's permissions — added invoice delete", timestamp: Date.now() - 48 * 3600000 },
];

function timeAgo(timestamp: number, isRTL: boolean): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return isRTL ? 'الآن' : 'just now';
    if (mins < 60) return isRTL ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    if (hours < 24) return isRTL ? `منذ ${hours} ساعة` : `${hours}h ago`;
    return isRTL ? `منذ ${days} يوم` : `${days}d ago`;
}

function formatDate(timestamp: number, isRTL: boolean): string {
    return new Date(timestamp).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

type FilterType = 'all' | ActivityEvent['type'];

export default function ActivityLogPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const isRTL = locale === 'ar';

    const [events, setEvents] = useState<ActivityEvent[]>(SAMPLE_EVENTS);
    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 8;

    const filtered = events.filter(e => {
        const matchType = filter === 'all' || e.type === filter;
        const term = search.toLowerCase();
        const matchSearch = !term || (
            e.entityLabel.toLowerCase().includes(term) ||
            (isRTL ? e.userNameAr : e.userNameEn).toLowerCase().includes(term) ||
            (isRTL ? e.descriptionAr : e.descriptionEn).toLowerCase().includes(term)
        );
        return matchType && matchSearch;
    });

    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                    {isRTL ? 'سجل النشاطات' : 'Activity Log'}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'تتبع كل الإجراءات التي تمت في النظام' : 'Track all actions performed in the system'}
                </p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-5 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                    <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="search"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder={isRTL ? 'ابحث عن مستخدم، كيان، إجراء...' : 'Search user, entity, action...'}
                        className="input-field ps-9 py-2 text-sm"
                        aria-label={isRTL ? 'بحث في النشاطات' : 'Search activities'}
                    />
                </div>

                {/* Type Filter Chips */}
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={isRTL ? 'تصفية حسب النوع' : 'Filter by type'}>
                    {(['all', ...Object.keys(TYPE_CONFIG)] as FilterType[]).map(type => {
                        const cfg = type === 'all' ? null : TYPE_CONFIG[type as ActivityEvent['type']];
                        const isActive = filter === type;
                        return (
                            <button
                                key={type}
                                onClick={() => { setFilter(type); setPage(1); }}
                                aria-pressed={isActive}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                    isActive
                                        ? 'bg-primary-500 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15'
                                }`}
                            >
                                {type === 'all'
                                    ? (isRTL ? 'الكل' : 'All')
                                    : (cfg ? (isRTL ? cfg.labelAr : cfg.labelEn) : type)
                                }
                            </button>
                        );
                    })}
                </div>

                <span className="text-xs ms-auto" style={{ color: 'var(--text-muted)' }}>
                    {filtered.length} {isRTL ? 'حدث' : 'events'}
                </span>
            </div>

            {/* Events list */}
            <div className="glass-card overflow-hidden">
                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                            style={{ background: 'var(--bg-surface-secondary)' }}>
                            <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'لا توجد نشاطات' : 'No activities found'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'جرب تغيير الفلتر أو البحث' : 'Try changing the filter or search'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border-light)' }} role="list" aria-label={isRTL ? 'قائمة النشاطات' : 'Activity list'}>
                        {paginated.map(event => {
                            const cfg = TYPE_CONFIG[event.type];
                            return (
                                <div
                                    key={event.id}
                                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    role="listitem"
                                >
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center text-base mt-0.5`}
                                        aria-hidden="true">
                                        {cfg.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                                {isRTL ? cfg.labelAr : cfg.labelEn}
                                            </span>
                                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                {event.entityLabel}
                                            </span>
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? event.descriptionAr : event.descriptionEn}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                                👤 {isRTL ? event.userNameAr : event.userNameEn}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                <span aria-hidden="true">•</span>
                                            </span>
                                            <time
                                                dateTime={new Date(event.timestamp).toISOString()}
                                                className="text-xs"
                                                style={{ color: 'var(--text-muted)' }}
                                                title={formatDate(event.timestamp, isRTL)}
                                            >
                                                {timeAgo(event.timestamp, isRTL)}
                                            </time>
                                        </div>
                                    </div>

                                    {/* Entity ID pill */}
                                    <div className="flex-shrink-0 hidden sm:block">
                                        <span className="text-[10px] px-2 py-1 rounded-lg font-mono"
                                            style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>
                                            {event.entityId}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div
                        className="flex items-center justify-between px-5 py-3 border-t"
                        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-table-header)' }}
                    >
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {isRTL
                                ? `صفحة ${page} من ${totalPages}`
                                : `Page ${page} of ${totalPages}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                aria-label={isRTL ? 'الصفحة السابقة' : 'Previous page'}
                                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d={isRTL ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
                                </svg>
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        aria-label={isRTL ? `صفحة ${p}` : `Page ${p}`}
                                        aria-current={page === p ? 'page' : undefined}
                                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                            page === p
                                                ? 'bg-primary-500 text-white shadow-sm'
                                                : 'hover:bg-gray-100 dark:hover:bg-white/10'
                                        }`}
                                        style={page !== p ? { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' } : {}}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                aria-label={isRTL ? 'الصفحة التالية' : 'Next page'}
                                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d={isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
