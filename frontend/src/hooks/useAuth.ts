'use client';

import { useState, useEffect } from 'react';
import { getStoredUser, AuthUser } from '@/lib/auth';

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);
        setIsLoaded(true);
    }, []);

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'Super Admin') return true;
        return user.permissions?.includes(permission) || false;
    };

    const hasRole = (roles: string | string[]) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'Super Admin') return true;
        
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        return requiredRoles.includes(user.role);
    };

    return {
        user,
        isLoaded,
        hasPermission,
        hasRole,
    };
}
