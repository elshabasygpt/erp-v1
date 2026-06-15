import { useState, useCallback } from 'react';

export function useSalesFilters(initialTab: 'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping' = 'invoices') {
    const [activeTab, setActiveTab] = useState<'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping'>(initialTab);
    const [showFilters, setShowFilters] = useState(false);
    const [showChart, setShowChart] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');

    return {
        activeTab, setActiveTab,
        showFilters, setShowFilters,
        showChart, setShowChart,
        showExportMenu, setShowExportMenu,
        search, setSearch,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        statusFilter, setStatusFilter,
        paymentFilter, setPaymentFilter,
        warehouseFilter, setWarehouseFilter,
        employeeFilter, setEmployeeFilter,
    };
}