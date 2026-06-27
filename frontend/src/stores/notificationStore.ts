'use client';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    titleAr: string;
    titleEn: string;
    messageAr?: string;
    messageEn?: string;
    timestamp: number;
    read: boolean;
    link?: string;
}

type Listener = () => void;

const STORAGE_KEY = 'erp_notifications';
const MAX_NOTIFICATIONS = 50;

function load(): Notification[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function save(items: Notification[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
}

class NotificationStore {
    private items: Notification[] = [];
    private listeners: Set<Listener> = new Set();

    constructor() {
        if (typeof window !== 'undefined') {
            this.items = load();
        }
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    getAll(): Notification[] {
        return [...this.items].sort((a, b) => b.timestamp - a.timestamp);
    }

    getUnreadCount(): number {
        return this.items.filter(n => !n.read).length;
    }

    add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
        const newItem: Notification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
            read: false,
        };
        this.items = [newItem, ...this.items].slice(0, MAX_NOTIFICATIONS);
        save(this.items);
        this.notify();
        return newItem.id;
    }

    markRead(id: string) {
        this.items = this.items.map(n => n.id === id ? { ...n, read: true } : n);
        save(this.items);
        this.notify();
    }

    markAllRead() {
        this.items = this.items.map(n => ({ ...n, read: true }));
        save(this.items);
        this.notify();
    }

    remove(id: string) {
        this.items = this.items.filter(n => n.id !== id);
        save(this.items);
        this.notify();
    }

    clearAll() {
        this.items = [];
        save(this.items);
        this.notify();
    }
}

export const notificationStore = new NotificationStore();

// Convenience helpers
export function addNotification(
    type: NotificationType,
    titleAr: string,
    titleEn: string,
    messageAr?: string,
    messageEn?: string,
    link?: string
) {
    return notificationStore.add({ type, titleAr, titleEn, messageAr, messageEn, link });
}
