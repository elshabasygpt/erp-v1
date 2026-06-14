import axios from 'axios';

// Separate axios instance for the Partner Portal
const portalApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 30000,
});

// Attach partner_token on every request
portalApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('partner_token');
        const tenantId = localStorage.getItem('partner_tenant_id');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
});

portalApi.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('partner_token');
                localStorage.removeItem('partner_data');
                window.location.href = '/ar/portal/login';
            }
        }
        return Promise.reject(error);
    }
);

export const portalAuthApi = {
    login: (data: { email: string; password: string; tenant_id: string }) =>
        portalApi.post('/portal/login', data),
    sendMagicLink: (data: { email: string; tenant_id: string }) =>
        portalApi.post('/portal/magic-link', data),
    verifyMagicLink: (data: { token: string; tenant_id: string }) =>
        portalApi.post('/portal/magic-link/verify', data),
    me: () => portalApi.get('/portal/me'),
    logout: () => portalApi.post('/portal/logout'),
};

export const portalDataApi = {
    getDashboard: () => portalApi.get('/portal/dashboard'),
    getProfits: (period: 'month' | 'year' = 'month') =>
        portalApi.get('/portal/profits', { params: { period } }),
    getStatement: () => portalApi.get('/portal/statement'),
    getTopProducts: (limit = 10) =>
        portalApi.get('/portal/top-products', { params: { limit } }),
    getForecast: () => portalApi.get('/portal/forecast'),
    downloadStatementPdf: async () => {
        const res = await portalApi.get('/portal/statement/pdf', { responseType: 'text' });
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.open();
            newWindow.document.write(res.data);
            newWindow.document.close();
        } else {
            alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) لعرض كشف الحساب');
        }
    },
};

export default portalApi;
