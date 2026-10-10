import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // send HttpOnly cookies
  timeout: 15000,
});

// ── Response interceptor — normalize error shape ─────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired or session invalidated — clear local state and redirect
      // We dispatch a custom event instead of importing the store directly
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export default api;
