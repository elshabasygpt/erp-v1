import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface InvoiceData {
    id?: number; // IndexedDB auto-increment primary key
    uuid: string; // The unique ID for the invoice
    payload: any; // The full JSON payload for the backend API
    created_at: string;
    sync_status: 'pending' | 'synced' | 'failed';
}

interface PosDB extends DBSchema {
    pending_invoices: {
        key: number;
        value: InvoiceData;
        indexes: { 'by-uuid': string, 'by-status': string };
    };
}

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

if (typeof window !== 'undefined') {
    dbPromise = openDB<PosDB>('pos-offline-db', 1, {
        upgrade(db) {
            const store = db.createObjectStore('pending_invoices', {
                keyPath: 'id',
                autoIncrement: true,
            });
            store.createIndex('by-uuid', 'uuid', { unique: true });
            store.createIndex('by-status', 'sync_status');
        },
    });
}

// Save an invoice locally
export async function saveInvoiceLocally(uuid: string, payload: any): Promise<number | undefined> {
    if (!dbPromise) return;
    const db = await dbPromise;
    return db.add('pending_invoices', {
        uuid,
        payload,
        created_at: new Date().toISOString(),
        sync_status: 'pending',
    });
}

// Get all pending invoices
export async function getPendingInvoices(): Promise<InvoiceData[]> {
    if (!dbPromise) return [];
    const db = await dbPromise;
    return db.getAllFromIndex('pending_invoices', 'by-status', 'pending');
}

// Remove synced invoices
export async function removeSyncedInvoices(ids: number[]) {
    if (!dbPromise) return;
    const db = await dbPromise;
    const tx = db.transaction('pending_invoices', 'readwrite');
    await Promise.all(ids.map(id => tx.store.delete(id)));
    await tx.done;
}

// Clear all data (for testing or reset)
export async function clearLocalInvoices() {
    if (!dbPromise) return;
    const db = await dbPromise;
    return db.clear('pending_invoices');
}
