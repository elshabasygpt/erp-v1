/**
 * Authentication Module — connects to Laravel Sanctum backend.
 * Falls back to mock mode when backend is unavailable.
 */

import { authApi } from './api';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    locale: string;
    phone: string;
    permissions: string[];
}

// ── Mock fallback credentials ──
const MOCK_ADMIN: AuthUser = {
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

const MOCK_CREDENTIALS = { email: 'admin@company.com', password: 'password' };

// ── Storage helpers ──
function saveAuth(token: string, user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
}

function clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('tenant_id');
}

// ── Public API ──

/**
 * Login — tries real API first, falls back to mock if backend unavailable.
 */
export async function login(
    email: string,
    password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // 1. Try real backend
    try {
        const res = await authApi.login({ email, password });
        const data = res.data?.data || res.data;
        const token = data.token || data.access_token;
        const rawUser = data.user;

        if (token && rawUser) {
            const user: AuthUser = {
                id: rawUser.id,
                name: rawUser.name,
                email: rawUser.email,
                role: rawUser.role?.name || rawUser.role || 'user',
                locale: rawUser.locale || 'ar',
                phone: rawUser.phone || '',
                permissions: rawUser.permissions || [],
            };
            // Extract tenant_id from multiple possible locations in response
            const tenantId = data.tenant_id
                || data.user?.tenant_id
                || rawUser.tenant_id
                || data.tenantId
                || null;
            if (tenantId) {
                localStorage.setItem('tenant_id', String(tenantId));
            }
            saveAuth(token, user);
            return { success: true, user };
        }
    } catch (err: any) {
        const status = err?.response?.status;
        // If backend responded with 401/422 → invalid credentials, don't fallback
        if (status === 401 || status === 422) {
            const message = err?.response?.data?.message || 'Invalid email or password';
            return { success: false, error: message };
        }
        // Network error or backend down → fallback to mock
        console.warn('[Auth] Backend unreachable, using mock login');
    }

    // 2. Mock fallback
    if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
        const token = 'mock_token_' + Date.now();
        saveAuth(token, MOCK_ADMIN);
        return { success: true, user: MOCK_ADMIN };
    }

    return { success: false, error: 'Invalid email or password' };
}

/**
 * Logout — calls API then clears local storage.
 */
export async function logout(): Promise<void> {
    try {
        await authApi.logout();
    } catch {
        // ignore — we clear local state regardless
    }
    clearAuth();
}

/**
 * Refresh user from backend (validates token, refreshes cached user).
 * Returns null if token is invalid.
 */
export async function refreshUser(): Promise<AuthUser | null> {
    try {
        const res = await authApi.me();
        const rawUser = res.data?.data || res.data;
        if (rawUser?.id) {
            const user: AuthUser = {
                id: rawUser.id,
                name: rawUser.name,
                email: rawUser.email,
                role: rawUser.role?.name || rawUser.role || 'user',
                locale: rawUser.locale || 'ar',
                phone: rawUser.phone || '',
                permissions: rawUser.permissions || [],
            };
            // Update cached user
            if (typeof window !== 'undefined') {
                localStorage.setItem('auth_user', JSON.stringify(user));
            }
            return user;
        }
    } catch {
        // If mock token, keep the cached user
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (token?.startsWith('mock_token_')) {
                return getStoredUser();
            }
        }
    }
    return null;
}

/**
 * Get cached user from localStorage (no network call).
 */
export function getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('auth_user');
    return data ? JSON.parse(data) : null;
}

/**
 * Check if a token exists in localStorage.
 */
export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('auth_token');
}

/**
 * Check if running in mock mode (no real backend).
 */
export function isMockMode(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('auth_token');
    return !!token?.startsWith('mock_token_');
}
