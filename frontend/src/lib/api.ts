import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - attach token and tenant ID
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        const tenantId = localStorage.getItem('tenant_id');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (tenantId) {
            config.headers['X-Tenant-ID'] = tenantId;
        }
    }
    return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isUnauthorized = error.response?.status === 401;
        const isTenantMissing = error.response?.status === 400 && error.response?.data?.error === 'missing_tenant';
        const isTenantNotFound = error.response?.status === 404 && error.response?.data?.error === 'tenant_not_found';
        const isTenantSuspended = error.response?.status === 403 && (error.response?.data?.error === 'tenant_suspended' || error.response?.data?.error === 'trial_expired');

        if (isUnauthorized || isTenantMissing || isTenantNotFound || isTenantSuspended) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('tenant_id');
                // Detect current locale from URL path instead of hardcoding
                const pathParts = window.location.pathname.split('/');
                const locale = ['ar', 'en'].includes(pathParts[1]) ? pathParts[1] : 'ar';
                window.location.href = `/${locale}/login`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// API helper functions
export const authApi = {
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    register: (data: {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
        phone?: string;
    }) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
};

export const salesApi = {
    // Sales Channels
    getSalesChannels: (params?: Record<string, any>) => api.get('/sales/channels', { params }),

    // Invoices
    getInvoices: (params?: Record<string, any>) => api.get('/sales/invoices', { params }),
    getInvoice: (id: string) => api.get(`/sales/invoices/${id}`),
    createInvoice: (data: any) => api.post('/sales/invoices', data),
    updateInvoice: (id: string, data: any) => api.put(`/sales/invoices/${id}`, data),
    updateInvoiceStatus: (id: string, status: string) => api.put(`/sales/invoices/${id}/status`, { status }),
    syncBulkInvoices: (invoices: any[]) => api.post('/sales/invoices/bulk', { invoices }),
    getSalesReport: (params?: { from?: string; to?: string }) => api.get('/sales/reports/sales', { params }),

    // Returns
    getReturns: (params?: Record<string, any>) => api.get('/sales/returns', { params }),
    getReturn: (id: string) => api.get(`/sales/returns/${id}`),
    createReturn: (data: any) => api.post('/sales/returns', data),
    updateReturnStatus: (id: string, status: string) => api.put(`/sales/returns/${id}/status`, { status }),

    // Quotations
    getQuotations: (params?: Record<string, any>) => api.get('/sales/quotations', { params }),
    getQuotation: (id: string) => api.get(`/sales/quotations/${id}`),
    createQuotation: (data: any) => api.post('/sales/quotations', data),
    updateQuotation: (id: string, data: any) => api.put(`/sales/quotations/${id}`, data),
    updateQuotationStatus: (id: string, status: string) => api.put(`/sales/quotations/${id}/status`, { status }),

    // Sales Orders
    getSalesOrders: (params?: Record<string, any>) => api.get('/sales/orders', { params }),
    getSalesOrder: (id: string) => api.get(`/sales/orders/${id}`),
    createSalesOrder: (data: any) => api.post('/sales/orders', data),
    fulfillSalesOrder: (id: string) => api.post(`/sales/orders/${id}/fulfill`),
    cancelSalesOrder: (id: string) => api.post(`/sales/orders/${id}/cancel`),

    // Shipping
    getShippingInvoices: (params?: Record<string, any>) => api.get('/sales/shipping', { params }),
    getShippingInvoice: (id: string) => api.get(`/sales/shipping/${id}`),
    createShippingInvoice: (data: any) => api.post('/sales/shipping', data),
    updateShippingInvoice: (id: string, data: any) => api.put(`/sales/shipping/${id}`, data),
    updateShippingStatus: (id: string, status: string) => api.put(`/sales/shipping/${id}/status`, { status }),

    // Deliveries
    getDeliveries: (params?: Record<string, any>) => api.get('/sales/deliveries', { params }),
    getDelivery: (id: string) => api.get(`/sales/deliveries/${id}`),
    createDelivery: (data: any) => api.post('/sales/deliveries', data),
    assignDelivery: (id: string, data: any) => api.post(`/sales/deliveries/${id}/assign`, data),
    updateDeliveryStatus: (id: string, data: { status: string; notes?: string }) => api.put(`/sales/deliveries/${id}/status`, data),
};

export const approvalsApi = {
    getInbox: (params?: any) => api.get('/approvals/inbox', { params }),
    approveRequest: (id: string, notes?: string) => api.post(`/approvals/${id}/approve`, { notes }),
    rejectRequest: (id: string, notes?: string) => api.post(`/approvals/${id}/reject`, { notes }),
    getRules: () => api.get('/approvals/rules'),
    saveRule: (data: any) => api.post('/approvals/rules', data),
};

export const treasuryApi = {
    // Safes
    getSafes: () => api.get('/treasury/safes'),
    createSafe: (data: any) => api.post('/treasury/safes', data),
    assignUser: (id: string, data: any) => api.post(`/treasury/safes/${id}/assign-user`, data),
    
    // Transactions
    createTransaction: (data: any) => api.post('/treasury/transactions', data),
    transfer: (data: any) => api.post('/treasury/transfer', data),

    // Vouchers (receipt / payment)
    createVoucher: (data: any) => api.post('/crm/vouchers', data),

    // Expenses
    getExpenseCategories: () => api.get('/expenses/categories'),
    createExpenseCategory: (data: any) => api.post('/expenses/categories', data),
    getExpenses: (params?: Record<string, any>) => api.get('/expenses', { params }),
    createExpense: (data: any) => api.post('/expenses', data),
};

export const inventoryApi = {
    // Categories (Groups)
    getCategories: (params?: Record<string, any>) => api.get('/inventory/categories', { params }),
    getCategory: (id: string) => api.get(`/inventory/categories/${id}`),
    createCategory: (data: any) => api.post('/inventory/categories', data),
    updateCategory: (id: string, data: any) => api.put(`/inventory/categories/${id}`, data),
    deleteCategory: (id: string) => api.delete(`/inventory/categories/${id}`),

    // Units
    getUnits: (params?: Record<string, any>) => api.get('/inventory/units', { params }),
    getUnit: (id: string) => api.get(`/inventory/units/${id}`),
    createUnit: (data: any) => api.post('/inventory/units', data),
    updateUnit: (id: string, data: any) => api.put(`/inventory/units/${id}`, data),
    deleteUnit: (id: string) => api.delete(`/inventory/units/${id}`),

    // Branches
    getBranches: (params?: Record<string, any>) => api.get('/inventory/branches', { params }),
    getBranch: (id: string) => api.get(`/inventory/branches/${id}`),
    createBranch: (data: any) => api.post('/inventory/branches', data),
    updateBranch: (id: string, data: any) => api.put(`/inventory/branches/${id}`, data),
    deleteBranch: (id: string) => api.delete(`/inventory/branches/${id}`),

    // Warehouses
    getWarehouses: (params?: Record<string, any>) => api.get('/inventory/warehouses', { params }),

    // Stock Transfers
    getStockTransfers: (params?: Record<string, any>) => api.get('/inventory/stock-transfers', { params }),
    getStockTransfer: (id: string) => api.get(`/inventory/stock-transfers/${id}`),
    createStockTransfer: (data: any) => api.post('/inventory/stock-transfers', data),
    approveStockTransfer: (id: string) => api.post(`/inventory/stock-transfers/${id}/approve`),
    receiveStockTransfer: (id: string, data?: any) => api.post(`/inventory/stock-transfers/${id}/receive`, data),
    deleteStockTransfer: (id: string) => api.delete(`/inventory/stock-transfers/${id}`),

    // Products
    getProducts: (params?: Record<string, any>) =>
        api.get('/inventory/products', { params }),
    createProduct: (data: any) => api.post('/inventory/products', data),
    getProduct: (id: string) => api.get(`/inventory/products/${id}`),
    updateProduct: (id: string, data: any) => api.put(`/inventory/products/${id}`, data),
    deleteProduct: (id: string) => api.delete(`/inventory/products/${id}`),
    uploadProductImage: (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        return api.post('/inventory/products/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    searchProducts: (q: string) =>
        api.get('/inventory/products/search', { params: { q } }),
    scanBarcode: (barcode: string) =>
        api.get(`/inventory/products/barcode/${barcode}`),
    getLowStock: (warehouseId?: string) =>
        api.get('/inventory/products/low-stock', {
            params: { warehouse_id: warehouseId },
        }),

    // Adjustments
    getAdjustments: (params?: Record<string, any>) => api.get('/inventory/adjustments', { params }),
    createAdjustment: (data: any) => api.post('/inventory/adjustments', data),

    // Assembly
    getAdjustment: (id: string) => api.get(`/inventory/adjustments/${id}`),

    // Assembly (BOM)
    getBOM: (productId: string) => api.get(`/inventory/assembly/${productId}`),
    setBOM: (productId: string, data: any) => api.post(`/inventory/assembly/${productId}`, data),
    assemble: (data: any) => api.post('/inventory/assemble', data),

    // Stock Movements
    getMovements: (params?: Record<string, any>) => api.get('/inventory/movements', { params }),
    getMovement: (id: string) => api.get(`/inventory/movements/${id}`),
    createMovement: (data: any) => api.post('/inventory/movements', data),
    getMovementsSummary: (params?: Record<string, any>) => api.get('/inventory/movements/summary', { params }),

    // Vehicle Compatibility
    getVehicleMakes: () => api.get('/inventory/vehicles/makes'),
    getVehicleModels: (makeId: string) => api.get(`/inventory/vehicles/makes/${makeId}/models`),
    getVehicleYears: (modelId: string) => api.get(`/inventory/vehicles/models/${modelId}/years`),
    vehicleQuickLookup: (q: string) => api.get('/inventory/vehicles/quick-lookup', { params: { q } }),
    searchByVehicle: (params: { make_id?: string; model_id?: string; year?: number; warehouse_id?: string }) =>
      api.get('/inventory/vehicles/search-by-vehicle', { params }),
    getProductCompatibility: (productId: string) => api.get(`/inventory/vehicles/product/${productId}/compatibility`),
    attachVehicle: (productId: string, data: { vehicle_year_id: string; notes?: string }) =>
      api.post(`/inventory/vehicles/product/${productId}/compatibility`, data),
    detachVehicle: (productId: string, vehicleYearId: string) =>
      api.delete(`/inventory/vehicles/product/${productId}/compatibility/${vehicleYearId}`),
    createVehicleMake: (data: any) =>
      api.post('/inventory/vehicles/makes', data, data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    createVehicleModel: (makeId: string, data: any) => {
        if (data instanceof FormData) {
            data.append('make_id', makeId);
            return api.post('/inventory/vehicles/models', data, { headers: { 'Content-Type': undefined } });
        }
        return api.post('/inventory/vehicles/models', { ...data, make_id: makeId });
    },
    createVehicleYear: (modelId: string, data: any) => {
        if (data instanceof FormData) {
            data.append('model_id', modelId);
            return api.post('/inventory/vehicles/years', data, { headers: { 'Content-Type': undefined } });
        }
        return api.post('/inventory/vehicles/years', { ...data, model_id: modelId });
    },
    
    updateVehicleMake: (id: string, data: any) =>
        api.post(`/inventory/vehicles/makes/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    updateVehicleModel: (id: string, data: any) =>
        api.post(`/inventory/vehicles/models/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    updateVehicleYear: (id: string, data: any) =>
        api.post(`/inventory/vehicles/years/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),

    deleteVehicleMake: (id: string) => api.delete(`/inventory/vehicles/makes/${id}`),
    deleteVehicleModel: (id: string) => api.delete(`/inventory/vehicles/models/${id}`),
    deleteVehicleYear: (id: string) => api.delete(`/inventory/vehicles/years/${id}`),
};

export const crmApi = {
    getCustomers: (params?: Record<string, any>) => api.get('/crm/customers', { params }),
    getCustomer: (id: string) => api.get(`/crm/customers/${id}`),
    createCustomer: (data: any) => api.post('/crm/customers', data),
    updateCustomer: (id: string, data: any) => api.put(`/crm/customers/${id}`, data),
    deleteCustomer: (id: string) => api.delete(`/crm/customers/${id}`),
    exportCustomers: () => api.get('/crm/customers/export', { responseType: 'blob' }).then(res => res.data),
    importCustomers: (formData: FormData) => api.post('/crm/customers/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
    getCustomerStatement: (id: string) => api.get(`/crm/customers/${id}/statement`).then(res => res.data),
    
    // Vouchers
    createVoucher: (data: any) => api.post('/crm/vouchers', data).then(res => res.data),

    getSuppliers: (params?: Record<string, any>) => api.get('/crm/suppliers', { params }),
    getSupplier: (id: string) => api.get(`/crm/suppliers/${id}`),
    createSupplier: (data: any) => api.post('/crm/suppliers', data),
    updateSupplier: (id: string, data: any) => api.put(`/crm/suppliers/${id}`, data),
    deleteSupplier: (id: string) => api.delete(`/crm/suppliers/${id}`),
    exportSuppliers: () => api.get('/crm/suppliers/export', { responseType: 'blob' }).then(res => res.data),
    importSuppliers: (formData: FormData) => api.post('/crm/suppliers/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
    getSupplierStatement: (id: string) => api.get(`/crm/suppliers/${id}/statement`).then(res => res.data),
};

// Convenience aliases used by some pages
export const customersApi = { getCustomers: crmApi.getCustomers, getCustomer: crmApi.getCustomer, createCustomer: crmApi.createCustomer };
export const suppliersApi = { getSuppliers: crmApi.getSuppliers, getSupplier: crmApi.getSupplier };
export const productsApi  = {
    getProducts: (params?: Record<string, any>) => api.get('/inventory/products', { params }),
    getProduct: (id: string) => api.get(`/inventory/products/${id}`),
};



export const purchasesApi = {
    getInvoices: (params?: Record<string, any>) => api.get('/purchases/invoices', { params }),
    getInvoice: (id: string) => api.get(`/purchases/invoices/${id}`),
    createInvoice: (data: any) => api.post('/purchases/invoices', data),
    updateInvoice: (id: string, data: any) => api.put(`/purchases/invoices/${id}`, data),
    updateStatus: (id: string, payload: any) => api.put(`/purchases/invoices/${id}/status`, payload),
};

export const purchaseReturnsApi = {
    getReturns: (params?: Record<string, any>) => api.get('/purchases/returns', { params }),
    getReturn: (id: string) => api.get(`/purchases/returns/${id}`),
    createReturn: (data: any) => api.post('/purchases/returns', data),
    updateStatus: (id: string, payload: any) => api.put(`/purchases/returns/${id}/status`, payload),
};

export const usersApi = {
    getUsers: (params?: Record<string, any>) => api.get('/users', { params }),
    getUser: (id: string) => api.get(`/users/${id}`),
    createUser: (data: any) => api.post('/users', data),
    updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
    deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const partnershipsApi = {
    getPartners: (params?: Record<string, any>) => api.get('/partnerships/partners', { params }),
    getPartner: (id: string) => api.get(`/partnerships/partners/${id}`),
    createPartner: (data: any) => api.post('/partnerships/partners', data),
    updatePartner: (id: string, data: any) => api.put(`/partnerships/partners/${id}`, data),
    deletePartner: (id: string) => api.delete(`/partnerships/partners/${id}`),
    withdrawProfits: (id: string, amount: number) => api.post(`/partnerships/partners/${id}/withdraw`, { amount }),
    
    getDistributions: (params?: Record<string, any>) => api.get('/partnerships/distributions', { params }),
    previewDistribution: (params: { period_start: string; period_end: string }) => api.get('/partnerships/distributions/preview', { params }),
    distributeProfits: (data: { period_start: string; period_end: string; notes?: string }) => api.post('/partnerships/distributions', data),
};

export const accountingApi = {
    getChartOfAccounts: () => api.get('/accounting/chart-of-accounts'),
    getJournalEntries: (params?: Record<string, any>) =>
        api.get('/accounting/journal-entries', { params }),
    getTrialBalance: (asOf?: string) =>
        api.get('/accounting/reports/trial-balance', { params: { as_of: asOf } }),
    getIncomeStatement: (params?: { from?: string; to?: string }) =>
        api.get('/accounting/reports/income-statement', { params }),
    getBalanceSheet: (asOf?: string) =>
        api.get('/accounting/reports/balance-sheet', { params: { as_of: asOf } }),
    getGeneralLedger: (params?: { from?: string; to?: string }) =>
        api.get('/accounting/reports/general-ledger', { params }),
};

export const fixedAssetsApi = {
    getAssets: () => api.get('/accounting/fixed-assets'),
    getAsset: (id: string) => api.get(`/accounting/fixed-assets/${id}`),
    createAsset: (data: any) => api.post('/accounting/fixed-assets', data),
    updateAsset: (id: string, data: any) => api.put(`/accounting/fixed-assets/${id}`, data),
    deleteAsset: (id: string) => api.delete(`/accounting/fixed-assets/${id}`),
    calculateDepreciation: (id: string) => api.post(`/accounting/fixed-assets/${id}/depreciate`),
};


export const analyticsApi = {
    getInventoryForecast: (threshold?: number) => 
        api.get('/forecasting/inventory-forecast', { params: { threshold } }),
    autoDraftPurchaseOrder: (warehouseId: string) => 
        api.post('/forecasting/auto-draft-po', { warehouse_id: warehouseId }),
    getPartnerForecast: () => 
        api.get('/forecasting/partner-forecast'),
};

export const reportsApi = {
    getProfitAndLoss: (params?: any) => api.get('/reports/pl', { params }),
    getInventoryReport: () => api.get('/reports/inventory'),
    getAccountsReport: () => api.get('/reports/accounts'),
    getGeneralKpis: () => api.get('/reports/kpis'),
    getVatReport: (params?: { year?: string; period?: 'monthly' | 'quarterly'; value?: string }) => 
        api.get('/reports/vat-report', { params }),
    getAgingReport: (type: 'receivable' | 'payable') => 
        api.get('/reports/aging', { params: { type } }),
};

export const settingsApi = {
    getSettings: () => api.get('/settings'),
    updateSettings: (data: any) => api.put('/settings', data),
    getCompanyInfo: () => api.get('/settings/company'),
    updateCompanyInfo: (data: any) => api.put('/settings/company', data),
};

export const webhooksApi = {
    getWebhooks: () => api.get('/webhooks'),
    getWebhook: (id: string) => api.get(`/webhooks/${id}`),
    createWebhook: (data: any) => api.post('/webhooks', data),
    updateWebhook: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
    deleteWebhook: (id: string) => api.delete(`/webhooks/${id}`),
    getWebhookLogs: (id: string) => api.get(`/webhooks/${id}/logs`),
};

export const subscriptionApi = {
    getCurrent: () => api.get('/subscriptions/current'),
    checkout: (data: { plan_id: string; payment_method: string }) => api.post('/subscriptions/checkout', data),
};

export const hrApi = {
    getEmployees: (params?: Record<string, any>) => api.get('/hr/employees', { params }),
    getEmployee: (id: string) => api.get(`/hr/employees/${id}`),
    createEmployee: (data: any) => api.post('/hr/employees', data),
    updateEmployee: (id: string, data: any) => api.put(`/hr/employees/${id}`, data),
    deleteEmployee: (id: string) => api.delete(`/hr/employees/${id}`),

    getAttendance: (params?: Record<string, any>) => api.get('/hr/attendance', { params }),
    checkIn: (data: { employee_id: string; time?: string; date?: string; notes?: string }) => api.post('/hr/attendance/check-in', data),
    checkOut: (data: { employee_id: string; time?: string; date?: string; notes?: string }) => api.post('/hr/attendance/check-out', data),
    updateAttendanceStatus: (id: string, data: { status: string; notes?: string }) => api.put(`/hr/attendance/${id}/status`, data),

    getLeaves: (params?: Record<string, any>) => api.get('/hr/leaves', { params }),
    applyLeave: (data: any) => api.post('/hr/leaves', data),
    updateLeaveStatus: (id: string, status: string) => api.put(`/hr/leaves/${id}/status`, { status }),

    getPayrolls: (params?: { month: number; year: number; limit?: number }) => api.get('/hr/payroll', { params }),
    generatePayroll: (data: { month: number; year: number }) => api.post('/hr/payroll/generate', data),
    markPayrollAsPaid: (id: string) => api.post(`/hr/payroll/${id}/pay`),
};







// Approvals
export const approvalsApiNew = {
  getInbox: () => api.get('/approvals/inbox'),
  approve: (id: string, notes?: string) =>
    api.post(`/approvals/${id}/approve`, { notes }),
  reject: (id: string, notes?: string) =>
    api.post(`/approvals/${id}/reject`, { notes }),
  getRules: () => api.get('/approvals/rules'),
  saveRule: (data: any) => api.post('/approvals/rules', data),
};

// Deliveries
export const deliveriesApiNew = {
  getAll: (params?: any) => api.get('/sales/deliveries', { params }),
  create: (data: any) => api.post('/sales/deliveries', data),
  updateStatus: (id: string, status: string) =>
    api.put(`/sales/deliveries/${id}/status`, { status }),
  assign: (id: string, driverId: string) =>
    api.post(`/sales/deliveries/${id}/assign`, { driver_id: driverId }),
};

// Expenses
export const expensesApiNew = {
  getAll: (params?: any) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  getCategories: () => api.get('/expenses/categories'),
  createCategory: (data: any) => api.post('/expenses/categories', data),
};

// Webhooks
export const webhooksApiNew = {
  getAll: () => api.get('/webhooks'),
  create: (data: any) => api.post('/webhooks', data),
  update: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  getLogs: (id: string) => api.get(`/webhooks/${id}/logs`),
};

// Subscriptions
export const subscriptionsApiNew = {
  getCurrent: () => api.get('/subscriptions/current'),
  checkout: (planId: string) =>
    api.post('/subscriptions/checkout', { plan_id: planId }),
};


import { initMockAdapter } from './setupMockAdapter';

if (typeof window !== 'undefined') {
    initMockAdapter(api);
}
