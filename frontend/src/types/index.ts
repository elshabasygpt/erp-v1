export interface User {
    id: string;
    name: string;
    email: string;
    role_id: string | null;
    role?: string;
    is_active: boolean;
    phone: string | null;
    locale: string;
    permissions?: string[];
}

export interface Invoice {
    id: string;
    invoice_number: string;
    customer_id: string | null;
    customer?: Customer | null;
    warehouse_id?: string | null;
    type: 'cash' | 'credit';
    subtotal: number;
    vat_amount: number;
    discount_amount: number;
    total: number;
    total_amount?: number;
    paid_amount?: number;
    status: 'draft' | 'confirmed' | 'cancelled' | 'returned';
    notes: string | null;
    invoice_date: string;
    due_date?: string | null;
    employee_id?: string | null;
    items: InvoiceItem[];
    created_at?: string;
    updated_at?: string;
}

export interface InvoiceItem {
    id: string;
    product_id: string;
    product_name: string | null;
    quantity: number;
    unit_price: number;
    cost_price?: number;
    discount_percent: number;
    vat_rate: number;
    total: number;
    unit?: string;
}

export interface Product {
    id: string;
    name: string;
    name_ar: string;
    sku: string;
    barcode: string | null;
    cost_price: number;
    sell_price: number;
    wholesale_price?: number;
    semi_wholesale_price?: number;
    vat_rate: number;
    stock_alert_level: number;
    is_active: boolean;
    main_group?: string | null;
    sub_group?: string | null;
    unit?: string;
    description?: string | null;
    image_url?: string | null;
    stock?: number;
    warehouse_stocks?: WarehouseStock[];
}

export interface WarehouseStock {
    warehouse_id: string;
    warehouse_name?: string;
    quantity: number;
}

export interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    tax_number: string | null;
    commercial_register?: string | null;
    balance: number;
    credit_limit?: number;
    payment_type?: 'cash' | 'credit';
    payment_terms?: number;
    group?: string;
    is_active?: boolean;
    created_at?: string;
}

export interface Supplier {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    tax_number: string | null;
    commercial_register?: string | null;
    balance: number;
    credit_limit?: number;
    payment_type?: 'cash' | 'credit';
    payment_terms?: number;
    category?: 'local' | 'importer' | 'manufacturer' | 'distributor';
    is_active?: boolean;
    created_at?: string;
}

export interface PurchaseInvoice {
    id: string;
    invoice_number: string;
    supplier_id: string | null;
    supplier?: Supplier | null;
    warehouse_id?: string | null;
    subtotal: number;
    vat_amount: number;
    discount_amount?: number;
    total: number;
    total_amount?: number;
    status: 'draft' | 'confirmed' | 'received' | 'partially_received' | 'cancelled';
    notes: string | null;
    invoice_date: string;
    items: PurchaseInvoiceItem[];
    created_at?: string;
}

export interface PurchaseInvoiceItem {
    id: string;
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    vat_rate?: number;
    total: number;
}

export interface SalesReturn {
    id: string;
    return_number?: string;
    invoice_id: string | null;
    invoice?: Invoice | null;
    customer_id?: string | null;
    customer?: Customer | null;
    warehouse_id?: string | null;
    return_type: 'sales_return' | 'purchase_return' | 'damage';
    reason?: string;
    total_amount: number;
    refund_amount?: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    notes?: string | null;
    return_date: string;
    items: SalesReturnItem[];
    created_at?: string;
}

export interface SalesReturnItem {
    id: string;
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total: number;
    condition?: 'resellable' | 'needs_repair' | 'damaged';
}

export interface PurchaseReturn {
    id: string;
    return_number?: string;
    purchase_invoice_id: string | null;
    supplier_id?: string | null;
    supplier?: Supplier | null;
    total_amount: number;
    status: 'pending' | 'approved' | 'completed';
    notes?: string | null;
    return_date: string;
    items: PurchaseReturnItem[];
    created_at?: string;
}

export interface PurchaseReturnItem {
    id: string;
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface Account {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    parent_id: string | null;
    is_active: boolean;
    level: number;
    description?: string | null;
}

export interface JournalEntry {
    id: string;
    entry_number: string;
    date: string;
    description: string;
    is_posted: boolean;
    total_debit: number;
    total_credit: number;
    lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
    id: string;
    account_id: string;
    account?: Account;
    debit: number;
    credit: number;
    description?: string;
}

// ── Treasury ──
export interface Safe {
    id: string;
    name: string;
    name_ar?: string;
    type: 'cash' | 'bank';
    balance: number;
    is_active: boolean;
    created_by?: string;
}

export interface SafeTransaction {
    id: string;
    safe_id: string;
    type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
    amount: number;
    description?: string;
    reference_type?: string;
    reference_id?: string;
    created_at?: string;
}

export interface Expense {
    id: string;
    category_id: string;
    category?: ExpenseCategory;
    amount: number;
    description?: string;
    expense_date: string;
    safe_id?: string;
    created_at?: string;
}

export interface ExpenseCategory {
    id: string;
    name: string;
    name_ar?: string;
}

// ── HR ──
export interface Employee {
    id: string;
    user_id?: string;
    name: string;
    position?: string;
    phone?: string;
    base_salary?: number;
    shift_start?: string;
    shift_end?: string;
    is_active: boolean;
}

export interface Attendance {
    id: string;
    employee_id: string;
    employee?: Employee;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status?: 'present' | 'absent' | 'late';
    notes?: string;
}

export interface Leave {
    id: string;
    employee_id: string;
    employee?: Employee;
    type: 'annual' | 'sick' | 'unpaid' | 'other';
    start_date: string;
    end_date: string;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
}

export interface Payroll {
    id: string;
    employee_id: string;
    employee?: Employee;
    month: string;
    base_salary: number;
    allowances?: number;
    deductions?: number;
    net_salary: number;
    status: 'draft' | 'approved' | 'paid';
    paid_at?: string;
}

// ── Inventory Operations ──
export interface Branch {
    id: string;
    name: string;
    name_ar?: string;
    address?: string;
    phone?: string;
    is_active: boolean;
    warehouses?: Warehouse[];
}

export interface Warehouse {
    id: string;
    name: string;
    name_ar?: string;
    branch_id?: string;
    is_active: boolean;
}

export interface StockTransfer {
    id: string;
    transfer_number?: string;
    from_warehouse_id: string;
    to_warehouse_id: string;
    from_warehouse?: Warehouse;
    to_warehouse?: Warehouse;
    status: 'draft' | 'approved' | 'in_transit' | 'received' | 'cancelled';
    notes?: string;
    items: StockTransferItem[];
    created_at?: string;
}

export interface StockTransferItem {
    id: string;
    product_id: string;
    product?: Product;
    quantity: number;
    received_quantity?: number;
}

export interface InventoryAdjustment {
    id: string;
    adjustment_number?: string;
    warehouse_id: string;
    type: 'increase' | 'decrease' | 'damage' | 'correction';
    reason?: string;
    status: 'draft' | 'approved';
    items: InventoryAdjustmentItem[];
    created_at?: string;
}

export interface InventoryAdjustmentItem {
    id: string;
    product_id: string;
    product?: Product;
    quantity_change: number;
    reason?: string;
}

// ── Partnerships ──
export interface Partner {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    share_percentage: number;
    investment_amount: number;
    join_date: string;
    end_date?: string;
    is_active: boolean;
    portal_enabled?: boolean;
    total_withdrawn?: number;
    available_profit?: number;
}

export interface ProfitDistribution {
    id: string;
    period_start: string;
    period_end: string;
    total_profit: number;
    status: 'pending' | 'distributed';
    notes?: string;
    shares?: PartnerProfitShare[];
    created_at?: string;
}

export interface PartnerProfitShare {
    id: string;
    partner_id: string;
    partner?: Partner;
    share_percentage: number;
    amount: number;
}

// ── Sales Extensions ──
export interface Quotation {
    id: string;
    quotation_number?: string;
    customer_id?: string;
    customer?: Customer;
    subtotal: number;
    vat_amount: number;
    discount_amount?: number;
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    valid_until?: string;
    notes?: string;
    items: QuotationItem[];
    created_at?: string;
}

export interface QuotationItem {
    id: string;
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    vat_rate?: number;
    total: number;
}

export interface Voucher {
    id: string;
    voucher_number?: string;
    type: 'receipt' | 'payment';
    customer_id?: string;
    supplier_id?: string;
    amount: number;
    description?: string;
    payment_method?: string;
    safe_id?: string;
    date: string;
    created_at?: string;
}

// ── API Response Wrappers ──
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

// ── Dashboard KPIs ──
export interface DashboardKpis {
    summary: {
        total_sales: number;
        total_purchases: number;
        total_products: number;
        total_customers: number;
        today_invoices_count: number;
        pending_amount: number;
        today_purchases_count: number;
        purchase_orders_count: number;
        active_products: number;
        low_stock_count: number;
        revenue: number;
        expenses: number;
        net_income: number;
        active_customers: number;
        overdue_payments_count: number;
        new_customers_this_month: number;
    };
    top_products: Array<{
        id: string;
        name: string;
        name_ar: string;
        total_sold: number;
    }>;
    top_customers: Array<{
        id: string;
        name: string;
        name_ar?: string;
        orders_count: number;
        total_spent: number;
    }>;
    accounts_distribution?: {
        assets: number;
        liabilities: number;
        equity: number;
    };
    sales_chart?: Array<{
        date: string;
        revenue: number;
        expenses: number;
    }>;
}

export type Locale = 'en' | 'ar';
