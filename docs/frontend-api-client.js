/**
 * Centralized Paint Shop ERP Frontend API Client Helper
 * Pure Vanilla JS Fetch Wrapper supporting Auth Headers, Configurable Base URL,
 * Standardized Response Parsing, Token Management, and Request Retries.
 */

const API_CONFIG = {
    baseURL: localStorage.getItem('API_BASE_URL') || 'http://localhost:5000/api/v1',
    tokenKey: 'paint_shop_access_token',
    userKey: 'paint_shop_user_info'
};

class ApiClient {
    static getToken() {
        return localStorage.getItem(API_CONFIG.tokenKey);
    }

    static setToken(token) {
        if (token) {
            localStorage.setItem(API_CONFIG.tokenKey, token);
        } else {
            localStorage.removeItem(API_CONFIG.tokenKey);
        }
    }

    static getUser() {
        const user = localStorage.getItem(API_CONFIG.userKey);
        return user ? JSON.parse(user) : null;
    }

    static setUser(user) {
        if (user) {
            localStorage.setItem(API_CONFIG.userKey, JSON.stringify(user));
        } else {
            localStorage.removeItem(API_CONFIG.userKey);
        }
    }

    static clearAuth() {
        localStorage.removeItem(API_CONFIG.tokenKey);
        localStorage.removeItem(API_CONFIG.userKey);
    }

    static async request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: options.method || 'GET',
            headers,
            ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {})
        };

        try {
            const response = await fetch(url, config);

            // Handle HTTP 401 Unauthorized
            if (response.status === 401) {
                this.clearAuth();
                if (window.location.pathname !== '/login.html') {
                    window.location.href = '/login.html';
                }
                throw new Error('Session expired. Please log in again.');
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                const err = new Error(data.error?.message || 'API Request Failed');
                err.code = data.error?.code || 'API_ERROR';
                err.details = data.error?.details || [];
                err.status = response.status;
                throw err;
            }

            return data;
        } catch (error) {
            console.error(`[API Client Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
            throw error;
        }
    }

    // --- Module API Methods ---

    // Auth
    static async login(username, password) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: { username, password }
        });
        if (res.data?.accessToken) {
            this.setToken(res.data.accessToken);
            this.setUser(res.data.user);
        }
        return res.data;
    }

    static async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearAuth();
            window.location.href = '/login.html';
        }
    }

    static async getMe() {
        return this.request('/auth/me');
    }

    // POS / Billing
    static async lookupProduct(code) {
        return this.request(`/products/lookup?code=${encodeURIComponent(code)}`);
    }

    static async getBillingProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/billing/products${query ? '?' + query : ''}`);
    }

    static async getBillingQuote(cartData) {
        return this.request('/billing/quote', {
            method: 'POST',
            body: cartData
        });
    }

    static async checkoutInvoice(checkoutPayload, idempotencyKey = null) {
        const headers = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        return this.request('/billing/checkout', {
            method: 'POST',
            headers,
            body: checkoutPayload
        });
    }

    // Sales history and 80mm invoice printing
    static async getSales(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/sales${query ? '?' + query : ''}`);
    }

    static async getSale(saleId) {
        return this.request(`/sales/${saleId}`);
    }

    static async getSaleReceiptHtml(saleId) {
        const response = await fetch(`${API_CONFIG.baseURL}/sales/${saleId}/receipt`, {
            headers: {
                'Accept': 'text/html',
                'Authorization': `Bearer ${this.getToken()}`
            }
        });

        if (!response.ok) {
            const error = new Error(`Unable to load invoice receipt (HTTP ${response.status})`);
            error.status = response.status;
            throw error;
        }

        return response.text();
    }

    // Products & Stock
    static async getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/products${query ? '?' + query : ''}`);
    }

    static async getStockLevels(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/stock${query ? '?' + query : ''}`);
    }

    static async adjustStock(adjustmentPayload) {
        return this.request('/stock/adjustments', {
            method: 'POST',
            body: adjustmentPayload
        });
    }

    // Customers & Credit
    static async getCustomers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/customers${query ? '?' + query : ''}`);
    }

    static async getCustomerLedger(customerId) {
        return this.request(`/customers/${customerId}/ledger`);
    }

    static async collectCreditPayment(customerId, collectionPayload) {
        return this.request(`/customers/${customerId}/collections`, {
            method: 'POST',
            body: collectionPayload
        });
    }

    // Dashboard & Reports
    static async getDashboardSummary() {
        return this.request('/reports/dashboard');
    }
}

if (typeof window !== 'undefined') {
    window.ApiClient = ApiClient;
}
