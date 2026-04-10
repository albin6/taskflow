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
      let message = error.response?.data?.message || error.message || 'An unexpected error occurred';
      if (Array.isArray(message)) {
        message = message.join(', ');
      }

      if (error.response?.status === 401) {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
      }

      // Standardize the error response for easier UI usage
      const isNetworkError = !error.response;
      const genericError = {
        message: isNetworkError ? 'Connection failed. Please check if the backend is running and CORS is allowed.' : message,
        code: error.response?.data?.code || (isNetworkError ? 'CONNECTION_ERROR' : 'UNKNOWN_ERROR'),
        status: error.response?.status || (isNetworkError ? 0 : 500), // Status 0 represents network failure
        original: error,
      };

      // Handle Retries for transient connection failures (status 0)
      const config = error.config;
      if (isNetworkError && (!config._retryCount || config._retryCount < 3)) {
        config._retryCount = (config._retryCount || 0) + 1;
        // Exponential backoff or simple delay
        const delay = config._retryCount * 500;
        console.warn(`[Axios] Connection failed. Retrying... (${config._retryCount}/3) in ${delay}ms`);
        return new Promise(resolve => setTimeout(() => resolve(api(config)), delay));
      }

      return Promise.reject(genericError);
    }
  );
}

export default api;
