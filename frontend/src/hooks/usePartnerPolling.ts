'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { portalDataApi } from '@/lib/portal-api';

interface PortalData {
    kpis: any;
    profits: any;
    statement: any;
    topProducts: any[];
    forecast: any;
}

export function usePartnerPolling(intervalMs = 60000) {
    const [data, setData] = useState<PortalData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [dashRes, profitsRes, stmtRes, topRes, forecastRes] = await Promise.allSettled([
                portalDataApi.getDashboard(),
                portalDataApi.getProfits('month'),
                portalDataApi.getStatement(),
                portalDataApi.getTopProducts(10),
                portalDataApi.getForecast(),
            ]);

            setData({
                kpis: dashRes.status === 'fulfilled' ? dashRes.value.data?.data?.kpis : null,
                profits: profitsRes.status === 'fulfilled' ? profitsRes.value.data?.data : null,
                statement: stmtRes.status === 'fulfilled' ? stmtRes.value.data?.data : null,
                topProducts: topRes.status === 'fulfilled' ? topRes.value.data?.data?.products ?? [] : [],
                forecast: forecastRes.status === 'fulfilled' ? forecastRes.value.data?.data : null,
            });

            setLastUpdated(new Date());
            setError(null);
        } catch (err: any) {
            setError('فشل تحميل البيانات');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();

        // Start polling
        intervalRef.current = setInterval(fetchAll, intervalMs);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchAll, intervalMs]);

    return { data, isLoading, error, lastUpdated, refresh: fetchAll };
}
