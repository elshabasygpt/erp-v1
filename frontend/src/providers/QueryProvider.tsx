'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.alert = (message) => {
                // Determine if it's an error message or success message heuristically
                const msgStr = String(message).toLowerCase();
                if (msgStr.includes('error') || msgStr.includes('fail') || msgStr.includes('فشل') || msgStr.includes('خطأ')) {
                    toast.error(String(message));
                } else if (msgStr.includes('success') || msgStr.includes('تم') || msgStr.includes('نجاح')) {
                    toast.success(String(message));
                } else {
                    toast(String(message), { icon: '🔔' });
                }
            };
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
