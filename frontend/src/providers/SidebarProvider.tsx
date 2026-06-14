'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type SidebarMode = 'full' | 'mini' | 'hover';

interface SidebarContextType {
    mode: SidebarMode;
    setMode: (mode: SidebarMode) => void;
    collapsed: boolean;
    toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    mode: 'full',
    setMode: () => {},
    collapsed: false,
    toggleCollapsed: () => {},
});

export function useSidebar() {
    return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<SidebarMode>('full');
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedMode = localStorage.getItem('sidebarMode') as SidebarMode | null;
        if (savedMode === 'full' || savedMode === 'mini' || savedMode === 'hover') {
            setModeState(savedMode);
            if (savedMode === 'mini') setCollapsed(true);
        }
    }, []);

    const setMode = (newMode: SidebarMode) => {
        setModeState(newMode);
        localStorage.setItem('sidebarMode', newMode);
        if (newMode === 'mini') setCollapsed(true);
        else setCollapsed(false);
    };

    const toggleCollapsed = () => {
        setCollapsed(prev => !prev);
    };

    if (!mounted) return <>{children}</>;

    return (
        <SidebarContext.Provider value={{ mode, setMode, collapsed, toggleCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}
