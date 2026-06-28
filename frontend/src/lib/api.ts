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

// Avoid infinite refresh loops
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        const isUnauthorized = error.response?.status === 401;
        const isTenantMissing = error.response?.status === 400 && error.response?.data?.error === 'missing_tenant';
        const isTenantNotFound = error.response?.status === 404 && error.response?.data?.error === 'tenant_not_found';
        const isTenantSuspended = error.response?.status === 403 && (error.response?.data?.error === 'tenant_suspended' || error.response?.data?.error === 'trial_expired');

        if (isUnauthorized && !originalRequest._retry && typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            // If it's a mock token, we don't refresh
            if (token && token.startsWith('mock_token_')) {
                // Ignore mock token expiration
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(newToken => {
                    originalRequest.headers.Authorization = 'Bearer ' + newToken;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh token
                const refreshResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/refresh`, {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                const newToken = refreshResponse.data?.token || refreshResponse.data?.access_token;
                if (newToken) {
                    localStorage.setItem('auth_token', newToken);
                    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return api(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Refresh failed, proceed to logout
            } finally {
                isRefreshing = false;
            }
        }

        if (isUnauthorized || isTenantMissing || isTenantNotFound || isTenantSuspended) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('tenant_id');
                localStorage.removeItem('auth_user');
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
    getRoles: (params?: any) => api.get('/roles', { params }),
    getPermissions: () => api.get('/permissions'),
    createRole: (data: any) => api.post('/roles', data),
    updateRole: (id: string, data: any) => api.put(`/roles/${id}`, data),
    deleteRole: (id: string) => api.delete(`/roles/${id}`),
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

    // Warranties
    getWarranties: (params?: {
        status?: 'active' | 'expired' | 'claimed' | 'void' | 'all';
        customer_id?: string;
        product_id?: string;
        expiring_in_days?: number;
        search?: string;
        per_page?: number;
    }) => api.get('/sales/warranties', { params }),

    getWarranty: (id: string) => api.get(`/sales/warranties/${id}`),
    getWarrantiesReport: () => api.get('/sales/warranties/report'),
    getInvoiceWarranties: (invoiceId: string) => api.get(`/sales/warranties/invoice/${invoiceId}`),

    createWarranty: (data: {
        invoice_id: string;
        invoice_item_id: string;
        product_id: string;
        customer_id: string;
        quantity: number;
        sale_date: string;
        warranty_months: number;
        notes?: string;
    }) => api.post('/sales/warranties', data),

    updateWarrantyStatus: (id: string, status: 'active' | 'void', notes?: string) =>
        api.put(`/sales/warranties/${id}/status`, { status, notes }),

    createWarrantyClaim: (warrantyId: string, data: {
        claim_type: 'replacement' | 'repair' | 'refund';
        complaint: string;
        claim_date: string;
    }) => api.post(`/sales/warranties/${warrantyId}/claims`, data),

    updateWarrantyClaim: (warrantyId: string, claimId: string, data: {
        status?: 'open' | 'in_progress' | 'resolved' | 'rejected';
        resolution?: string;
        replacement_invoice_id?: string;
    }) => api.put(`/sales/warranties/${warrantyId}/claims/${claimId}`, data),

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

    // Commissions
    getUnpaidCommissions: (params?: Record<string, any>) => api.get('/sales/commissions/unpaid', { params }),
    payCommission: (data: { salesperson_id: string; invoice_ids: string[]; safe_id?: string }) => api.post('/sales/commissions/payout', data),
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
    getSafeTransactions: (id: string, page: number = 1) => api.get(`/treasury/safes/${id}/transactions?page=${page}`).then(res => res.data?.data || res.data),
    createSafe: (data: any) => api.post('/treasury/safes', data),
    updateSafe: (id: string, data: any) => api.put(`/treasury/safes/${id}`, data),
    deleteSafe: (id: string) => api.delete(`/treasury/safes/${id}`),
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
    // Expense Vouchers (formal accounting)
    createExpenseVoucher: (data: any) => api.post('/expenses/vouchers', data),
    approveExpenseVoucher: (id: string) => api.post(`/expenses/vouchers/${id}/approve`),
};

export const inventoryApi = {
    // Categories (Groups)
    getCategories: (params?: Record<string, any>) => api.get('/inventory/categories', { params }),
    getCategory: (id: string) => api.get(`/inventory/categories/${id}`),
    createCategory: (data: any) => api.post('/inventory/categories', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
    updateCategory: (id: string, data: any) => api.post(`/inventory/categories/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
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
    getWarehouse: (id: string) => api.get(`/inventory/warehouses/${id}`),
    createWarehouse: (data: any) => api.post('/inventory/warehouses', data),
    updateWarehouse: (id: string, data: any) => api.put(`/inventory/warehouses/${id}`, data),
    deleteWarehouse: (id: string) => api.delete(`/inventory/warehouses/${id}`),

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

    // Stocktakes
    getStocktakes: (params?: any) => api.get('/inventory/stocktakes', { params }),
    getStocktake: (id: string) => api.get(`/inventory/stocktakes/${id}`),
    createStocktake: (data: any) => api.post('/inventory/stocktakes', data),
    updateStocktakeCounts: (id: string, data: any) => api.put(`/inventory/stocktakes/${id}/items`, data),
    updateStocktakeStatus: (id: string, data: any) => api.put(`/inventory/stocktakes/${id}/status`, data),
    approveStocktake: (id: string) => api.post(`/inventory/stocktakes/${id}/approve`),
    scanStocktakeBarcode: (id: string, data: any) => api.post(`/inventory/stocktakes/${id}/scan`, data),
    addUnlistedItem: (id: string, data: any) => api.post(`/inventory/stocktakes/${id}/add-item`, data),
    exportStocktake: (id: string) => api.get(`/inventory/stocktakes/${id}/export`, { responseType: 'blob' }).then(res => res.data as any),
    importStocktake: (id: string, data: any) => api.post(`/inventory/stocktakes/${id}/import`, data),
    requestStocktakeRecount: (id: string, data: any) => api.post(`/inventory/stocktakes/${id}/recount`, data),

    // Bin Locations (warehouse management)
    getBinLocations: (warehouseId: string, params?: Record<string, any>) => api.get('/inventory/bin-locations', { params: { warehouse_id: warehouseId, ...params } }),
    getBinLocationTree: (warehouseId: string) => api.get('/inventory/bin-locations/tree', { params: { warehouse_id: warehouseId } }),
    getBinLocation: (id: string) => api.get(`/inventory/bin-locations/${id}`),
    createBinLocation: (data: any) => api.post('/inventory/bin-locations', data),
    updateBinLocation: (id: string, data: any) => api.put(`/inventory/bin-locations/${id}`, data),
    deleteBinLocation: (id: string) => api.delete(`/inventory/bin-locations/${id}`),
    bulkGenerateBinLocations: (data: any) => api.post('/inventory/bin-locations/bulk-generate', data),
    updateProductBinLocation: (productId: string, data: any) => api.put(`/inventory/products/${productId}/bin-location`, data),

    // Inventory Reports
    getInventoryValuation: () => api.get('/inventory/valuation'),
    getInventoryReconciliation: () => api.get('/inventory/reconciliation'),

    // Product Labels
    printProductLabel: (productId: string, qty: number = 1) => `/api/inventory/products/${productId}/label?qty=${qty}`,
    printBulkLabels: (data: { ids: string[]; qty?: number }) => api.post('/inventory/products/labels', data, { responseType: 'text' }),

    // Alternatives
    getAlternatives: (productId: string) => api.get(`/inventory/products/${productId}/alternatives`),
    attachAlternative: (productId: string, alternativeId: string) => api.post(`/inventory/products/${productId}/alternatives/${alternativeId}`),
    detachAlternative: (productId: string, alternativeId: string) => api.delete(`/inventory/products/${productId}/alternatives/${alternativeId}`),

    // Assemblies
    getAssemblies: (productId: string) => api.get(`/inventory/products/${productId}/assemblies`),
    saveAssemblies: (productId: string, data: any) => api.post(`/inventory/products/${productId}/assemblies`, data),

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
            return api.post('/inventory/vehicles/years', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        return api.post('/inventory/vehicles/years', { ...data, model_id: modelId });
    },
    
    updateVehicleMake: (id: string, data: any) =>
        api.post(`/inventory/vehicles/makes/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
    updateVehicleModel: (id: string, data: any) =>
        api.post(`/inventory/vehicles/models/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
    updateVehicleYear: (id: string, data: any) =>
        api.post(`/inventory/vehicles/years/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),

    deleteVehicleMake: (id: string) => api.delete(`/inventory/vehicles/makes/${id}`),
    deleteVehicleModel: (id: string) => api.delete(`/inventory/vehicles/models/${id}`),
    deleteVehicleYear: (id: string) => api.delete(`/inventory/vehicles/years/${id}`),

    // Brands
    getBrands: (params?: Record<string, any>) => api.get('/inventory/brands', { params }),
    createBrand: (data: any) =>
        data instanceof FormData
            ? api.post('/inventory/brands', data, { headers: { 'Content-Type': undefined } })
            : api.post('/inventory/brands', data),
    updateBrand: (id: string, data: any) => {
        if (data instanceof FormData) {
            data.append('_method', 'PUT');
            return api.post(`/inventory/brands/${id}`, data, { headers: { 'Content-Type': undefined } });
        }
        return api.put(`/inventory/brands/${id}`, data);
    },
    deleteBrand: (id: string) => api.delete(`/inventory/brands/${id}`),

    // Product Aliases
    getAliases: (productId: string) => api.get(`/inventory/products/${productId}/aliases`),
    getCustomerAliases: (productId: string) => api.get(`/inventory/products/${productId}/customer-aliases`),
    createAlias: (productId: string, data: any) => api.post(`/inventory/products/${productId}/aliases`, data),
    updateAlias: (productId: string, aliasId: string, data: any) => api.put(`/inventory/products/${productId}/aliases/${aliasId}`, data),
    deleteAlias: (productId: string, aliasId: string) => api.delete(`/inventory/products/${productId}/aliases/${aliasId}`),
    deleteCustomerAlias: (productId: string, aliasId: string) => api.delete(`/inventory/products/${productId}/customer-aliases/${aliasId}`),

    // Cross-Reference (OEM / interchange)
    lookupCrossReference: (number: string) =>
        api.get('/inventory/cross-reference/lookup', { params: { number } }),
    getCrossReferences: (productId: string) =>
        api.get(`/inventory/products/${productId}/cross-references`),
    addCrossReference: (productId: string, data: {
        reference_number: string;
        reference_brand?: string;
        reference_type: 'oem' | 'aftermarket' | 'equivalent' | 'superseded';
        notes?: string;
    }) => api.post(`/inventory/products/${productId}/cross-references`, data),
    deleteCrossReference: (productId: string, refId: string) =>
        api.delete(`/inventory/products/${productId}/cross-references/${refId}`),
    bulkAddCrossReferences: (productId: string, items: {
        reference_number: string;
        reference_brand?: string;
        reference_type?: 'oem' | 'aftermarket' | 'equivalent' | 'superseded';
    }[]) => api.post(`/inventory/products/${productId}/cross-references/bulk`, { items }),
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

    // ── Customer Vehicles ──────────────────────────────────────────────────
    getCustomerVehicles: (customerId: string) =>
        api.get(`/crm/customers/${customerId}/vehicles`),

    addCustomerVehicle: (customerId: string, data: {
        vehicle_year_id: string;
        plate_number?: string;
        plate_number_en?: string;
        color?: string;
        mileage?: number;
        purchase_year?: number;
        vin?: string;
        notes?: string;
    }) => api.post(`/crm/customers/${customerId}/vehicles`, data),

    updateCustomerVehicle: (customerId: string, vehicleId: string, data: {
        vehicle_year_id?: string;
        plate_number?: string;
        plate_number_en?: string;
        color?: string;
        mileage?: number;
        purchase_year?: number;
        vin?: string;
        notes?: string;
    }) => api.put(`/crm/customers/${customerId}/vehicles/${vehicleId}`, data),

    deleteCustomerVehicle: (customerId: string, vehicleId: string) =>
        api.delete(`/crm/customers/${customerId}/vehicles/${vehicleId}`),

    getVehicleServiceHistory: (customerId: string, vehicleId: string) =>
        api.get(`/crm/customers/${customerId}/vehicles/${vehicleId}/service-history`),

    addVehicleService: (customerId: string, vehicleId: string, data: {
        invoice_id?: string;
        service_date: string;
        service_type: 'parts_replacement' | 'maintenance' | 'inspection' | 'other';
        mileage_at_service?: number;
        description?: string;
        next_service_mileage?: number;
        next_service_date?: string;
    }) => api.post(`/crm/customers/${customerId}/vehicles/${vehicleId}/service-history`, data),

    searchVehicleByPlate: (plate: string) =>
        api.get('/crm/customers/vehicles/search', { params: { plate } }),

    // Interactions & FollowUps
    addCustomerNote: (customerId: string, note: any) => api.post(`/crm/customers/${customerId}/notes`, note),
    addCustomerInteraction: (customerId: string, data: any) => api.post(`/crm/customers/${customerId}/interactions`, data),
    createFollowUp: (data: any) => api.post(`/crm/follow-ups`, data),
    markFollowUpCompleted: (followUpId: string) => api.put(`/crm/follow-ups/${followUpId}/complete`),
    getCustomerInsights: (customerId: string) => api.get(`/crm/customers/${customerId}/insights`),
    getFollowUps: (params?: any) => api.get('/crm/follow-ups', { params }),

    // ── Customer-Specific Prices ──────────────────────────────────────────────
    getCustomerPrices: (customerId: string) =>
        api.get(`/crm/customers/${customerId}/prices`),

    upsertCustomerPrice: (customerId: string, data: {
        product_id: string;
        price: number;
        valid_from?: string | null;
        valid_until?: string | null;
        notes?: string;
    }) => api.post(`/crm/customers/${customerId}/prices`, data),

    deleteCustomerPrice: (customerId: string, priceId: string) =>
        api.delete(`/crm/customers/${customerId}/prices/${priceId}`),

    lookupCustomerPrice: (customerId: string, productId: string) =>
        api.get('/crm/customer-prices/lookup', { params: { customer_id: customerId, product_id: productId } }),

    // CRM Pipeline (Kanban deals)
    getStagesWithDeals: () => api.get('/crm/pipeline/stages'),
    moveDeal: (id: string, data: any) => api.put(`/crm/pipeline/deals/${id}/move`, data),
    createDeal: (data: any) => api.post('/crm/pipeline/deals', data),
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

    // Advanced Procurement
    getPurchaseRequests: (params?: Record<string, any>) => api.get('/purchases/requests', { params }),
    createPurchaseRequest: (data: any) => api.post('/purchases/requests', data),
    updatePurchaseRequestStatus: (id: string, data: any) => api.put(`/purchases/requests/${id}/status`, data),

    getRFQs: (params?: Record<string, any>) => api.get('/purchases/rfqs', { params }),
    createRFQ: (data: any) => api.post('/purchases/rfqs', data),

    getPurchaseOrders: (params?: Record<string, any>) => api.get('/purchases/orders', { params }),
    createPurchaseOrder: (data: any) => api.post('/purchases/orders', data),
    updatePurchaseOrderStatus: (id: string, data: any) => api.put(`/purchases/orders/${id}/status`, data),

    // Supplier Price Lists
    getSupplierPrices: (params?: {
        supplier_id?: string;
        product_id?: string;
        search?: string;
        active_only?: boolean;
        limit?: number;
    }) => api.get('/purchases/supplier-prices', { params }),

    compareSupplierPrices: (productId: string) =>
        api.get(`/purchases/supplier-prices/compare/${productId}`),

    addSupplierPrice: (data: {
        supplier_id: string;
        product_id: string;
        unit_price: number;
        currency_code?: string;
        min_quantity?: number;
        supplier_sku?: string;
        notes?: string;
        valid_from?: string;
        valid_until?: string;
        lead_time_days?: number;
    }) => api.post('/purchases/supplier-prices', data),

    updateSupplierPrice: (id: string, data: Partial<{
        unit_price: number;
        currency_code: string;
        min_quantity: number;
        supplier_sku: string;
        notes: string;
        valid_from: string;
        valid_until: string;
        lead_time_days: number;
        is_active: boolean;
    }>) => api.put(`/purchases/supplier-prices/${id}`, data),

    deleteSupplierPrice: (id: string) =>
        api.delete(`/purchases/supplier-prices/${id}`),

    getSupplierPriceHistory: (id: string) =>
        api.get(`/purchases/supplier-prices/${id}/history`),

    bulkImportSupplierPrices: (data: {
        supplier_id: string;
        items: { product_id: string; unit_price: number; supplier_sku?: string; min_quantity?: number }[];
    }) => api.post('/purchases/supplier-prices/bulk', data),

    // Purchase Requests → PO conversion
    convertPrToPo: (id: string) => api.post(`/purchases/requests/${id}/convert-to-po`),

    // Smart Orders — backend route prefix is SINGULAR: /purchases/smart-order/...
    getSmartOrderLowStock: () => api.get('/purchases/smart-order/low-stock'),
    getSmartOrderUpcoming: () => api.get('/purchases/smart-order/upcoming'),
    // items must each be { product_id, order_qty, unit_price } (matches SupplierOrderController::draftForSupplier)
    draftSmartOrder: (data: { supplier_id: string; warehouse_id?: string; items: any[] }) =>
        api.post('/purchases/smart-order/draft', data),
    // server-side "draft for every supplier at once" (alternative to looping draftSmartOrder client-side)
    draftAllSmartOrders: (warehouseId?: string) =>
        api.post('/purchases/smart-order/draft-all', { warehouse_id: warehouseId }),

    // Supplier order schedules (مواعيد طلب الموردين)
    getOrderSchedules: () => api.get('/purchases/order-schedules'),
    saveOrderSchedule: (data: {
        supplier_id: string;
        order_day_of_week: number;      // 0=الأحد ... 6=السبت
        lead_time_days: number;
        frequency_weeks: number;
        order_time?: string;            // 'HH:mm'
        reminder_enabled?: boolean;
        reminder_hours_before?: number;
        responsible_email?: string;
        notes?: string;
    }) => api.post('/purchases/order-schedules', data),
    deleteOrderSchedule: (id: string) => api.delete(`/purchases/order-schedules/${id}`),

    // Default supplier per product (used by the smart-ordering grouping)
    setProductDefaultSupplier: (data: {
        product_id: string;
        supplier_id: string;
        reorder_quantity?: number;
        preferred_unit_price?: number;
        priority?: number;
    }) => api.post('/purchases/product-suppliers', data),

    // Purchase Installments
    getInstallments: (invoiceId: string) => api.get(`/purchases/invoices/${invoiceId}/installments`),
    saveInstallments: (invoiceId: string, data: any) => api.post(`/purchases/invoices/${invoiceId}/installments`, data),
    payInstallment: (installmentId: string, data: any) => api.post(`/purchases/installments/${installmentId}/pay`, data),
};

export const purchaseReturnsApi = {
    getReturns: (params?: Record<string, any>) => api.get('/purchases/returns', { params }),
    getReturn: (id: string) => api.get(`/purchases/returns/${id}`),
    createReturn: (data: any) => api.post('/purchases/returns', data),
    updateStatus: (id: string, payload: any) => api.put(`/purchases/returns/${id}/status`, payload),
    updateReturnStatus: (id: string, payload: any) => api.put(`/purchases/returns/${id}/status`, payload),
};

export const usersApi = {
    getUsers: (params?: Record<string, any>) => api.get('/users', { params }),
    getUser: (id: string) => api.get(`/users/${id}`),
    createUser: (data: any) => api.post('/users', data),
    updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
    deleteUser: (id: string) => api.delete(`/users/${id}`),
    
    // Roles
    getRoles: (params?: any) => api.get('/roles', { params }),
    getPermissions: () => api.get('/permissions'),
    createRole: (data: any) => api.post('/roles', data),
    updateRole: (id: string, data: any) => api.put(`/roles/${id}`, data),
    deleteRole: (id: string) => api.delete(`/roles/${id}`),
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
    getGeneralLedger: (params?: Record<string, any>) =>
        api.get('/accounting/reports/general-ledger', { params }),
    getZakatReport: (params?: Record<string, any>) =>
        api.get('/accounting/reports/zakat', { params }),
    postZakatEntry: (data: { date: string; zakat_amount: number }) =>
        api.post('/accounting/reports/zakat/post', data),
    payZakat: (data: { date: string; amount: number; safe_account_id: string; reference_number?: string }) =>
        api.post('/accounting/reports/zakat/pay', data),
        
    // Fiscal Period
    listFiscalPeriods: () => api.get('/accounting/fiscal-periods'),
    createFiscalPeriod: (data: any) => api.post('/accounting/fiscal-periods', data),
    closeFiscalPeriod: (id: string) => api.post(`/accounting/fiscal-periods/${id}/close`),
    reopenFiscalPeriod: (id: string) => api.post(`/accounting/fiscal-periods/${id}/reopen`),

    // Account Mappings
    getAccountMappings: () => api.get('/accounting/account-mappings'),
    updateAccountMappings: (data: any) => api.put('/accounting/account-mappings', data),

    // Bank Accounts
    getBankAccounts: () => api.get('/accounting/bank-accounts'),
    createBankAccount: (data: any) => api.post('/accounting/bank-accounts', data),
    updateBankAccount: (id: string, data: any) => api.put(`/accounting/bank-accounts/${id}`, data),
    deleteBankAccount: (id: string) => api.delete(`/accounting/bank-accounts/${id}`),
    getReconciliations: (bankAccountId: string) => api.get(`/accounting/bank-accounts/${bankAccountId}/reconciliations`),
    startReconciliation: (bankAccountId: string, data: any) => api.post(`/accounting/bank-accounts/${bankAccountId}/reconciliations`, data),
    importBankTransactions: (bankAccountId: string, file: any) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/accounting/bank-accounts/${bankAccountId}/import-transactions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },

    // Credit Notes
    getCreditNotes: (params?: any) => api.get('/accounting/credit-notes', { params }),
    createCreditNote: (data: any) => api.post('/accounting/credit-notes', data),
    applyCreditNote: (id: string, data: any) => api.post(`/accounting/credit-notes/${id}/apply`, data),

    // Aging Reports
    getReceivableAging: (asOf?: string) => api.get('/crm/receivables/aging', { params: asOf ? { as_of: asOf } : undefined }),
    getPayableAging: (asOf?: string) => api.get('/crm/payables/aging', { params: asOf ? { as_of: asOf } : undefined }),

    // Chart of Accounts (tree + CRUD). CRUD lives under /accounting/accounts;
    // /accounting/chart-of-accounts is a read-only report endpoint only.
    getAccountsTree: () => api.get('/accounting/accounts/tree'),
    createAccount: (data: any) => api.post('/accounting/accounts', data),
    updateAccount: (id: string, data: any) => api.put(`/accounting/accounts/${id}`, data),
    deleteAccount: (id: string) => api.delete(`/accounting/accounts/${id}`),

    // Journal Entries
    createJournalEntry: (data: any) => api.post('/accounting/journal-entries', data),

    // Budgets
    getBudgets: (params?: Record<string, any>) => api.get('/accounting/budgets', { params }),
    getBudget: (id: string) => api.get(`/accounting/budgets/${id}`),
    createBudget: (data: any) => api.post('/accounting/budgets', data),
    updateBudget: (id: string, data: any) => api.put(`/accounting/budgets/${id}`, data),
    deleteBudget: (id: string) => api.delete(`/accounting/budgets/${id}`),
    getBudgetVariance: (id: string) => api.get(`/accounting/budgets/${id}/variance`),
    approveBudget: (id: string) => api.post(`/accounting/budgets/${id}/approve`),
    autoMatchReconciliation: (reconciliationId: string, days?: number) =>
        api.post(`/accounting/reconciliations/${reconciliationId}/auto-match`, { date_tolerance_days: days ?? 5 }),

    // Opening Balances
    getOpeningBalances: () => api.get('/accounting/opening-balances'),
    setAccountOpeningBalance: (data: any) => api.post('/accounting/opening-balances/account', data),
    setCustomerOpeningBalance: (data: any) => api.post('/accounting/opening-balances/customer', data),
    setSupplierOpeningBalance: (data: any) => api.post('/accounting/opening-balances/supplier', data),
};

export const fixedAssetsApi = {
    getAssets: () => api.get('/accounting/fixed-assets'),
    getAsset: (id: string) => api.get(`/accounting/fixed-assets/${id}`),
    createAsset: (data: any) => api.post('/accounting/fixed-assets', data),
    updateAsset: (id: string, data: any) => api.put(`/accounting/fixed-assets/${id}`, data),
    deleteAsset: (id: string) => api.delete(`/accounting/fixed-assets/${id}`),
    calculateDepreciation: (id: string) => api.post(`/accounting/fixed-assets/${id}/depreciate`),
    getDepreciationSchedule: (id: string) => api.get(`/accounting/fixed-assets/${id}/schedule`),
};


export const analyticsApi = {
    getInventoryForecast: (threshold?: number) => 
        api.get('/forecasting/inventory-forecast', { params: { threshold } }),
    autoDraftPurchaseOrder: (warehouseId: string) => 
        api.post('/forecasting/auto-draft-po', { warehouse_id: warehouseId }),
    getPartnerForecast: () => 
        api.get('/forecasting/partner-forecast'),
    getSalesByChannel: (params?: any) => api.get('/analytics/sales-by-channel', { params }),
    getCustomerLifetimeValue: (params?: any) => api.get('/analytics/customer-lifetime-value', { params }),
    getConversionFunnel: (params?: any) => api.get('/analytics/conversion-funnel', { params }),
    getTopCategories: (params?: any) => api.get('/analytics/top-categories', { params }),
    getDiscountAnalysis: (params?: any) => api.get('/analytics/discount-analysis', { params }),
    getInventoryValuation: (params?: any) => api.get('/analytics/inventory-valuation', { params }),
    getSalesPerformance: (params?: any) => api.get('/analytics/sales-performance', { params }),
    getProfitability: (params?: any) => api.get('/analytics/profitability', { params }),
    getReturnsAnalysis: (params?: any) => api.get('/analytics/returns-analysis', { params }),
    getPredictiveDashboard: () => api.get('/analytics/predictive-dashboard'),
    chat: (data: any) => api.post('/analytics/chat', data),
};

export const automationApi = {
    getWorkflows: () => api.get('/automation/workflows'),
    getWorkflow: (id: string) => api.get(`/automation/workflows/${id}`),
    saveWorkflow: (data: any) => api.post('/automation/workflows', data),
    deleteWorkflow: (id: string) => api.delete(`/automation/workflows/${id}`),
};

export const aiApi = {
    chat: (prompt: string) => api.post('/analytics/chat', { prompt }),
};

export const reportsApi = {
    getProfitAndLoss: (params?: any) => api.get('/reports/pl', { params }),
    getInventoryReport: () => api.get('/reports/inventory'),
    getAccountsReport: () => api.get('/reports/accounts'),
    getGeneralKpis: (params?: { period?: string }) => api.get('/reports/kpis', { params }),
    getVatReport: (params?: { year?: string; period?: 'monthly' | 'quarterly'; value?: string }) => 
        api.get('/reports/vat-report', { params }),
    getAgingReport: (type: 'receivable' | 'payable') => 
        api.get('/reports/aging', { params: { type } }),
    getPayableReminders: () => api.get('/reports/payables/reminders').then(res => res.data?.data || res.data),
    getReceivableReminders: () => api.get('/reports/receivables/reminders').then(res => res.data?.data || res.data),
        
    // Auto Parts Reports
    getSlowMovingParts: (params?: {
        days?: number;
        warehouse_id?: string;
        category_id?: string;
        min_stock?: number;
        limit?: number;
    }) => api.get('/reports/auto-parts/slow-moving', { params }),

    getTopPartsByMake: (params?: {
        date_from?: string;
        date_to?: string;
        make_id?: string;
        limit?: number;
    }) => api.get('/reports/auto-parts/top-by-make', { params }),

    getMissingParts: (params?: {
        warehouse_id?: string;
        make_id?: string;
    }) => api.get('/reports/auto-parts/missing-parts', { params }),

    getProfitByBrand: (params?: {
        date_from?: string;
        date_to?: string;
        group_by?: 'brand' | 'quality_grade';
    }) => api.get('/reports/auto-parts/profit-by-brand', { params }),

    getDeadStockByMonths: (params?: {
        warehouse_id?: string;
        category_id?: string;
        min_stock?: number;
    }) => api.get('/reports/auto-parts/dead-stock-months', { params }),

    getTurnoverByMake: (params?: {
        date_from?: string;
        date_to?: string;
        warehouse_id?: string;
    }) => api.get('/reports/auto-parts/turnover-by-make', { params }),

    getTopPartsByModel: (params?: {
        date_from?: string;
        date_to?: string;
        make_id?: string;
        model_id?: string;
        limit?: number;
    }) => api.get('/reports/auto-parts/top-by-model', { params }),
};

export const settingsApi = {
    getSettings: () => api.get('/settings'),
    updateSettings: (data: any) => api.put('/settings', data),
    getCompanyInfo: () => api.get('/settings/company'),
    updateCompanyInfo: (data: any) => api.put('/settings/company', data),
    updateHrManagerEmail: (email: string) => api.post('/settings/hr-manager-email', { email }),
};
export const backupsApi = {
    list: () => api.get('/backups'),
    get: (id: string) => api.get(`/backups/${id}`),
    triggerBackup: () => api.post('/backups'),
    restoreBackup: (id: string, confirmText: string) => api.post(`/backups/${id}/restore`, { confirm_text: confirmText }),
    download: (id: string, type: 'db' | 'files') => api.get(`/backups/${id}/download?type=${type}`, { responseType: 'blob' }),
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

    // Penalty Rules
    getPenaltyRules: () => api.get('/hr/penalty-rules'),
    createPenaltyRule: (data: {
        late_from_minutes: number;
        late_to_minutes: number;
        deduction_type: 'fixed' | 'per_minute' | 'percentage_of_daily';
        deduction_value: number;
        grace_minutes?: number;
        label?: string;
        label_ar?: string;
        sort_order?: number;
    }) => api.post('/hr/penalty-rules', data),
    updatePenaltyRule: (id: string, data: any) => api.put(`/hr/penalty-rules/${id}`, data),
    deletePenaltyRule: (id: string) => api.delete(`/hr/penalty-rules/${id}`),
    getPenaltyReport: (params: {
        month: number;
        year: number;
        employee_id?: string;
    }) => api.get('/hr/penalty-report', { params }),

    // Payroll Items
    getPayrollItems: (params?: {
        employee_id?: string;
        month?: number;
        year?: number;
        type?: string;
        status?: string;
        limit?: number;
    }) => api.get('/hr/payroll-items', { params }),

    addPayrollItem: (data: {
        employee_id: string;
        month: number;
        year: number;
        type: 'deduction' | 'bonus' | 'advance' | 'overtime' | 'other_add' | 'other_deduct';
        reason: string;
        amount: number;
        notes?: string;
    }) => api.post('/hr/payroll-items', data),

    deletePayrollItem: (id: string) => api.delete(`/hr/payroll-items/${id}`),

    getPayslip: (payrollId: string) => api.get(`/hr/payroll/${payrollId}/payslip`),

    recordSignature: (payrollId: string, data: { signature_url?: string; notes?: string }) =>
        api.post(`/hr/payroll/${payrollId}/sign`, data),

    // Employee Loans
    getLoansSummary: () =>
        api.get('/hr/loans/summary'),

    getLoans: (params?: {
        employee_id?: string;
        status?: 'active' | 'completed' | 'cancelled' | 'paused';
        limit?: number;
    }) => api.get('/hr/loans', { params }),

    getLoan: (id: string) =>
        api.get(`/hr/loans/${id}`),

    createLoan: (data: {
        employee_id: string;
        total_amount: number;
        installments_count: number;
        start_month: number;
        start_year: number;
        reason?: string;
        notes?: string;
    }) => api.post('/hr/loans', data),

    updateLoanStatus: (id: string, data: {
        status: 'active' | 'paused' | 'cancelled';
        notes?: string;
    }) => api.put(`/hr/loans/${id}/status`, data),

    skipInstallment: (installmentId: string, notes?: string) =>
        api.put(`/hr/loan-installments/${installmentId}/skip`, { notes }),
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
  getMapData: () => api.get('/sales/deliveries/map'),
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

// Tasks
export const tasksApi = {
    getDashboard: () => api.get('/tasks/dashboard'),

    getTasks: (params?: {
        view?: 'mine' | 'assigned' | 'created' | 'all';
        status?: string;
        priority?: string;
        due?: 'today' | 'overdue' | 'week' | 'upcoming';
        category?: string;
        search?: string;
        per_page?: number;
    }) => api.get('/tasks', { params }),

    createTask: (data: {
        title: string;
        description?: string;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        status?: string;
        category?: string;
        color?: string;
        due_date?: string;
        due_time?: string;
        reminder_at?: string;
        assigned_to?: string;
        related_type?: string;
        related_id?: string;
        related_label?: string;
    }) => api.post('/tasks', data),

    updateTask: (id: string, data: any) => api.put(`/tasks/${id}`, data),
    updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
    deleteTask: (id: string) => api.delete(`/tasks/${id}`),
    reorderTasks: (items: { id: string; order: number; status: string }[]) =>
        api.post('/tasks/reorder', { items }),
    addComment: (taskId: string, content: string) =>
        api.post(`/tasks/${taskId}/comments`, { content }),
    getCategories: () => api.get('/tasks/categories'),
};

// ZATCA API
export const zatcaApi = {
    onboard: (data: any) => api.post('/zatca/onboard', data),
    checkStatus: () => api.get('/zatca/status'),
    syncInvoices: () => api.post('/zatca/sync'),
    getSettings: () => api.get('/zatca/settings'),
    saveSettings: (data: any) => api.post('/zatca/settings', data),
    // Onboarding status + OTP submission map to the existing backend routes
    // (GET /zatca/status, POST /zatca/onboard which runs submitOtp).
    getOnboardingStatus: () => api.get('/zatca/status'),
    submitOtp: (otp: string) => api.post('/zatca/onboard', { otp }),
};

export const dataApi = {
    exportData: (type: string) => api.get('/data/export', { params: { entity: type }, responseType: 'blob' }),
    importData: (type: string, data: any) => api.post('/data/import', data, { params: { entity: type } }),
    downloadTemplate: (type: string) => api.get('/data/template', { params: { entity: type }, responseType: 'blob' }),
};

// POS Shifts
export const posApi = {
    getCurrentShift: () => api.get('/sales/pos/shifts/current'),
    openShift: (data: { opening_cash: number; notes?: string }) => api.post('/sales/pos/shifts/open', data),
    closeShift: (data: { closing_cash: number; notes?: string }) => api.post('/sales/pos/shifts/close', data),
    /** Resolve a barcode / SKU to a POS line-item payload from the backend. */
    scanBarcode: (barcode: string, warehouseId?: string | null) =>
        api.get(`/sales/pos/scan/${encodeURIComponent(barcode)}`, {
            params: warehouseId ? { warehouse_id: warehouseId } : undefined,
        }),
};

// Customer Core Returns
export const customerCoreReturnsApi = {
    getAll: (params?: Record<string, any>) => api.get('/sales/core-returns', { params }),
    getOne: (id: string) => api.get(`/sales/core-returns/${id}`),
    create: (data: any) => api.post('/sales/core-returns', data),
    receive: (id: string, data: any) => api.post(`/sales/core-returns/${id}/receive`, data),
    credit: (id: string, data: { refund_method: string }) => api.post(`/sales/core-returns/${id}/credit`, data),
};

// Workshop / Job Cards
export const workshopApi = {
    getAll: (params?: Record<string, any>) => api.get('/sales/workshop/job-cards', { params }),
    getOne: (id: string) => api.get(`/sales/workshop/job-cards/${id}`),
    create: (data: any) => api.post('/sales/workshop/job-cards', data),
    update: (id: string, data: any) => api.put(`/sales/workshop/job-cards/${id}`, data),
    convertToInvoice: (id: string, warehouseId: string) =>
        api.post(`/sales/workshop/job-cards/${id}/convert-to-invoice`, { warehouse_id: warehouseId }),
};

// Stock Write-Offs (Scrap / Damaged / Obsolete)
export const writeOffApi = {
    getAll: (params?: Record<string, any>) => api.get('/inventory/write-offs', { params }),
    getOne: (id: string) => api.get(`/inventory/write-offs/${id}`),
    create: (data: any) => api.post('/inventory/write-offs', data),
};

// RMA Requests
export const rmaApi = {
    getAll: (params?: Record<string, any>) => api.get('/sales/rma', { params }),
    getOne: (id: string) => api.get(`/sales/rma/${id}`),
    create: (data: any) => api.post('/sales/rma', data),
    approve: (id: string, data?: { notes?: string }) => api.post(`/sales/rma/${id}/approve`, data ?? {}),
    reject: (id: string, data: { rejection_reason: string }) => api.post(`/sales/rma/${id}/reject`, data),
    fulfill: (id: string, data: { reference_type: string; reference_id: string }) => api.post(`/sales/rma/${id}/fulfill`, data),
    markUnderReview: (id: string, data?: { notes?: string }) => api.post(`/sales/rma/${id}/under-review`, data ?? {}),
    cancel: (id: string) => api.post(`/sales/rma/${id}/cancel`),
    getReasonCategories: () => api.get('/sales/rma/reason-categories'),
};

// Supplier Core Returns (returns to supplier to get credit)
export const coreReturnsApi = {
    getCoreReturns: (params?: Record<string, any>) => api.get('/purchases/core-returns', { params }),
    getCoreReturn: (id: string) => api.get(`/purchases/core-returns/${id}`),
    createCoreReturn: (data: any) => api.post('/purchases/core-returns', data),
    shipCoreReturn: (id: string) => api.post(`/purchases/core-returns/${id}/ship`),
    creditCoreReturn: (id: string, data?: any) => api.post(`/purchases/core-returns/${id}/credit`, data ?? {}),
};

// Sales Returns (alias providing createSalesReturn method name used in some pages)
export const salesReturnsApi = {
    getSalesReturns: (params?: Record<string, any>) => api.get('/sales/returns', { params }),
    getSalesReturn: (id: string) => api.get(`/sales/returns/${id}`),
    createSalesReturn: (data: any) => api.post('/sales/returns', data),
    updateSalesReturnStatus: (id: string, status: string) => api.put(`/sales/returns/${id}/status`, { status }),
};
