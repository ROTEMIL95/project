import { supabase } from './supabase';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * API Client for FastAPI Backend
 * Handles authentication headers and requests
 */
class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication headers with Supabase token
   */
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        'Content-Type': 'application/json',
      };
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  /**
   * Make a request to the API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload(endpoint, formData) {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`File upload failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create and export singleton instance
export const api = new APIClient();

// Export specific API modules
export const quotesAPI = {
  list: (params) => api.get('/api/quotes', params),
  get: (id) => api.get(`/api/quotes/${id}`),
  create: (data) => api.post('/api/quotes', data),
  update: (id, data) => api.put(`/api/quotes/${id}`, data),
  delete: (id) => api.delete(`/api/quotes/${id}`),
  send: (id) => api.post(`/api/quotes/${id}/send`),
};

export const clientsAPI = {
  list: (params) => api.get('/api/clients', params),
  get: (id) => api.get(`/api/clients/${id}`),
  create: (data) => api.post('/api/clients', data),
  update: (id, data) => api.put(`/api/clients/${id}`, data),
  delete: (id) => api.delete(`/api/clients/${id}`),
};

export const catalogAPI = {
  list: (params) => api.get('/api/catalog', params),
  get: (id) => api.get(`/api/catalog/${id}`),
  create: (data) => api.post('/api/catalog', data),
  update: (id, data) => api.put(`/api/catalog/${id}`, data),
  delete: (id) => api.delete(`/api/catalog/${id}`),
  categories: () => api.get('/api/catalog/categories'),
};

export const projectsAPI = {
  list: (params) => api.get('/api/projects', params),
  get: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post('/api/projects', data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  delete: (id) => api.delete(`/api/projects/${id}`),
};

export const templatesAPI = {
  list: (params) => api.get('/api/templates', params),
  get: (id) => api.get(`/api/templates/${id}`),
  create: (data) => api.post('/api/templates', data),
  update: (id, data) => api.put(`/api/templates/${id}`, data),
  delete: (id) => api.delete(`/api/templates/${id}`),
};

export const financialAPI = {
  summary: () => api.get('/api/financial/summary'),
  revenue: (params) => api.get('/api/financial/revenue', params),
  expenses: (params) => api.get('/api/financial/expenses', params),
  cashFlow: (params) => api.get('/api/financial/cash-flow', params),
};

export const contractorPricingAPI = {
  list: (params) => api.get('/api/contractor-pricing', params),
  get: (id) => api.get(`/api/contractor-pricing/${id}`),
  create: (data) => api.post('/api/contractor-pricing', data),
  update: (id, data) => api.put(`/api/contractor-pricing/${id}`, data),
  delete: (id) => api.delete(`/api/contractor-pricing/${id}`),
};

export const inquiriesAPI = {
  list: (params) => api.get('/api/inquiries', params),
  get: (id) => api.get(`/api/inquiries/${id}`),
  create: (data) => api.post('/api/inquiries', data),
  update: (id, data) => api.put(`/api/inquiries/${id}`, data),
  delete: (id) => api.delete(`/api/inquiries/${id}`),
};

export const userAPI = {
  me: () => api.get('/api/auth/me'),
  updateProfile: (data) => api.patch('/api/auth/me', data),
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  refresh: () => api.post('/api/auth/refresh'),
};
