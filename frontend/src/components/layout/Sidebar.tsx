'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { useSidebar } from '@/providers/SidebarProvider';
import { logout, getStoredUser } from '@/lib/auth';
import { tasksApi, approvalsApi } from '@/lib/api';
import { useSwipe } from '@/hooks/useSwipe';
import type { Locale } from '@/types';

interface SidebarProps {
    locale: Locale;
    dict: any;
}

// ─── Icon Paths ──────────────────────────────────────────────────
const ICONS = {
    pos: 'M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h6l2 2v8a2 2 0 01-2 2h-2M9 7h2a2 2 0 012 2v2',
    dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    sales: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    returns: 'M9 14l-4-4m0 0l4-4m-4 4h11.586a2 2 0 012 2v2a2 2 0 01-2 2H5',
    warranty: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    movements: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4',
    transfers: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    purchases: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    suppliers: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
    accounting: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    zatca: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    customers: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    partnerships: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    hr: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    reports: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    branches: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    users: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    car: 'M5 10l1.2-3.6A2 2 0 018.1 5h7.8a2 2 0 011.9 1.4L19 10m-14 0h14m-14 0v6a2 2 0 002 2h10a2 2 0 002-2v-6m-9-2h2',
    wrench: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    chevron: 'M19 9l-7 7-7-7',
    collapse: 'M11 19l-7-7 7-7m8 14l-7-7 7-7',
    expand: 'M13 5l7 7-7 7M5 5l7 7-7 7',
    sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
    tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    ai: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    expenses: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

// ─── Menu Groups ──────────────────────────────────────────────────
interface SubItem {
    key: string;
    path: string;
    iconKey: keyof typeof ICONS;
    labelAr: string;
    labelEn: string;
    badge?: { text: string; color: string };
}

interface MenuGroup {
    key: string;
    iconKey: keyof typeof ICONS;
    labelAr: string;
    labelEn: string;
    color: string;
    children: SubItem[];
}

interface SingleItem {
    key: string;
    path: string;
    iconKey: keyof typeof ICONS;
    labelAr: string;
    labelEn: string;
    highlight?: boolean;
    badge?: { text: string; color: string };
}

const GROUPS: MenuGroup[] = [
    {
        key: 'sales-group',
        iconKey: 'sales',
        labelAr: 'المبيعات',
        labelEn: 'Sales',
        color: '#6366f1',
        children: [
            { key: 'sales_dashboard', path: '/sales', iconKey: 'dashboard', labelAr: 'لوحة المبيعات', labelEn: 'Sales Dashboard' },
            { key: 'sales_list', path: '/sales/list', iconKey: 'sales', labelAr: 'قائمة الفواتير', labelEn: 'Invoices List' },
            { key: 'sales_create', path: '/sales/create', iconKey: 'sales', labelAr: 'إنشاء فاتورة', labelEn: 'Create Invoice' },
            { key: 'quotations', path: '/quotations', iconKey: 'reports', labelAr: 'عروض الأسعار', labelEn: 'Quotations' },
            { key: 'shipping', path: '/shipping', iconKey: 'transfers', labelAr: 'الشحن السريع', labelEn: 'Shipping' },
            { key: 'deliveries', path: '/deliveries', iconKey: 'transfers', labelAr: 'إدارة التوصيل والمقادير', labelEn: 'Delivery Management' },
            { key: 'returns', path: '/returns', iconKey: 'returns', labelAr: 'المرتجعات والتلفيات', labelEn: 'Returns' },
            { key: 'core_returns', path: '/sales/core-returns', iconKey: 'returns', labelAr: 'استرداد تأمين الأجزاء', labelEn: 'Core Deposit Returns' },
            { key: 'rma_requests', path: '/sales/rma-requests', iconKey: 'warranty', labelAr: 'طلبات إذن الإرجاع (RMA)', labelEn: 'RMA Requests' },
            { key: 'warranty', path: '/returns/warranty', iconKey: 'warranty', labelAr: 'إدارة الضمانات', labelEn: 'Warranty Management' },
            { key: 'workshop', path: '/sales/workshop', iconKey: 'wrench', labelAr: 'الورشة وبطاقات العمل', labelEn: 'Workshop & Job Cards' },
        ],
    },
    {
        key: 'inventory-group',
        iconKey: 'inventory',
        labelAr: 'المخزون والتصنيع',
        labelEn: 'Inventory & MFG',
        color: '#22c55e',
        children: [
            { key: 'inventory', path: '/inventory', iconKey: 'inventory', labelAr: 'الأصناف والمنتجات', labelEn: 'Products' },
            { key: 'categories', path: '/inventory/categories', iconKey: 'inventory', labelAr: 'فئات المنتجات', labelEn: 'Categories' },
            { key: 'units', path: '/inventory/units', iconKey: 'inventory', labelAr: 'وحدات القياس', labelEn: 'Units of Measure' },
            { key: 'brands', path: '/inventory/brands', iconKey: 'inventory', labelAr: 'الماركات والعلامات', labelEn: 'Brands' },
            { key: 'crossReference', path: '/inventory/cross-reference', iconKey: 'inventory', labelAr: 'البحث بأرقام OEM', labelEn: 'OEM Cross-Reference' },
            { key: 'warehouses', path: '/inventory/warehouses', iconKey: 'inventory', labelAr: 'إدارة المستودعات', labelEn: 'Warehouses' },
            { key: 'binLocations', path: '/inventory/bin-locations', iconKey: 'inventory', labelAr: 'مواقع التخزين (Bins)', labelEn: 'Bin Locations' },
            { key: 'labels', path: '/inventory/labels', iconKey: 'reports', labelAr: 'طباعة ملصقات', labelEn: 'Print Labels' },
            { key: 'valuation', path: '/inventory/valuation', iconKey: 'reports', labelAr: 'تقييم المخزون', labelEn: 'Inventory Valuation' },
            { key: 'reconciliation', path: '/inventory/reconciliation', iconKey: 'reports', labelAr: 'مطابقة المخزون', labelEn: 'Reconciliation' },
            { key: 'stocktakes', path: '/inventory/stocktakes', iconKey: 'reports', labelAr: 'الجرد الفعلي للمخزون', labelEn: 'Physical Stocktakes' },
            { key: 'stockMovements', path: '/inventory/movements', iconKey: 'movements', labelAr: 'حركات المخزون', labelEn: 'Stock Movements' },
            { key: 'transfers', path: '/inventory/transfers', iconKey: 'transfers', labelAr: 'تحويلات المخازن', labelEn: 'Transfers' },
            { key: 'manufacturing', path: '/manufacturing', iconKey: 'inventory', labelAr: 'التصنيع والتجميع', labelEn: 'Manufacturing' },
            { key: 'vehicles', path: '/inventory/vehicles', iconKey: 'car', labelAr: 'إدارة توافق السيارات', labelEn: 'Vehicle Compatibility' },
            { key: 'writeoffs', path: '/inventory/write-offs', iconKey: 'returns', labelAr: 'إتلاف وشطب المخزون', labelEn: 'Stock Write-Offs' },
        ],
    },
    {
        key: 'purchases-group',
        iconKey: 'purchases',
        labelAr: 'المشتريات',
        labelEn: 'Purchases',
        color: '#f59e0b',
        children: [
            { key: 'purchaseRequests', path: '/purchases/requests', iconKey: 'purchases', labelAr: 'طلبات الشراء (PR)', labelEn: 'Purchase Requests' },
            { key: 'rfqs', path: '/purchases/rfqs', iconKey: 'purchases', labelAr: 'عروض الأسعار (RFQ)', labelEn: 'RFQs' },
            { key: 'purchaseOrders', path: '/purchases/orders', iconKey: 'purchases', labelAr: 'أوامر الشراء (PO)', labelEn: 'Purchase Orders' },
            { key: 'purchases', path: '/purchases', iconKey: 'purchases', labelAr: 'فواتير الشراء', labelEn: 'Purchase Invoices' },
            { key: 'suppliers', path: '/suppliers', iconKey: 'suppliers', labelAr: 'الموردين', labelEn: 'Suppliers' },
            { key: 'supplierPrices', path: '/purchases/supplier-prices', iconKey: 'purchases', labelAr: 'قوائم أسعار الموردين', labelEn: 'Supplier Price Lists' },
            { key: 'smartOrders', path: '/purchases/smart-orders', iconKey: 'reports', labelAr: 'الطلبيات الذكية', labelEn: 'Smart Orders', badge: { text: 'AI', color: '#8b5cf6' } },
        ],
    },
    {
        key: 'accounting-group',
        iconKey: 'accounting',
        labelAr: 'المحاسبة والخزينة',
        labelEn: 'Accounting & Treasury',
        color: '#8b5cf6',
        children: [
            { key: 'accounting', path: '/accounting', iconKey: 'accounting', labelAr: 'القيود اليومية', labelEn: 'Journal Entries' },
            { key: 'expenseVouchers', path: '/accounting/expense-vouchers', iconKey: 'expenses', labelAr: 'سندات الصرف', labelEn: 'Expense Vouchers' },
            { key: 'banks', path: '/accounting/banks', iconKey: 'accounting', labelAr: 'الحسابات البنكية', labelEn: 'Bank Accounts' },
            { key: 'treasury', path: '/treasury', iconKey: 'accounting', labelAr: 'الخزينة والبنوك', labelEn: 'Treasury & Banks' },
            { key: 'creditNotes', path: '/accounting/credit-notes', iconKey: 'accounting', labelAr: 'الإشعارات الدائنة', labelEn: 'Credit Notes' },
            { key: 'fixedAssets', path: '/fixed-assets', iconKey: 'inventory', labelAr: 'الأصول الثابتة', labelEn: 'Fixed Assets' },
            { key: 'accSettings', path: '/accounting/settings', iconKey: 'settings', labelAr: 'إعدادات المحاسبة', labelEn: 'Accounting Settings' },
            {
                key: 'vatReport', path: '/zatca/vat-report', iconKey: 'zatca', labelAr: 'تقرير ضريبة القيمة المضافة', labelEn: 'VAT Report',
                badge: { text: 'ZATCA', color: '#10b981' },
            },
            {
                key: 'zatcaOnboarding', path: '/zatca/onboarding', iconKey: 'zatca', labelAr: 'إعدادات ربط الزكاة والدخل', labelEn: 'ZATCA Onboarding',
            },
        ],
    },
    {
        key: 'crm-group',
        iconKey: 'customers',
        labelAr: 'العملاء والعلاقات',
        labelEn: 'CRM',
        color: '#06b6d4',
        children: [
            { key: 'customers', path: '/customers', iconKey: 'customers', labelAr: 'العملاء', labelEn: 'Customers' },
            { key: 'customerVehicles', path: '/customers/vehicles', iconKey: 'car', labelAr: 'سيارات العملاء', labelEn: 'Customer Vehicles' },
            { key: 'receivables-dash', path: '/receivables', iconKey: 'reports', labelAr: 'إدارة المديونيات', labelEn: 'Receivables Dashboard' },
            { key: 'receivables-collect', path: '/receivables/collect', iconKey: 'accounting', labelAr: 'تحصيل الدفعات', labelEn: 'Collect Payment' },
            { key: 'receivables-statement', path: '/receivables/statement', iconKey: 'reports', labelAr: 'كشف حساب عميل', labelEn: 'Customer Statement' },
            { key: 'partnerships', path: '/partnerships', iconKey: 'partnerships', labelAr: 'الشراكات والأرباح', labelEn: 'Partnerships' },
        ],
    },
    {
        key: 'hr-group',
        iconKey: 'hr',
        labelAr: 'الموارد البشرية',
        labelEn: 'HR & Payroll',
        color: '#ec4899',
        children: [
            { key: 'employees', path: '/hr/employees', iconKey: 'users', labelAr: 'الموظفين', labelEn: 'Employees' },
            { key: 'attendance', path: '/hr/attendance', iconKey: 'reports', labelAr: 'الحضور والانصراف', labelEn: 'Attendance' },
            { key: 'leaves', path: '/hr/leaves', iconKey: 'reports', labelAr: 'إدارة الإجازات', labelEn: 'Leave Management' },
            { key: 'payroll', path: '/hr/payroll', iconKey: 'accounting', labelAr: 'مسيرات الرواتب', labelEn: 'Payroll' },
            { key: 'penalties', path: '/hr/penalties', iconKey: 'hr', labelAr: 'الجزاءات والتأخير', labelEn: 'Penalties & Late' },
            { key: 'loans', path: '/hr/loans', iconKey: 'accounting', labelAr: 'السلف والتقسيط', labelEn: 'Loans & Installments' },
        ],
    },
];

// Reports & System admin as collapsible groups (separate from main operations)
const EXTRA_GROUPS: MenuGroup[] = [
    {
        key: 'reports-group',
        iconKey: 'reports',
        labelAr: 'التقارير',
        labelEn: 'Reports',
        color: '#0ea5e9',
        children: [
            { key: 'reports', path: '/reports', iconKey: 'reports', labelAr: 'التقارير الشاملة', labelEn: 'All Reports' },
            { key: 'financialReports', path: '/reports/financial', iconKey: 'accounting', labelAr: 'التقارير المالية (P&L)', labelEn: 'Financial Reports (P&L)' },
            { key: 'advancedReports', path: '/reports/advanced', iconKey: 'reports', labelAr: 'تقارير الديون (Aging)', labelEn: 'Aging Reports' },
            { key: 'autoPartsReports', path: '/reports/auto-parts', iconKey: 'car', labelAr: 'تقارير قطع الغيار', labelEn: 'Auto Parts Reports' },
            { key: 'zakatReport', path: '/reports/zakat', iconKey: 'zatca', labelAr: 'حساب زكاة المال', labelEn: 'Zakat Calculator', badge: { text: 'زكاة', color: '#10b981' } },
            { key: 'analytics', path: '/analytics/ai-assistant', iconKey: 'ai', labelAr: 'المساعد المالي (AI)', labelEn: 'AI Assistant', badge: { text: 'AI', color: '#7c3aed' } },
        ],
    },
    {
        key: 'system-group',
        iconKey: 'settings',
        labelAr: 'إدارة النظام',
        labelEn: 'System Admin',
        color: '#64748b',
        children: [
            { key: 'branches', path: '/branches', iconKey: 'branches', labelAr: 'الفروع', labelEn: 'Branches' },
            { key: 'users', path: '/users', iconKey: 'users', labelAr: 'المستخدمون', labelEn: 'Users' },
            { key: 'roles', path: '/settings/roles', iconKey: 'shield', labelAr: 'الأدوار والصلاحيات', labelEn: 'Roles & Permissions' },
            { key: 'data', path: '/settings/data', iconKey: 'settings', labelAr: 'إدارة البيانات', labelEn: 'Data Management' },
            { key: 'settings', path: '/settings', iconKey: 'settings', labelAr: 'الإعدادات العامة', labelEn: 'General Settings' },
            { key: 'webhooks', path: '/webhooks', iconKey: 'settings', labelAr: 'الـ Webhooks', labelEn: 'Webhooks' },
            { key: 'subscriptions', path: '/subscriptions', iconKey: 'reports', labelAr: 'الاشتراك', labelEn: 'Subscription' },
        ],
    },
];

const SINGLE_ITEMS: SingleItem[] = [
    { key: 'tasks', path: '/tasks', iconKey: 'tasks', labelAr: 'المهام والمتابعة', labelEn: 'Tasks', badge: { text: 'New', color: '#6366f1' } },
    { key: 'approvals', path: '/approvals', iconKey: 'shield', labelAr: 'الموافقات', labelEn: 'Approvals' },
    { key: 'expenses', path: '/expenses', iconKey: 'expenses', labelAr: 'المصروفات', labelEn: 'Expenses' },
    { key: 'activity', path: '/activity', iconKey: 'reports', labelAr: 'سجل النشاطات', labelEn: 'Activity Log' },
];


function Icon({ path, className = 'w-5 h-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

// ─── Tooltip wrapper for mini mode ────────────────────────────────
function Tooltip({ label, children, collapsed, isRTL }: { label: string; children: React.ReactNode; collapsed: boolean; isRTL: boolean }) {
    if (!collapsed) return <>{children}</>;
    return (
        <div className="relative group/tip flex items-center">
            {children}
            <div className={`
                absolute z-[100] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none
                opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
                ${isRTL ? 'right-full me-2' : 'left-full ms-2'}
            `} style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-modal)' }}>
                {label}
            </div>
        </div>
    );
}

export default function Sidebar({ locale, dict }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { mode, collapsed, toggleCollapsed } = useSidebar();
    const isRTL = locale === 'ar';
    const user = typeof window !== 'undefined' ? getStoredUser() : null;
    const isMini = collapsed || mode === 'mini';

    // ── Helpers ──────────────────────────────────────────────────
    const lsGet = <T,>(key: string, fallback: T): T => {
        if (typeof window === 'undefined') return fallback;
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    };
    const lsSet = (key: string, value: unknown) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    };

    // ── Flat item map for search + recent labels ──────────────
    const allItems = useMemo(() => {
        const map: Record<string, { labelAr: string; labelEn: string; groupLabelAr?: string; groupLabelEn?: string; groupColor?: string }> = {};
        [...GROUPS, ...EXTRA_GROUPS].forEach(g => {
            g.children.forEach(c => { map[c.path] = { labelAr: c.labelAr, labelEn: c.labelEn, groupLabelAr: g.labelAr, groupLabelEn: g.labelEn, groupColor: g.color }; });
        });
        SINGLE_ITEMS.forEach(i => { map[i.path] = { labelAr: i.labelAr, labelEn: i.labelEn }; });
        map['/'] = { labelAr: 'لوحة التحكم', labelEn: 'Dashboard' };
        return map;
    }, []);

    // ── Group open state (persisted) ──────────────────────────
    const getInitialOpenGroups = useCallback(() => {
        const saved = lsGet<Record<string, boolean>>('sidebar_open_groups', {});
        const open: Record<string, boolean> = { ...saved };
        [...GROUPS, ...EXTRA_GROUPS].forEach(group => {
            if (group.children.some(c => pathname?.startsWith(`/${locale}/dashboard${c.path}`))) {
                open[group.key] = true;
            }
        });
        return open;
    }, [pathname, locale]);

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);
    const [isHovering, setIsHovering] = useState(false);

    // ── Search ────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return Object.entries(allItems)
            .filter(([, v]) => v.labelAr.includes(searchQuery) || v.labelEn.toLowerCase().includes(q))
            .slice(0, 8);
    }, [searchQuery, allItems]);

    // ── Pinned items (persisted) ──────────────────────────────
    const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => lsGet('sidebar_pinned', []));

    const togglePin = useCallback((path: string) => {
        setPinnedPaths(prev => {
            const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path].slice(0, 5);
            lsSet('sidebar_pinned', next);
            return next;
        });
    }, []);

    // ── Recent pages (persisted) ──────────────────────────────
    const [recentPaths, setRecentPaths] = useState<string[]>(() => lsGet('sidebar_recent', []));

    // ── Live counts ───────────────────────────────────────────
    const [liveCounts, setLiveCounts] = useState<{ tasks: number; approvals: number }>({ tasks: 0, approvals: 0 });

    // ── Effects ───────────────────────────────────────────────

    // Open active group when route changes
    useEffect(() => {
        setOpenGroups(getInitialOpenGroups());
    }, [pathname]);

    // Track recent pages
    useEffect(() => {
        if (!pathname) return;
        const dashPrefix = `/${locale}/dashboard`;
        if (!pathname.startsWith(dashPrefix)) return;
        const path = pathname.slice(dashPrefix.length) || '/';
        if (!allItems[path]) return;
        setRecentPaths(prev => {
            const next = [path, ...prev.filter(p => p !== path)].slice(0, 4);
            lsSet('sidebar_recent', next);
            return next;
        });
    }, [pathname, locale]);

    // Fetch live counts every 60s
    useEffect(() => {
        const fetch = async () => {
            const [t, a] = await Promise.allSettled([
                tasksApi.getTasks({ view: 'assigned', status: 'pending', per_page: 1 }),
                approvalsApi.getInbox({ per_page: 1 }),
            ]);
            setLiveCounts({
                tasks: t.status === 'fulfilled' ? (t.value.data?.total ?? t.value.data?.data?.length ?? 0) : 0,
                approvals: a.status === 'fulfilled' ? (a.value.data?.total ?? a.value.data?.data?.length ?? 0) : 0,
            });
        };
        fetch();
        const id = setInterval(fetch, 60_000);
        return () => clearInterval(id);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                toggleCollapsed();
            }
            if (e.key === 'Escape') {
                if (searchQuery) { setSearchQuery(''); }
                else if (!collapsed) { toggleCollapsed(); }
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [collapsed, toggleCollapsed, searchQuery]);

    // ── Handlers ──────────────────────────────────────────────
    const toggleGroup = (key: string) => {
        if (isMini && mode !== 'hover') return;
        setOpenGroups(prev => {
            const next = { ...prev, [key]: !prev[key] };
            lsSet('sidebar_open_groups', next);
            return next;
        });
    };

    const handleLogout = async () => {
        await logout();
        router.push(`/${locale}/login`);
    };

    // ── Mobile swipe gestures ────────────────────────────────────
    // Close: swipe away from the sidebar edge
    const swipeClose = useSwipe(
        isRTL ? null : (!collapsed ? toggleCollapsed : null),
        isRTL ? (!collapsed ? toggleCollapsed : null) : null,
    );
    // Open: thin edge zone swipe toward center
    const swipeOpen = useSwipe(
        isRTL ? (collapsed ? toggleCollapsed : null) : null,
        isRTL ? null : (collapsed ? toggleCollapsed : null),
    );

    const effectivelyExpanded = mode === 'hover' ? (isHovering || !collapsed) : !isMini;
    const sidebarWidth = effectivelyExpanded ? 'w-64' : 'w-16';

    const getLabel = (labelAr: string, labelEn: string) => isRTL ? labelAr : labelEn;

    return (
        <>
            {/* Edge swipe zone — لفتح الـ Sidebar بالسحب من حافة الشاشة على الموبايل */}
            <div
                className="md:hidden fixed top-0 bottom-0 w-5 z-20"
                style={{ [isRTL ? 'right' : 'left']: 0 }}
                onTouchStart={swipeOpen.onTouchStart}
                onTouchEnd={swipeOpen.onTouchEnd}
                aria-hidden="true"
            />

            {/* Overlay — موبايل فقط، لما الـ Sidebar مفتوح */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={toggleCollapsed}
                    aria-hidden="true"
                />
            )}
        <aside
            className={`${sidebarWidth} h-screen flex flex-col overflow-hidden fixed top-0 bottom-0 z-30 transition-transform duration-300 ease-in-out ${!collapsed ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} md:translate-x-0 max-md:z-50`}
            style={{ background: 'var(--bg-sidebar)', borderInlineEnd: '1px solid var(--border-default)' }}
            aria-label={isRTL ? 'القائمة الجانبية' : 'Sidebar navigation'}
            onMouseEnter={() => mode === 'hover' && setIsHovering(true)}
            onMouseLeave={() => mode === 'hover' && setIsHovering(false)}
            onTouchStart={swipeClose.onTouchStart}
            onTouchEnd={swipeClose.onTouchEnd}
        >
            {/* Skip to main content link for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-white"
                style={{ background: 'var(--color-primary)' }}
            >
                {isRTL ? 'انتقل إلى المحتوى الرئيسي' : 'Skip to main content'}
            </a>
            {/* ── Logo ── */}
            <div className="h-16 flex items-center gap-3 px-4 flex-shrink-0 relative"
                style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <span className="font-black text-sm" style={{ color: 'var(--color-primary)' }}>$</span>
                </div>
                {effectivelyExpanded && (
                    <span className="font-bold text-sm truncate transition-all duration-200" style={{ color: 'var(--text-primary)' }}>
                        {dict.common?.appName || 'SaaS Accounting'}
                    </span>
                )}
                {/* Collapse toggle */}
                {mode === 'full' && (
                    <button
                        onClick={toggleCollapsed}
                        className="absolute end-2 w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' }}
                        title={collapsed ? (isRTL ? 'توسيع' : 'Expand') : (isRTL ? 'تصغير' : 'Collapse')}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d={collapsed
                                    ? (isRTL ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7')
                                    : (isRTL ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7')
                                }
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* ── POS Quick Access ── */}
            <div className="px-3 pt-3 pb-1 flex-shrink-0">
                <Tooltip label={getLabel('نقطة البيع', 'POS Terminal')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <Link
                        href={`/${locale}/dashboard/pos`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 w-full
                            ${pathname?.includes('/pos') ? 'text-white' : 'hover:opacity-90'}
                        `}
                        style={{
                            background: pathname?.includes('/pos')
                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                : 'rgba(99,102,241,0.1)',
                            color: pathname?.includes('/pos') ? 'white' : 'var(--color-primary)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            boxShadow: pathname?.includes('/pos') ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                        }}
                    >
                        <Icon path={ICONS.pos} className="w-5 h-5 flex-shrink-0" />
                        {effectivelyExpanded && (
                            <>
                                <span>{getLabel('نقطة البيع', 'POS Terminal')}</span>
                                <span className="ms-auto text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/20">POS</span>
                            </>
                        )}
                    </Link>
                </Tooltip>
            </div>

            {/* ── Dashboard single link ── */}
            <div className="px-3 py-1 flex-shrink-0">
                <Tooltip label={getLabel('لوحة التحكم', 'Dashboard')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <Link
                        href={`/${locale}/dashboard`}
                        className={`sidebar-link ${pathname === `/${locale}/dashboard` ? 'active' : ''}`}
                    >
                        <div className="icon shadow-sm"><Icon path={ICONS.dashboard} /></div>
                        {effectivelyExpanded && <span>{getLabel('لوحة التحكم', 'Dashboard')}</span>}
                    </Link>
                </Tooltip>
            </div>

            {/* ── Search ── */}
            {effectivelyExpanded && (
                <div className="px-3 pb-2 flex-shrink-0">
                    <div className="relative">
                        <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={isRTL ? 'بحث... (Ctrl+K)' : 'Search... (Ctrl+K)'}
                            className="sidebar-search ps-8 pe-7"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute end-2 top-1/2 -translate-y-1/2 p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <div className="mt-1.5 rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-modal)' }}>
                            {searchResults.length === 0 ? (
                                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'لا توجد نتائج' : 'No results'}
                                </p>
                            ) : searchResults.map(([path, item]) => (
                                <Link key={path} href={`/${locale}/dashboard${path}`} onClick={() => setSearchQuery('')}
                                    className="flex items-center gap-2 px-3 py-2 transition-all"
                                    style={{ color: 'var(--text-primary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                    <span className="text-xs font-medium truncate flex-1">{isRTL ? item.labelAr : item.labelEn}</span>
                                    {item.groupLabelAr && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                                            style={{ background: `${item.groupColor}20`, color: item.groupColor }}>
                                            {isRTL ? item.groupLabelAr : item.groupLabelEn}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Main menu label ── */}
            {effectivelyExpanded && !searchQuery && (
                <div className="px-4 py-1 flex-shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'القوائم الرئيسية' : 'Main Menu'}
                    </p>
                </div>
            )}

            {/* ── Navigation ── */}
            <nav className="flex-1 min-h-0 px-3 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden sidebar-nav">

                {/* ── Pinned items ── */}
                {pinnedPaths.length > 0 && effectivelyExpanded && !searchQuery && (
                    <div className="mb-2">
                        <p className="px-1 text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'المفضلة' : 'Pinned'}
                        </p>
                        {pinnedPaths.map(path => {
                            const item = allItems[path];
                            if (!item) return null;
                            const href = `/${locale}/dashboard${path}`;
                            const isActive = pathname?.startsWith(href);
                            return (
                                <div key={path} className="group/item flex items-center gap-1">
                                    <Link href={href} className={`sidebar-link flex-1 py-2 gap-2 ${isActive ? 'active' : ''}`}>
                                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                        <span className="truncate text-xs">{isRTL ? item.labelAr : item.labelEn}</span>
                                    </Link>
                                    <button onClick={() => togglePin(path)} className="sidebar-pin-btn pinned" title={isRTL ? 'إزالة' : 'Unpin'}>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            );
                        })}
                        <div className="mt-1.5 mb-1" style={{ borderBottom: '1px solid var(--border-default)' }} />
                    </div>
                )}

                {/* All groups: main ops + reports & admin */}
                {[...GROUPS, ...EXTRA_GROUPS].map((group, idx) => {
                    const isGroupActive = group.children.some(child =>
                        pathname?.startsWith(`/${locale}/dashboard${child.path}`)
                    );
                    const isOpen = openGroups[group.key] || false;
                    const isFirstExtra = idx === GROUPS.length;

                    return (
                        <div key={group.key}>
                            {/* Section divider before Reports & Admin */}
                            {isFirstExtra && (
                                <div className="pt-2 mt-2 mb-1" style={{ borderTop: '1px solid var(--border-default)' }}>
                                    {effectivelyExpanded && (
                                        <p className="px-1 text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'التقارير والنظام' : 'Reports & Admin'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Group Header */}
                            <Tooltip label={getLabel(group.labelAr, group.labelEn)} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                                <button
                                    onClick={() => toggleGroup(group.key)}
                                    aria-expanded={isOpen}
                                    aria-controls={`sidebar-group-${group.key}`}
                                    className={`sidebar-link w-full text-start transition-all ${isGroupActive ? 'font-semibold' : ''}`}
                                    style={isGroupActive ? { color: group.color } : {}}
                                    onMouseEnter={e => { if (!isGroupActive) e.currentTarget.style.background = `${group.color}10`; }}
                                    onMouseLeave={e => { if (!isGroupActive) e.currentTarget.style.background = ''; }}
                                >
                                    <div className="icon relative flex-shrink-0">
                                        <Icon path={ICONS[group.iconKey]} />
                                        {isGroupActive && (
                                            <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full border-2"
                                                style={{ background: group.color, borderColor: 'var(--bg-sidebar)' }} />
                                        )}
                                    </div>

                                    {effectivelyExpanded && (
                                        <>
                                            <span className="flex-1 truncate">{getLabel(group.labelAr, group.labelEn)}</span>
                                            <svg
                                                className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.chevron} />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </Tooltip>

                            {/* Dropdown Children */}
                            <div
                                id={`sidebar-group-${group.key}`}
                                className={`sidebar-dropdown ${isOpen && effectivelyExpanded ? 'open' : ''}`}
                                role="region"
                                aria-label={getLabel(group.labelAr, group.labelEn)}
                            >
                                <div className="ps-2 space-y-0.5 pt-1 sidebar-tree">
                                    {group.children.map(child => {
                                        const href = `/${locale}/dashboard${child.path}`;
                                        const isActive = pathname?.startsWith(`/${locale}/dashboard${child.path}`);
                                        const isPinned = pinnedPaths.includes(child.path);
                                        return (
                                            <div key={child.key} className="group/item flex items-center ms-4 pe-1">
                                                <Link
                                                    href={href}
                                                    className={`sidebar-sub-link flex-1 ${isActive ? 'active' : ''}`}
                                                    style={isActive ? { color: group.color } : {}}
                                                >
                                                    <span className="truncate">{getLabel(child.labelAr, child.labelEn)}</span>
                                                    {child.badge && (
                                                        <span className="ms-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                                            style={{ background: `${child.badge.color}20`, color: child.badge.color }}>
                                                            {child.badge.text}
                                                        </span>
                                                    )}
                                                </Link>
                                                <button
                                                    onClick={() => togglePin(child.path)}
                                                    className={`sidebar-pin-btn ${isPinned ? 'pinned' : ''}`}
                                                    title={isPinned ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}
                                                >
                                                    <svg className="w-3 h-3" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* ── Follow-up section with live counts ── */}
                <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                    {effectivelyExpanded && (
                        <p className="px-1 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'المتابعة' : 'Follow-up'}
                        </p>
                    )}
                    {SINGLE_ITEMS.map(item => {
                        const href = `/${locale}/dashboard${item.path}`;
                        const isActive = pathname?.startsWith(`/${locale}/dashboard${item.path}`);
                        const liveCount = item.key === 'tasks' ? liveCounts.tasks : item.key === 'approvals' ? liveCounts.approvals : 0;
                        return (
                            <Tooltip key={item.key} label={getLabel(item.labelAr, item.labelEn)} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                                <Link href={href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                    <div className="icon shadow-sm relative">
                                        <Icon path={ICONS[item.iconKey]} />
                                        {!effectivelyExpanded && liveCount > 0 && (
                                            <span className="absolute -top-1 -end-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: '#ef4444' }}>
                                                {liveCount > 9 ? '9+' : liveCount}
                                            </span>
                                        )}
                                    </div>
                                    {effectivelyExpanded && (
                                        <>
                                            <span className="truncate flex-1">{getLabel(item.labelAr, item.labelEn)}</span>
                                            {liveCount > 0 ? (
                                                <span className="ms-auto text-[9px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#ef4444' }}>
                                                    {liveCount > 99 ? '99+' : liveCount}
                                                </span>
                                            ) : item.badge && (
                                                <span className="ms-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                                    style={{ background: `${item.badge.color}20`, color: item.badge.color }}>
                                                    {item.badge.text}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Link>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* ── Recent pages ── */}
                {recentPaths.length > 0 && effectivelyExpanded && !searchQuery && (
                    <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                        <p className="px-1 text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'آخر زيارة' : 'Recent'}
                        </p>
                        {recentPaths.map(path => {
                            const item = allItems[path];
                            if (!item) return null;
                            return (
                                <Link key={path} href={`/${locale}/dashboard${path}`} className="sidebar-recent-link">
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="truncate">{isRTL ? item.labelAr : item.labelEn}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </nav>

            {/* ── Bottom Controls ── */}
            <div className="px-3 py-3 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border-default)' }}>

                {/* Theme Toggle */}
                <Tooltip label={theme === 'dark' ? getLabel('الوضع النهاري','Light Mode') : getLabel('الوضع الليلي','Dark Mode')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300"
                        style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}
                    >
                        {theme === 'dark' ? (
                            <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.sun} />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.moon} />
                            </svg>
                        )}
                        {effectivelyExpanded && (
                            <>
                                <span className="flex-1 text-start">
                                    {theme === 'dark' ? getLabel('الوضع النهاري', 'Light Mode') : getLabel('الوضع الليلي', 'Dark Mode')}
                                </span>
                                <div className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 px-0.5 ${theme === 'dark' ? 'justify-end' : 'justify-start'}`}
                                    style={{ background: theme === 'dark' ? 'var(--color-primary)' : 'var(--border-default)' }}>
                                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                </div>
                            </>
                        )}
                    </button>
                </Tooltip>

                {/* Language Toggle — only when expanded */}
                {effectivelyExpanded && (
                    <div className="flex gap-2">
                        <Link
                            href={`/en/dashboard`}
                            className={`flex-1 text-center text-xs py-1.5 rounded-lg transition-all font-medium ${locale === 'en' ? 'bg-primary-600/20 text-primary-400' : ''}`}
                            style={locale !== 'en' ? { color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' } : {}}
                        >EN</Link>
                        <Link
                            href={`/ar/dashboard`}
                            className={`flex-1 text-center text-xs py-1.5 rounded-lg transition-all font-arabic font-medium ${locale === 'ar' ? 'bg-primary-600/20 text-primary-400' : ''}`}
                            style={locale !== 'ar' ? { color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' } : {}}
                        >عربي</Link>
                    </div>
                )}

                {/* Logout */}
                <Tooltip label={getLabel('تسجيل الخروج', 'Sign Out')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.logout} />
                        </svg>
                        {effectivelyExpanded && <span>{getLabel('تسجيل الخروج', 'Sign Out')}</span>}
                    </button>
                </Tooltip>
            </div>
        </aside>
        </>
    );
}
