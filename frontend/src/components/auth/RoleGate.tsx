'use client';

import { useAuth } from '@/hooks/useAuth';

interface RoleGateProps {
    children: React.ReactNode;
    permissions?: string | string[];
    roles?: string | string[];
    fallback?: React.ReactNode;
}

/**
 * A component that renders its children only if the current user
 * satisfies the provided role or permission requirements.
 */
export function RoleGate({ children, permissions, roles, fallback = null }: RoleGateProps) {
    const { isLoaded, hasPermission, hasRole } = useAuth();

    // Prevent rendering anything until auth state is loaded
    if (!isLoaded) return null;

    let isAllowed = true;

    if (permissions) {
        const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
        const hasAllPermissions = requiredPermissions.every(p => hasPermission(p));
        if (!hasAllPermissions) isAllowed = false;
    }

    if (roles && isAllowed) {
        if (!hasRole(roles)) {
            isAllowed = false;
        }
    }

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
