import { supabase } from './supabase';

// API base URL from environment variable
// Production: https://project-b88e.onrender.com
// Development: http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://project-b88e.onrender.com';

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
   * Note: Content-Type is only added for requests with bodies (POST, PUT, PATCH)
   *
   * This retrieves the current Supabase session and extracts the access_token
   * to send to the backend for authentication.
   */
  async getAuthHeaders(includeContentType = false) {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[API] Error getting Supabase session:', error);
      throw new Error('Failed to get authentication session');
    }

    if (!session) {
      console.warn('[API] No active Supabase session found. User may not be authenticated.');
    }

    const headers = {};

    // Only add Content-Type for requests with bodies
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    // Add Authorization header if session exists
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      console.debug('[API] Authorization header added with Supabase access token');
    } else {
      console.warn('[API] No access token available - API call will likely fail with 401');
    }

    return headers;
  }

  /**
   * Make a request to the API
   * Includes credentials for CORS with authentication
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Determine if we need Content-Type header (for requests with bodies)
    const hasBody = options.body !== undefined;
    const headers = await this.getAuthHeaders(hasBody);

    // Check if we have an authorization header - if not, this request will fail
    if (!headers['Authorization']) {
      console.warn('[API] No authorization token available for:', endpoint);
      throw new Error('No active session - please log in');
    }

    const config = {
      ...options,
      credentials: 'include', // Required for CORS with credentials
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
        const errorMessage = data.detail || `HTTP error! status: ${response.status}`;
        console.error(`[API] Request failed: ${endpoint}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          url
        });
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Enhanced error logging for CORS and authentication issues
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.error(`[API] Network error for ${endpoint}:`, {
          error: error.message,
          url,
          hint: 'Check CORS configuration, backend URL, and network connectivity',
        });
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        console.error(`[API] Authentication error for ${endpoint}:`, {
          error: error.message,
          url,
          hint: 'Token may be expired or invalid. Try logging out and back in.',
        });
      } else {
        console.error(`[API] Request failed for ${endpoint}:`, {
          error: error.message,
          url
        });
      }
      throw error;
    }
  }

  /**
   * GET request
   * Note: GET requests don't need Content-Type header (no body)
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET',
      // No body, so no Content-Type header needed
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
   * Note: Don't set Content-Type for FormData - browser will set it with boundary
   */
  async upload(endpoint, formData) {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    // Don't set Content-Type - browser will set it automatically with boundary for FormData

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include', // Required for CORS with credentials
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
      const response = await fetch(`${this.baseURL}/health`, {
        credentials: 'include', // Required for CORS with credentials
      });
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
  // Analytics endpoints
  summary: () => api.get('/api/financial/summary'),
  revenue: (params) => api.get('/api/financial/revenue', params),
  expenses: (params) => api.get('/api/financial/expenses', params),
  cashFlow: (params) => api.get('/api/financial/cash-flow', params),
  // CRUD operations
  list: (params) => api.get('/api/financial', params),
  get: (id) => api.get(`/api/financial/${id}`),
  create: (data) => api.post('/api/financial', data),
  update: (id, data) => api.put(`/api/financial/${id}`, data),
  delete: (id) => api.delete(`/api/financial/${id}`),
};

export const categoriesAPI = {
  list: () => api.get('/api/catalog/categories'),
  get: (id) => api.get(`/api/catalog/categories/${id}`),
  create: (data) => api.post('/api/catalog/categories', data),
  update: (id, data) => api.put(`/api/catalog/categories/${id}`, data),
  delete: (id) => api.delete(`/api/catalog/categories/${id}`),
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

export const userProfileAPI = {
  list: () => api.get('/api/auth/users'),
  get: (id) => api.get(`/api/auth/users/${id}`),
  update: (id, data) => api.put(`/api/auth/users/${id}`, data),
  delete: (id) => api.delete(`/api/auth/users/${id}`),
  updateMe: (data) => api.put('/api/auth/me', data),
};
