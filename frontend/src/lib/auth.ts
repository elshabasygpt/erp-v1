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

// Removed Mock credentials

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

export async function register(
    data: { name: string; email: string; password: string; password_confirmation: string; phone?: string }
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
        const res = await authApi.register(data);
        const resData = res.data?.data || res.data;
        const token = resData.token || resData.access_token;
        const rawUser = resData.user;

        if (token && rawUser) {
            const user: AuthUser = {
                id: rawUser.id,
                name: rawUser.name,
                email: rawUser.email,
                role: rawUser.role?.name || rawUser.role || 'user',
                locale: rawUser.locale || 'ar',
                phone: rawUser.phone || data.phone || '',
                permissions: rawUser.permissions || [],
            };
            
            const tenantId = resData.tenant_id || rawUser.tenant_id;
            if (tenantId && typeof window !== 'undefined') {
                localStorage.setItem('tenant_id', String(tenantId));
            }
            
            saveAuth(token, user);
            return { success: true, user };
        }
        return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 422) {
            return { 
                success: false, 
                error: error.response?.data?.message || 'Validation failed'
            };
        }
    return { success: false, error: 'Registration failed unexpectedly.' };
}

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
        console.error('[Auth] Backend error during login', err);
        return { success: false, error: 'Network error or backend unreachable.' };
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
        console.error('[Auth] Refresh user failed', error);
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
    return false;
}
