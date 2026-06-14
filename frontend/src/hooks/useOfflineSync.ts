import { useState, useEffect, useCallback } from 'react';
import { saveInvoiceLocally, getPendingInvoices, removeSyncedInvoices } from '@/lib/db';
import { salesApi } from '@/lib/api';

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // Initial check and listeners
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
            
            const handleOnline = () => {
                setIsOnline(true);
                syncPendingInvoices();
            };
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            // Initial load check
            updatePendingCount();

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    const updatePendingCount = async () => {
        const pending = await getPendingInvoices();
        setPendingCount(pending.length);
    };

    const syncPendingInvoices = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;

        const pending = await getPendingInvoices();
        if (pending.length === 0) return;

        try {
            setIsSyncing(true);
            
            // Map IndexedDB object back to payload format for bulk API
            const invoicesPayload = pending.map(item => item.payload);

            const response = await salesApi.syncBulkInvoices(invoicesPayload);
            
            if (response.data.data.synced > 0) {
                // Delete everything that was successfully processed
                // In production, you would match IDs to delete specifically successful ones,
                // but since we send all pending, we delete them on success.
                const idsToDelete = pending.map(item => item.id!);
                await removeSyncedInvoices(idsToDelete);
                await updatePendingCount();
            }

        } catch (error) {
            console.error('Failed to sync offline invoices:', error);
            // Will retry later or on next reload
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    const handleSaveInvoice = async (uuid: string, payload: any) => {
        try {
            // If completely offline, save to DB directly
            if (!isOnline) {
                await saveInvoiceLocally(uuid, payload);
                await updatePendingCount();
                return { success: true, offline: true };
            }

            // Try to sync instantly if online
            const res = await salesApi.createInvoice(payload);
            return { success: true, offline: false, response: res.data };

        } catch (err: any) {
            // If request failed due to network error, fallback to offline local save
            if (!err.response) { // Network error string
                await saveInvoiceLocally(uuid, payload);
                await updatePendingCount();
                return { success: true, offline: true };
            }
            throw err;
        }
    };

    return {
        isOnline,
        isSyncing,
        pendingCount,
        handleSaveInvoice,
        syncPendingInvoices,
        updatePendingCount
    };
}
