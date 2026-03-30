import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT Token automatically
if (typeof window !== 'undefined') {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('taskflow_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Handle Unauthenticated triggers (e.g., 401)
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
      }

      // Standardize the error response for easier UI usage
      const genericError = {
        message: error.response?.data?.message || error.message || 'An unexpected error occurred',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        status: error.response?.status || 500,
        original: error,
      };

      return Promise.reject(genericError);
    }
  );
}

export default api;
