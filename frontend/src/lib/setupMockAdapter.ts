import MockAdapter from 'axios-mock-adapter';
import { AxiosInstance } from 'axios';
import { mockData } from './mockData';
import { isMockMode } from './auth';

let mockInstance: MockAdapter | null = null;

export function initMockAdapter(api: AxiosInstance) {
    // Only initialize once
    if (mockInstance) return;

    mockInstance = new MockAdapter(api, { onNoMatch: 'passthrough', delayResponse: 500 });
    
    // We only attach handlers if we are actually in mock mode right now.
    // If the user logs in later, we can call setupMockHandlers() manually.
    if (isMockMode()) {
        setupMockHandlers();
    }
}

export function setupMockHandlers() {
    if (!mockInstance) return;
    
    console.log('[Mock Adapter] Initializing realistic mock endpoints for Demo Mode...');

    // Sales Dashboard
    mockInstance.onGet(/\/sales\/advanced-reports\/kpis/).reply(200, mockData.salesKpis);
    mockInstance.onGet(/\/sales\/advanced-reports\/charts/).reply(200, mockData.salesCharts);

    // Deliveries Dashboard
    mockInstance.onGet(/\/sales\/channels/).reply(200, { data: mockData.salesChannels.data });
    mockInstance.onGet(/\/sales\/deliveries/).reply(200, {
        data: {
            data: mockData.deliveries.data,
            current_page: 1,
            last_page: 1,
            total: mockData.deliveries.data.length
        }
    });

    // POS & Inventory
    mockInstance.onGet(/\/inventory\/branches/).reply(200, { data: mockData.branches.data });
    mockInstance.onGet(/\/inventory\/warehouses/).reply(200, { data: mockData.warehouses.data });
    mockInstance.onGet(/\/inventory\/products/).reply(200, { data: mockData.products.data });
    
    // CRM Customers
    mockInstance.onGet(/\/crm\/customers/).reply(200, { data: mockData.customers.data });

    // Users
    mockInstance.onGet(/\/users/).reply(200, { data: mockData.users.data });
}
