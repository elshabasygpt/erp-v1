import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PosDB extends DBSchema {
  products: {
    key: string;
    value: any;
  };
  customers: {
    key: string;
    value: any;
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      payload: any;
      type: 'invoice' | 'quotation' | 'return';
      timestamp: number;
      retryCount: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<PosDB>('pos-cloud-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });
}

// ─── Products ───
export async function cacheProducts(products: any[]) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction('products', 'readwrite');
  await Promise.all(products.map(p => tx.store.put(p)));
  await tx.done;
}

export async function getCachedProducts(): Promise<any[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('products');
}

// ─── Customers ───
export async function cacheCustomers(customers: any[]) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction('customers', 'readwrite');
  await Promise.all(customers.map(c => tx.store.put(c)));
  await tx.done;
}

export async function getCachedCustomers(): Promise<any[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('customers');
}

export async function searchCachedCustomers(query: string): Promise<any[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  const all = await db.getAll('customers');
  const q = query.toLowerCase();
  return all.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(query));
}

// ─── Sync Queue ───
export async function enqueueOfflineAction(type: 'invoice' | 'quotation' | 'return', payload: any) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.add('syncQueue', {
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  });
}

export async function getSyncQueue() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function removeFromQueue(id: number) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('syncQueue', id);
}

export async function incrementRetryCount(id: number, currentCount: number) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const item = await db.get('syncQueue', id);
  if (item) {
    item.retryCount = currentCount + 1;
    await db.put('syncQueue', item);
  }
}

export async function clearCache() {
    if(!dbPromise) return;
    const db = await dbPromise;
    const tx = db.transaction(['products', 'customers'], 'readwrite');
    await tx.objectStore('products').clear();
    await tx.objectStore('customers').clear();
    await tx.done;
}
