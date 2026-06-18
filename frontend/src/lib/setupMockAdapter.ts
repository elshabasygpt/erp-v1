import MockAdapter from 'axios-mock-adapter';
import { AxiosInstance } from 'axios';
import { mockData } from './mockData';
import { isMockMode } from './auth';

let mockInstance: MockAdapter | null = null;

export function initMockAdapter(api: AxiosInstance) {
    // Mock adapter disabled for production readiness
    console.log('[Mock Adapter] Disabled for real API integration.');
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

    // Tasks
    mockInstance.onGet(/\/tasks\/dashboard/).reply(200, { data: mockData.tasksDashboard });
    mockInstance.onGet(/\/tasks\/categories/).reply(200, { data: mockData.tasksDashboard.categories });
    mockInstance.onGet(/\/tasks/).reply(200, { data: { data: mockData.tasks.data, current_page: 1, last_page: 1, total: mockData.tasks.data.length } });
    mockInstance.onPost(/\/tasks/).reply(201, { success: true });
}
