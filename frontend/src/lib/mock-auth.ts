/**
 * Mock Authentication — works without backend server.
 * Replace with real API calls when Laravel backend is running.
 */

export interface MockUser {
    id: string;
    name: string;
    email: string;
    role: string;
    locale: string;
    phone: string;
    permissions: string[];
}

// Default admin account
const ADMIN_USER: MockUser = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Administrator',
    email: 'admin@company.com',
    role: 'admin',
    locale: 'ar',
    phone: '+966500000000',
    permissions: [
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
        'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
        'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
        'accounting.view', 'accounting.create', 'accounting.edit',
        'reports.view', 'reports.export',
        'settings.view', 'settings.edit',
    ],
};

const MOCK_CREDENTIALS = {
    email: 'admin@company.com',
    password: 'password',
};

export function mockLogin(email: string, password: string): { success: boolean; user?: MockUser; token?: string; error?: string } {
    if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
        const token = 'mock_token_' + Date.now();
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(ADMIN_USER));
        }
        return { success: true, user: ADMIN_USER, token };
    }
    return { success: false, error: 'Invalid email or password' };
}

export function mockLogout(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }
}

export function getStoredUser(): MockUser | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('auth_user');
    return data ? JSON.parse(data) : null;
}

export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('auth_token');
}
